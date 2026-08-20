-- ============================================================================
-- 0008: atomic multi-row write RPCs
--
-- Model and rationale: docs/DATABASE.md §1 (the three structural guarantees) and
-- §5.1. PRD-011, PRD-014, PRD-015, NFR-007.
--
-- Server Actions compute the canonical cost breakdown in TypeScript
-- (src/lib/pricing/), then call ONE of these to persist everything atomically.
-- The function body is one transaction, so a partial failure can never leave a
-- quote or product half-written.
--
-- SECURITY INVOKER is the default here and it is a decision, not an omission:
-- these run under the caller's own session, so the RLS policies from 0006/0007
-- still apply row by row inside them. That is how the app gets transactional
-- atomicity while satisfying "no service-role key anywhere" (TECH-STACK §7).
--
-- ONE exception, and it is load-bearing: fn_next_quote_number is SECURITY
-- DEFINER because quote_number_sequences has RLS on with zero policies. See its
-- own comment below.
--
-- DO NOT WIRE fn_save_quote INTO A SERVER ACTION YET. It persists the nine
-- pricing columns exactly as supplied, and PRD §7A has not defined what those
-- values are. That sign-off carries two obligations: confirm the column list
-- still matches its finalized persisted-vs-preview fields, and author the guard
-- that stops those columns being written directly over the Data API
-- (docs/DATABASE.md §5.1 and §6.1).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- fn_next_quote_number: allocate the next Q-YYYY-NNNN race-free (PRD-011).
--
-- SECURITY DEFINER on purpose. quote_number_sequences has RLS enabled and zero
-- policies, so a caller running as `authenticated` cannot touch it at all. A
-- SECURITY INVOKER fn_save_quote that incremented the counter inline would fail
-- on every new quote with "new row violates row-level security policy", taking
-- PRD-011's numbering with it. Pulling the increment into this one definer
-- function lets the table stay policy-less: the counter is reachable only
-- through the one function allowed to allocate a number, while the quote write
-- itself stays under the caller's own RLS.
--
-- The single INSERT ... ON CONFLICT DO UPDATE ... RETURNING is what makes
-- race-freedom structural rather than careful: concurrent callers serialize on
-- the year row, and neither can observe a number the other took.
--
-- Accepted trade-off: this is callable directly over the Data API by any
-- authenticated user, who could burn numbers and leave gaps. PRD-011 requires
-- uniqueness and race-freedom, not density, so gaps are cosmetic. To close it,
-- move this function to a schema outside `[api] schemas` in
-- supabase/config.toml -- PostgREST will not route to it there, while
-- fn_save_quote can still call it.
-- ----------------------------------------------------------------------------
create or replace function fn_next_quote_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year smallint := extract(year from now())::smallint;
  v_seq  integer;
begin
  insert into quote_number_sequences(year, last_number)
  values (v_year, 1)
  on conflict (year)
    do update set last_number = quote_number_sequences.last_number + 1
  returning last_number into v_seq;

  return 'Q-' || v_year || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

-- ----------------------------------------------------------------------------
-- fn_save_quote: atomic upsert of a quote header + full replacement of its
-- lines (PRD-014). Allocates the quote number race-free on first save
-- (PRD-011). Receives already-computed pricing values -- it does not compute
-- them (NFR-007: computation lives in the shared TypeScript pricing module).
--
-- Deliberately NOT SECURITY DEFINER. That would run the entire quote write as
-- the function owner and silently discard the owner-or-admin RLS on quotes and
-- quote_lines -- trading a real authorization boundary for a one-line fix.
-- ----------------------------------------------------------------------------
create or replace function fn_save_quote(
  p_quote_id       uuid,           -- null => new quote
  p_customer_name  text,
  p_product_id     uuid,
  p_fab_tier_id    uuid,
  p_environment    quote_environment,
  p_owner_id       uuid,
  p_pricing        jsonb,          -- server-recomputed totals
  p_lines          jsonb           -- array of line objects
)
returns quotes
language plpgsql
security invoker
as $$
declare
  v_quote   quotes;
  v_number  text;
begin
  if p_quote_id is null then
    -- SECURITY DEFINER hop: quote_number_sequences is policy-less under RLS,
    -- so this function -- running as the caller -- cannot reach it directly.
    v_number := fn_next_quote_number();

    -- status is left to its 'draft' default on purpose. Setting it here would
    -- trip enforce_quote_created_in_draft (0007), which is the intended
    -- behaviour: nothing, including this function, creates a non-draft quote.
    insert into quotes (
      quote_number, customer_name, product_id, fab_tier_id, fab_cost_snapshot,
      environment, owner_id,
      total_hard_cost, total_labor_cost, cushion_amount, commission_amount,
      total_cost, final_price_each, gp_dollars, gp_percent, below_margin_floor
    ) values (
      v_number, p_customer_name, p_product_id, p_fab_tier_id,
      (p_pricing->>'fab_cost_snapshot')::numeric,
      p_environment, p_owner_id,
      (p_pricing->>'total_hard_cost')::numeric,
      (p_pricing->>'total_labor_cost')::numeric,
      (p_pricing->>'cushion_amount')::numeric,
      (p_pricing->>'commission_amount')::numeric,
      (p_pricing->>'total_cost')::numeric,
      (p_pricing->>'final_price_each')::numeric,
      (p_pricing->>'gp_dollars')::numeric,
      (p_pricing->>'gp_percent')::numeric,
      (p_pricing->>'below_margin_floor')::boolean
    )
    returning * into v_quote;
  else
    update quotes set
      customer_name        = p_customer_name,
      product_id           = p_product_id,
      fab_tier_id          = p_fab_tier_id,
      fab_cost_snapshot    = (p_pricing->>'fab_cost_snapshot')::numeric,
      environment          = p_environment,
      total_hard_cost      = (p_pricing->>'total_hard_cost')::numeric,
      total_labor_cost     = (p_pricing->>'total_labor_cost')::numeric,
      cushion_amount       = (p_pricing->>'cushion_amount')::numeric,
      commission_amount    = (p_pricing->>'commission_amount')::numeric,
      total_cost           = (p_pricing->>'total_cost')::numeric,
      final_price_each     = (p_pricing->>'final_price_each')::numeric,
      gp_dollars           = (p_pricing->>'gp_dollars')::numeric,
      gp_percent           = (p_pricing->>'gp_percent')::numeric,
      below_margin_floor   = (p_pricing->>'below_margin_floor')::boolean
    where id = p_quote_id
    returning * into v_quote;

    -- `not found` here is ambiguous by design: the row may not exist, or RLS may
    -- have filtered it. Distinguishing them would leak the existence of another
    -- rep's quote, so the message deliberately does not.
    if not found then
      raise exception 'Quote % not found or not permitted', p_quote_id;
    end if;
  end if;

  -- Replace all line items inside the same transaction (PRD-014). This is the
  -- RPC-internal delete+insert that PRODUCT.md §6 warns against doing
  -- client-side and sequentially -- here it is one function call, one
  -- transaction, so a failed insert rolls the delete back too.
  delete from quote_lines where quote_id = v_quote.id;

  insert into quote_lines (
    quote_id, category_id, component_id, description, is_misc,
    hard_cost, labor_hours, labor_cost, markup_percent,
    environment_mismatch, sort_order
  )
  select
    v_quote.id,
    nullif(l->>'category_id', '')::uuid,
    nullif(l->>'component_id', '')::uuid,
    l->>'description',
    coalesce((l->>'is_misc')::boolean, false),
    coalesce((l->>'hard_cost')::numeric, 0),
    coalesce((l->>'labor_hours')::numeric, 0),
    coalesce((l->>'labor_cost')::numeric, 0),
    coalesce((l->>'markup_percent')::numeric, 0),
    coalesce((l->>'environment_mismatch')::boolean, false),
    coalesce((l->>'sort_order')::integer, 0)
  from jsonb_array_elements(p_lines) as l;
  -- PRD-007A's one-per-fixed-category invariant is additionally enforced by
  -- uq_quote_lines_one_per_fixed_category (0007) -- a violation here raises and
  -- rolls back the whole call, header included.

  return v_quote;
end;
$$;

-- ----------------------------------------------------------------------------
-- fn_transition_quote_status: thin wrapper for status transitions. The real
-- enforcement is the BEFORE UPDATE trigger validate_quote_status_transition
-- (0007) plus the RLS UPDATE policy on quotes -- this function exists only so a
-- Server Action has a single, explicit entry point (PRD-010). It is not a
-- security layer and adding checks here would not make it one; a client can
-- always UPDATE the table directly, which is precisely why the trigger is where
-- the gate lives.
-- ----------------------------------------------------------------------------
create or replace function fn_transition_quote_status(
  p_quote_id  uuid,
  p_to_status quote_status
)
returns quotes
language plpgsql
security invoker
as $$
declare
  v_quote quotes;
begin
  update quotes set status = p_to_status
  where id = p_quote_id
  returning * into v_quote;

  if not found then
    raise exception 'Quote % not found or not permitted', p_quote_id;
  end if;

  return v_quote;
end;
$$;

-- ----------------------------------------------------------------------------
-- fn_save_product: atomic upsert of a product + full replacement of its fab
-- tiers and default components (PRD-015). Price-history rows for changed tier
-- costs are handled automatically by fab_tiers_price_history (0006) -- this
-- function does not duplicate that logic.
-- ----------------------------------------------------------------------------
create or replace function fn_save_product(
  p_product_id       uuid,   -- null => new product
  p_name             text,
  p_sku              text,
  p_description      text,
  p_vendor           text,
  p_est_labor_hours  numeric,
  p_active           boolean,
  p_fab_tiers        jsonb,  -- [{qty_tier, cost, quoted_date, vendor}, ...]
  p_defaults         jsonb   -- [{category_id, component_id}, ...]
)
returns products
language plpgsql
security invoker
as $$
declare
  v_product products;
begin
  if p_product_id is null then
    insert into products (name, sku, description, vendor, est_labor_hours, active)
    values (p_name, p_sku, p_description, p_vendor, p_est_labor_hours, p_active)
    returning * into v_product;
  else
    update products set
      name = p_name, sku = p_sku, description = p_description, vendor = p_vendor,
      est_labor_hours = p_est_labor_hours, active = p_active
    where id = p_product_id
    returning * into v_product;

    if not found then
      raise exception 'Product % not found or not permitted', p_product_id;
    end if;
  end if;

  -- Upsert tiers by (product_id, qty_tier) so an UPDATE -- not delete+insert --
  -- fires fab_tiers_price_history when cost actually changes. A delete+insert
  -- would append no history and silently lose the cost trail (NFR-005).
  insert into fab_tiers (product_id, qty_tier, cost, quoted_date, vendor)
  select v_product.id, (t->>'qty_tier')::integer, (t->>'cost')::numeric,
         (t->>'quoted_date')::date, t->>'vendor'
  from jsonb_array_elements(p_fab_tiers) as t
  on conflict (product_id, qty_tier) do update set
    cost = excluded.cost,
    quoted_date = excluded.quoted_date,
    vendor = excluded.vendor;

  -- Removing a tier that a saved quote points at is REFUSED, not cascaded:
  -- quotes.fab_tier_id is NOT NULL with no ON DELETE action, so Postgres raises
  -- foreign_key_violation. That refusal is correct -- quotes.fab_cost_snapshot
  -- preserves the number, but the tier row is still the quote's basis and
  -- deleting it would orphan the reference. What is NOT acceptable is surfacing
  -- a bare constraint name to an admin who just removed a row in a form, so the
  -- handler translates it. The block also scopes the subtransaction: on this
  -- raise the whole fn_save_product call rolls back, product edit included.
  --
  -- NOT EXISTS, not NOT IN, and that is not style. `qty_tier not in (select
  -- ...)` evaluates to NULL for EVERY row the moment one element of p_fab_tiers
  -- is missing its qty_tier -- so the delete would quietly remove nothing and
  -- report success, leaving tiers the admin just removed still live. NOT EXISTS
  -- has no such NULL semantics: an unmatched element simply does not match.
  -- Validation upstream is not a substitute -- this function is the trust
  -- boundary, and this file is immutable once applied.
  begin
    delete from fab_tiers f
    where f.product_id = v_product.id
      and not exists (
        select 1
        from jsonb_array_elements(p_fab_tiers) as t
        where (t->>'qty_tier')::integer = f.qty_tier
      );
  exception
    when foreign_key_violation then
      raise exception
        'Cannot remove a quantity tier that a saved quote was built on. Leave the tier in place, or deactivate the product (PRD-018).';
  end;

  delete from product_defaults where product_id = v_product.id;
  insert into product_defaults (product_id, category_id, component_id)
  select v_product.id, (d->>'category_id')::uuid, (d->>'component_id')::uuid
  from jsonb_array_elements(p_defaults) as d;

  return v_product;
end;
$$;
