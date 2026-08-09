# DATABASE-SQL.md — Schema, RPCs, and RLS

**Owner:** Viral Parikh
**Status:** Approved — **partly transcribed**; see [Transcription status](#transcription-status-2026-08-01)
**Last updated:** 2026-08-01
**Authority:** Same as the source-of-truth docs, for the slice it covers.

> **Transient — the one file in `docs/` that is not permanent.** Delete it once its content
> is authored as `supabase/migrations/*.sql`, and remove it from CLAUDE.md's "Approved design
> specs" list in the same change. ARCHITECTURE.md §5 makes the migration files the
> authoritative schema, so the moment those exist this SQL is a second copy free to drift —
> and the entire point of that rule is that there is exactly one place the schema is true.
> [DATABASE.md](DATABASE.md) survives this file; this file does not survive the migrations.
>
> Derived from: [DATABASE.md](DATABASE.md) (the data model this implements), docs/PRD.md,
> docs/ARCHITECTURE.md
> Feeds: `supabase/migrations/*.sql`, then `src/lib/supabase/types.ts` via `npm run db:types`

## Transcription status (2026-08-01)

Transcription into `supabase/migrations/` has started, so this file is now **partly
historical**. Where a migration file exists, **that file is authoritative and the block below
is not** (ARCHITECTURE §5) — the blocks are kept only so the untranscribed remainder stays
readable in context.

| §1 block                 | Migration file                                             | Status                                                     |
| ------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `0001` extensions/enums  | `supabase/migrations/0001_extensions_and_types.sql`        | ✅ transcribed verbatim                                    |
| `0002` profiles + auth   | `supabase/migrations/0002_profiles_and_auth.sql`           | ✅ transcribed + §4.2 guard, + profiles RLS                |
| `0003` settings tables   | `supabase/migrations/0003_settings.sql`                    | ✅ transcribed + CHECKs, RLS, seed row                     |
| markup units fix         | `supabase/migrations/0004_settings_markup_units.sql`       | ✅ renames `0003`'s two markup columns                     |
| settings_history read    | `supabase/migrations/0005_settings_history_admin_read.sql` | ✅ narrows `0003`'s flat SELECT to `is_admin()` (PRD-018B) |
| `0003` categories onward | —                                                          | ⬜ not yet authored                                        |
| `0006` onward            | —                                                          | ⬜ not yet authored — categories, products, quotes, RPCs   |

**`0001`–`0005` are all applied to the linked project.** Never edit an applied file —
`db push` compares recorded versions, not contents, so the edit is skipped silently while
reading as though it landed. A new decision is a new file. `0004` exists precisely because
`0003` had already shipped when the markup units were reversed.

Deviations the authored files make from the blocks below, all deliberate:

- **RLS lives in the migration that creates the table**, not a trailing `0006_rls_policies`.
  A table must never exist on a hosted project with RLS off, even briefly. §3 below stays the
  reference for the policies not yet authored.
- **The `settings` seed row is in `0003`**, not a trailing `0007_seed_settings`: every column
  is `NOT NULL` with no default, so a settings table without its row is a broken state to push.
- **`0003` adds CHECK constraints** the block below does not carry (non-negative rates,
  `freshness_warning_months >= 1`).
- **`0003` shipped the two markup columns as `*_markup_multiplier` with a `>= 1` floor, and
  `0004` renames them back to `*_markup_percent` with a `>= 0` floor**, restating the seeded
  values as `50.00` / `20.00`. The block below shows the end state, i.e. `0003` + `0004` —
  see §4.6 for why, and the `0004` file for the mechanics (the audit trigger's hardcoded
  column list has to be replaced in the same migration or every settings update raises).
- **`0002` carves out `auth.uid() is null`** in the §4.2 role guard — see §4.2.

**Delete this file only when every block above is transcribed**, and remove it from CLAUDE.md's
"Approved design specs" list in the same change.

It sits beside `DATABASE.md` rather than under `docs/superpowers/specs/` deliberately.
That folder is tool-owned — the `superpowers` plugin hardcodes the path and would recreate
it if renamed (PROJECT-STRUCTURE.md §5) — which is a reason to leave _plugin output_ there,
not a reason to put a hand-authored file there. This one belongs next to the model it
implements, where nobody can open one without seeing the other.

Split out of `DATABASE.md` on 2026-07-31, which keeps the permanent half: entities, ERD,
column tables, and the design rationale behind them. **Read that file first** — it explains
_why_ each table looks like this; the SQL below is only _how_.

---

## Contents

- [Transcription status](#transcription-status-2026-08-01) — **read first:** which blocks below
  are already superseded by a migration file

1. [SQL Schema](#1-sql-schema)
2. [RPC Functions (Atomic Multi-Row Writes)](#2-rpc-functions-atomic-multi-row-writes)
3. [RLS Policies](#3-rls-policies)
4. [Implementation Notes](#4-implementation-notes)

---

## 1. SQL Schema

> Suggested migration split, per `PROJECT-STRUCTURE.md` §5 naming
> (`NNNN_snake_case_description.sql`): `0001_extensions_and_types`,
> `0002_profiles_and_auth_trigger`, `0003_master_data`, `0004_quotes`, `0005_rpc_functions`,
> `0006_rls_policies`, `0007_seed_settings`. Presented here as one consolidated script.
>
> **The authored files diverged from that split** — see the deviations above. `0004` is
> taken by the markup-units fix, RLS ships with each table rather than in one trailing
> file, the seed row lives in `0003`, and `0005` is the settings_history read narrowing. The
> remaining work is `0006` onward; the block
> comments below still carry the original suggested numbers, so read them as section
> labels, not filenames.

```sql
-- ============================================================================
-- 0001: Extensions & Enums
-- ============================================================================
create extension if not exists pgcrypto;

create type user_role as enum ('rep', 'admin');
create type quote_status as enum ('draft', 'pending_approval', 'approved', 'sent');
create type environment_type as enum ('any', 'indoor', 'outdoor');
create type quote_environment as enum ('indoor', 'outdoor');

-- Shared updated_at trigger
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================================
-- 0002: profiles + auth integration (PRD-001, PRD-002)
-- ============================================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        user_role not null default 'rep',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-provision a profile on first sign-in (PRD-002)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'rep');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- is_admin() helper — SECURITY DEFINER so RLS policies on `profiles` itself
-- don't recurse when they call it.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================================
-- 0003: Master data — categories, settings, products, fab_tiers,
--       product_defaults, components, price_history
-- ============================================================================
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger categories_set_updated_at
  before update on categories for each row execute function set_updated_at();

-- SUPERSEDED by supabase/migrations/0003_settings.sql + 0004_settings_markup_units.sql,
-- which additionally carry CHECK constraints, RLS, and the seed row. What follows
-- is the END STATE of those two files, not the contents of either one.
--
-- UNITS (decided 2026-08-01): every rate on this row is a PERCENT, so the names
-- below stand as originally written. The markups are seeded 50.00 / 20.00, not the
-- equivalent 1.50 / 1.20 multipliers -- a multiplier in numeric(5,2) steps a whole
-- percentage point, reps type 18 and not 1.18, and quote_lines.markup_percent
-- carries the same unit so the pre-fill needs no conversion. Full rationale is in
-- 0004, which had to reverse the `*_multiplier` names 0003 shipped before the
-- decision landed.
create table settings (
  id                          boolean primary key default true,
  labor_rate                  numeric(10,2) not null,
  fab_markup_percent          numeric(5,2) not null,
  component_markup_percent    numeric(5,2) not null,
  cushion_percent             numeric(5,2) not null,
  commission_percent          numeric(5,2) not null,
  margin_floor_percent        numeric(5,2) not null,
  freshness_warning_months    smallint not null,
  freshness_requote_months    smallint not null,
  favicon_url                 text,
  updated_by                  uuid references profiles(id),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint settings_singleton check (id),
  constraint settings_freshness_order check (freshness_requote_months > freshness_warning_months)
);
create trigger settings_set_updated_at
  before update on settings for each row execute function set_updated_at();

create table settings_history (
  id             uuid primary key default gen_random_uuid(),
  changed_field  text not null,
  old_value      text,
  new_value      text,
  actor          uuid not null references profiles(id),
  changed_at     timestamptz not null default now()
);
create index idx_settings_history_actor on settings_history(actor);
create index idx_settings_history_changed_at on settings_history(changed_at desc);

-- Audit trigger: log every changed settings field in the same transaction
create or replace function log_settings_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_col   text;
  v_old   text;
  v_new   text;
begin
  for v_col in
    select unnest(array[
      'labor_rate','fab_markup_percent','component_markup_percent','cushion_percent',
      'commission_percent','margin_floor_percent','freshness_warning_months',
      'freshness_requote_months','favicon_url'
    ])
  loop
    execute format('select ($1).%I::text, ($2).%I::text', v_col, v_col)
      into v_old, v_new using old, new;
    if v_old is distinct from v_new then
      insert into settings_history(changed_field, old_value, new_value, actor)
      values (v_col, v_old, v_new, v_actor);
    end if;
  end loop;
  return new;
end;
$$;

create trigger settings_audit
  after update on settings
  for each row execute function log_settings_change();

create table products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  sku               text not null unique,
  description       text,
  vendor            text,
  est_labor_hours   numeric(6,2) not null default 0 check (est_labor_hours >= 0),
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_products_active on products(active);
create trigger products_set_updated_at
  before update on products for each row execute function set_updated_at();

create table fab_tiers (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  qty_tier      integer not null check (qty_tier > 0),
  cost          numeric(12,2) not null check (cost >= 0),
  quoted_date   date not null,
  vendor        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, qty_tier)
);
create index idx_fab_tiers_product_id on fab_tiers(product_id);
create trigger fab_tiers_set_updated_at
  before update on fab_tiers for each row execute function set_updated_at();

create table components (
  id                    uuid primary key default gen_random_uuid(),
  category_id           uuid not null references categories(id),
  name                  text not null,
  sku                   text not null unique,
  vendor                text,
  environment           environment_type not null default 'any',
  cost                  numeric(12,2) not null check (cost >= 0),
  default_labor_hours   numeric(6,2) not null default 0 check (default_labor_hours >= 0),
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index idx_components_category_id on components(category_id);
create index idx_components_active on components(active);
create trigger components_set_updated_at
  before update on components for each row execute function set_updated_at();

create table product_defaults (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  category_id   uuid not null references categories(id),
  component_id  uuid not null references components(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, category_id)
);
create index idx_product_defaults_product_id on product_defaults(product_id);
create index idx_product_defaults_category_id on product_defaults(category_id);
create index idx_product_defaults_component_id on product_defaults(component_id);
create trigger product_defaults_set_updated_at
  before update on product_defaults for each row execute function set_updated_at();

create table price_history (
  id            uuid primary key default gen_random_uuid(),
  source_type   text not null check (source_type in ('component', 'fab_tier')),
  component_id  uuid references components(id),
  product_id    uuid references products(id),
  qty_tier      integer,
  cost          numeric(12,2) not null,
  quoted_date   date not null,
  vendor        text,
  changed_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  constraint price_history_source_shape check (
    (source_type = 'component' and component_id is not null and product_id is null and qty_tier is null)
    or
    (source_type = 'fab_tier' and product_id is not null and qty_tier is not null and component_id is null)
  )
);
create index idx_price_history_component_id on price_history(component_id);
create index idx_price_history_product_tier on price_history(product_id, qty_tier);
create index idx_price_history_changed_by on price_history(changed_by);

-- Auto-append price history when a live cost changes (NFR-005)
create or replace function log_component_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cost is distinct from old.cost then
    insert into price_history(source_type, component_id, cost, quoted_date, vendor, changed_by)
    values ('component', new.id, new.cost, current_date, new.vendor, auth.uid());
  end if;
  return new;
end;
$$;
create trigger components_price_history
  after update on components
  for each row execute function log_component_price_change();

create or replace function log_fab_tier_price_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cost is distinct from old.cost then
    insert into price_history(source_type, product_id, qty_tier, cost, quoted_date, vendor, changed_by)
    values ('fab_tier', new.product_id, new.qty_tier, new.cost, new.quoted_date, new.vendor, auth.uid());
  end if;
  return new;
end;
$$;
create trigger fab_tiers_price_history
  after update on fab_tiers
  for each row execute function log_fab_tier_price_change();

-- ============================================================================
-- 0004: Quotes
-- ============================================================================
create table quote_number_sequences (
  year         smallint primary key,
  last_number  integer not null default 0
);

create table quotes (
  id                    uuid primary key default gen_random_uuid(),
  quote_number          text not null unique,
  customer_name         text not null,
  product_id            uuid not null references products(id),
  fab_tier_id           uuid not null references fab_tiers(id),
  fab_cost_snapshot     numeric(12,2) not null,
  environment           quote_environment not null,
  status                quote_status not null default 'draft',
  owner_id              uuid not null references profiles(id),
  approved_by           uuid references profiles(id),
  submitted_at          timestamptz,
  approved_at           timestamptz,
  sent_at               timestamptz,
  total_hard_cost       numeric(12,2) not null default 0,
  total_labor_cost      numeric(12,2) not null default 0,
  cushion_amount        numeric(12,2) not null default 0,
  commission_amount     numeric(12,2) not null default 0,
  total_cost            numeric(12,2) not null default 0,
  final_price_each      numeric(12,2) not null default 0,
  gp_dollars            numeric(12,2) not null default 0,
  gp_percent            numeric(6,3) not null default 0,
  below_margin_floor    boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index idx_quotes_owner_id on quotes(owner_id);
create index idx_quotes_approved_by on quotes(approved_by);
create index idx_quotes_product_id on quotes(product_id);
create index idx_quotes_fab_tier_id on quotes(fab_tier_id);
create index idx_quotes_status on quotes(status);
create trigger quotes_set_updated_at
  before update on quotes for each row execute function set_updated_at();

create table quote_lines (
  id                    uuid primary key default gen_random_uuid(),
  quote_id              uuid not null references quotes(id) on delete cascade,
  category_id           uuid references categories(id),
  component_id          uuid references components(id),
  description           text not null,
  is_misc               boolean not null default false,
  hard_cost             numeric(12,2) not null default 0,
  labor_hours           numeric(6,2) not null default 0,
  labor_cost            numeric(12,2) not null default 0,
  markup_percent        numeric(5,2) not null default 0,
  environment_mismatch  boolean not null default false,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint quote_lines_category_required_unless_misc check (is_misc or category_id is not null)
);
create index idx_quote_lines_quote_id on quote_lines(quote_id);
create index idx_quote_lines_category_id on quote_lines(category_id);
create index idx_quote_lines_component_id on quote_lines(component_id);
-- PRD-007A: at most one non-misc line per fixed category per quote
create unique index uq_quote_lines_one_per_fixed_category
  on quote_lines(quote_id, category_id) where not is_misc;
create trigger quote_lines_set_updated_at
  before update on quote_lines for each row execute function set_updated_at();

create table quote_status_history (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid not null references quotes(id) on delete cascade,
  from_status  text,
  to_status    text not null,
  actor        uuid not null references profiles(id),
  changed_at   timestamptz not null default now()
);
create index idx_quote_status_history_quote_id on quote_status_history(quote_id);
create index idx_quote_status_history_actor on quote_status_history(actor);

-- Validate the state machine BEFORE the row is written (PRD-010, NFR-002)
--
-- FOUR legal transitions, not three. PRD-010 defines the lifecycle as
-- Draft -> Pending Approval -> Approved -> Sent PLUS Pending Approval -> Draft
-- ("request changes"), and states that BOTH exits from Pending Approval --
-- forward to Approved and back to Draft -- are admin-only. An earlier draft of
-- this function carried only three and would have raised on request-changes,
-- silently deleting a documented path (ARCHITECTURE §7, DATABASE.md §1).
create or replace function validate_quote_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new; -- ordinary content edit, no transition
  end if;

  if old.status = 'draft' and new.status = 'pending_approval' then
    new.submitted_at := now();
  elsif old.status = 'pending_approval' and new.status = 'approved' then
    if not is_admin() then
      raise exception 'Only an admin may approve a quote (PRD-010)';
    end if;
    new.approved_by := auth.uid();
    new.approved_at := now();
  elsif old.status = 'pending_approval' and new.status = 'draft' then
    -- Request changes. Admin-only for the same reason approval is: PRD-010
    -- puts both exits from Pending Approval in the admin's hands, so a rep
    -- cannot pull their own quote back out of review.
    if not is_admin() then
      raise exception 'Only an admin may send a quote back to Draft (PRD-010)';
    end if;
    -- Clear the submission stamp: these three columns describe where the quote
    -- IS, not where it has been -- quote_status_history is the trail. Leaving a
    -- stale submitted_at would make the next submission look like the first.
    new.submitted_at := null;
  elsif old.status = 'approved' and new.status = 'sent' then
    new.sent_at := now();
  else
    raise exception 'Invalid quote status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;
create trigger quotes_validate_status_transition
  before update on quotes
  for each row execute function validate_quote_status_transition();

-- Log every status change AFTER it's validated and applied (PRD-017, NFR-005)
create or replace function log_quote_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into quote_status_history(quote_id, from_status, to_status, actor)
    values (new.id, old.status::text, new.status::text, auth.uid());
  end if;
  return new;
end;
$$;
create trigger quotes_log_status_change
  after update on quotes
  for each row execute function log_quote_status_change();

-- Log the initial Draft creation too
create or replace function log_quote_status_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into quote_status_history(quote_id, from_status, to_status, actor)
  values (new.id, null, new.status::text, auth.uid());
  return new;
end;
$$;
create trigger quotes_log_status_insert
  after insert on quotes
  for each row execute function log_quote_status_insert();
```

---

## 2. RPC Functions (Atomic Multi-Row Writes)

Per ARCHITECTURE §1/§3/§5: Server Actions compute the canonical cost breakdown in
TypeScript (`src/lib/pricing/`), then call **one** of these functions to persist
everything atomically. These functions are `SECURITY INVOKER` (the default) — they run
under the calling user's own session, so the RLS policies in §3 still apply row-by-row
inside them. That's intentional: it's how the app satisfies "no service-role key anywhere"
(TECH-STACK §6) while still getting transactional atomicity — the function body itself is
one transaction, and every row it touches is still subject to RLS as that user.

**One exception to `SECURITY INVOKER`, and it is load-bearing.** `quote_number_sequences`
has RLS enabled and **zero policies** (§3), which means a caller running as `authenticated`
cannot touch it at all — not select, not insert. A `SECURITY INVOKER` `fn_save_quote` that
incremented the counter inline would therefore fail on every new quote with
`new row violates row-level security policy`, taking PRD-011's numbering with it. The
counter increment is pulled into a small `SECURITY DEFINER` function so the table can stay
policy-less: the counter is reachable only through the one function allowed to allocate a
number, and the quote write itself stays under the caller's own RLS.

Deliberately _not_ done: making `fn_save_quote` itself `SECURITY DEFINER`. That would run
the entire quote write as the function owner and silently discard the owner-or-admin RLS on
`quotes` and `quote_lines` — trading a real authorization boundary for a one-line fix.

Accepted trade-off: `fn_next_quote_number()` is callable directly over the Data API by any
authenticated user, who could burn numbers and leave gaps in the sequence. PRD-011 requires
uniqueness and race-freedom, not density, so gaps are cosmetic. If that needs closing, move
this one function to a schema outside `[api] schemas` in `supabase/config.toml` — PostgREST
will not route to it there, while `fn_save_quote` can still call it.

```sql
-- ----------------------------------------------------------------------------
-- fn_next_quote_number: allocate the next Q-YYYY-NNNN race-free (PRD-011).
--
-- SECURITY DEFINER on purpose -- see the note above. The single
-- INSERT ... ON CONFLICT DO UPDATE ... RETURNING is what makes race-freedom
-- structural rather than careful: concurrent callers serialize on the year
-- row, and neither can observe a number the other took.
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
-- (PRD-011). Receives already-computed pricing values — it does not compute
-- them (NFR-007: computation lives in the shared TS pricing module).
-- ----------------------------------------------------------------------------
create or replace function fn_save_quote(
  p_quote_id       uuid,           -- null => new quote
  p_customer_name  text,
  p_product_id     uuid,
  p_fab_tier_id    uuid,
  p_environment    quote_environment,
  p_owner_id       uuid,
  p_pricing        jsonb,          -- server-recomputed totals, see shape below
  p_lines          jsonb           -- array of line objects, see shape below
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
      customer_name       = p_customer_name,
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

    if not found then
      raise exception 'Quote % not found or not permitted', p_quote_id;
    end if;
  end if;

  -- Replace all line items inside the same transaction (PRD-014).
  -- This is the RPC-internal delete+insert the anti-pattern in
  -- PRODUCT.md §6 warns against doing client-side/sequentially — here it's
  -- one function call, one transaction, so a failed insert rolls back the
  -- delete too.
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
  -- uq_quote_lines_one_per_fixed_category — a violation here raises and
  -- rolls back the whole function call, header included.

  return v_quote;
end;
$$;

-- ----------------------------------------------------------------------------
-- fn_submit_quote_status: thin wrapper for status transitions. The real
-- enforcement is the BEFORE UPDATE trigger (validate_quote_status_transition)
-- and the RLS UPDATE policy on quotes — this function exists only so a
-- Server Action has a single, explicit entry point (PRD-010).
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
-- tiers and default components (PRD-015). Price-history rows for changed
-- tier costs are handled automatically by fab_tiers_price_history (§1) —
-- this function does not duplicate that logic.
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

  -- Upsert tiers by (product_id, qty_tier) so an UPDATE (not delete+insert)
  -- fires fab_tiers_price_history when cost actually changes.
  insert into fab_tiers (product_id, qty_tier, cost, quoted_date, vendor)
  select v_product.id, (t->>'qty_tier')::integer, (t->>'cost')::numeric,
         (t->>'quoted_date')::date, t->>'vendor'
  from jsonb_array_elements(p_fab_tiers) as t
  on conflict (product_id, qty_tier) do update set
    cost = excluded.cost,
    quoted_date = excluded.quoted_date,
    vendor = excluded.vendor;

  delete from fab_tiers
  where product_id = v_product.id
    and qty_tier not in (
      select (t->>'qty_tier')::integer from jsonb_array_elements(p_fab_tiers) as t
    );

  delete from product_defaults where product_id = v_product.id;
  insert into product_defaults (product_id, category_id, component_id)
  select v_product.id, (d->>'category_id')::uuid, (d->>'component_id')::uuid
  from jsonb_array_elements(p_defaults) as d;

  return v_product;
end;
$$;
```

---

## 3. RLS Policies

Enforcement model, restated from PRD-019 / ARCHITECTURE §4 (Key Design Decisions):

- **Reads are flat** — any authenticated REDYREF user (rep or admin) can read every table,
  **except `settings_history`, which is admin-only read** (PRD-018B). That is the single
  exception in the model; do not generalize it, and do not copy the flat pattern onto it.
- **Master data / settings / branding writes are admin-only.**
- **Quote content writes are owner-or-admin.**
- **Both exits from `Pending Approval` — forward to `Approved` and back to `Draft` — are
  admin-only**, enforced by the `validate_quote_status_transition` trigger (§1), which is a
  database guarantee and satisfies NFR-002 on its own.

  **There is deliberately no second RLS layer on this, and an earlier version of this bullet
  wrongly claimed there was** ("enforced both by an RLS `WITH CHECK` and independently by the
  trigger"). No policy below expresses it: `quotes_update_owner_or_admin` checks
  owner-or-admin and nothing about status. The claim was false, and a false belt-and-suspenders
  claim is worse than one layer honestly described — it invites someone to weaken the trigger
  believing RLS still has them covered.

  A second layer _is_ expressible, but not for free. `WITH CHECK` sees only the new row, never
  the old, so the closest it gets is `(status <> 'approved' or is_admin())` — "no non-admin may
  leave a quote sitting in Approved". That also blocks a rep from editing any field of their
  own already-approved quote, which silently resolves the **"Editing a quote after submission"**
  open item in [DATABASE.md](DATABASE.md) §6 in the freeze direction. That is a product
  decision, not a hardening tweak. **Add this policy when §6 is decided, not before.**

- **Append-only audit tables (`price_history`, `quote_status_history`,
  `settings_history`) have no client-facing INSERT/UPDATE/DELETE policy at all** — rows are
  written exclusively by `SECURITY DEFINER` triggers, so "append-only" is a database
  guarantee, not an application convention.
- **No table has a DELETE policy for `products`, `components`, or `quotes`** — deactivation
  (`active = false`) is the only supported removal path for master data (PRD-018); quotes
  are never deleted at all.

```sql
alter table profiles enable row level security;
alter table categories enable row level security;
alter table settings enable row level security;
alter table settings_history enable row level security;
alter table products enable row level security;
alter table fab_tiers enable row level security;
alter table product_defaults enable row level security;
alter table components enable row level security;
alter table price_history enable row level security;
alter table quotes enable row level security;
alter table quote_lines enable row level security;
alter table quote_status_history enable row level security;
-- quote_number_sequences: RLS enabled, zero policies, and it STAYS that way.
-- Zero policies means no `authenticated` caller can reach this table at all --
-- which is the point, because the counter is the one thing a client must never
-- be able to rewind. It is reachable only through fn_next_quote_number(),
-- which is SECURITY DEFINER for exactly this reason (§2).
--
-- Do not "fix" a permission-denied here by adding a policy: an earlier version
-- of this comment claimed the table was reachable "from inside fn_save_quote
-- via the calling user's own privileges on `quotes`", which is not how RLS
-- works -- it applies per table, per statement, to whoever the invoker is.
-- That reading would have made every new quote fail on its first save.
alter table quote_number_sequences enable row level security;

-- ---------------------------------------------------------------- profiles
create policy "profiles_select_authenticated"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles_update_self_or_admin"
  on profiles for update
  to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());
-- Note: this policy alone does not stop a rep from setting their own
-- role='admin'. Add a BEFORE UPDATE trigger that rejects a role change
-- unless is_admin() is true, mirroring the quotes-status-transition pattern
-- in §1, before go-live (see §4.2).

-- no INSERT policy: profiles are created only by handle_new_user() (SECURITY DEFINER)
-- no DELETE policy: profiles are never deleted by the app

-- --------------------------------------------------------------- categories
create policy "categories_select_authenticated"
  on categories for select to authenticated using (true);
create policy "categories_write_admin"
  on categories for insert to authenticated with check (is_admin());
create policy "categories_update_admin"
  on categories for update to authenticated using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------- settings
create policy "settings_select_authenticated"
  on settings for select to authenticated using (true);
create policy "settings_update_admin"
  on settings for update to authenticated using (is_admin()) with check (is_admin());
-- no INSERT/DELETE policy: the single row is seeded once by migration

-- --------------------------------------------------------- settings_history
-- ADMIN-ONLY READ, and the one exception to "reads are flat" (PRD-018B, decided
-- 2026-08-08). Markup, commission, and margin-floor history is compensation-adjacent;
-- the flat default was never a decision, just the pattern copied from every other table.
create policy "settings_history_select_admin"
  on settings_history for select to authenticated using (is_admin());
-- no INSERT/UPDATE/DELETE policy: written only by log_settings_change() (SECURITY DEFINER)
--
-- LIVE ON THE REMOTE as of 2026-08-08 via `0005_settings_history_admin_read.sql`.
-- `0003` shipped this flat (`settings_history_select_authenticated ... using (true)`) and is
-- immutable, so `0005` dropped that policy and created the one above. Verified after the push:
-- one policy on the table, SELECT only, `USING is_admin()`, no write policy.

-- ----------------------------------------------------------------- products
create policy "products_select_authenticated"
  on products for select to authenticated using (true);
create policy "products_insert_admin"
  on products for insert to authenticated with check (is_admin());
create policy "products_update_admin"
  on products for update to authenticated using (is_admin()) with check (is_admin());
-- no DELETE policy: deactivate via `active = false` (PRD-018), never hard-delete

-- ---------------------------------------------------------------- fab_tiers
create policy "fab_tiers_select_authenticated"
  on fab_tiers for select to authenticated using (true);
create policy "fab_tiers_write_admin"
  on fab_tiers for insert to authenticated with check (is_admin());
create policy "fab_tiers_update_admin"
  on fab_tiers for update to authenticated using (is_admin()) with check (is_admin());
create policy "fab_tiers_delete_admin"
  on fab_tiers for delete to authenticated using (is_admin());
-- (delete IS allowed here: a tier being removed from a product's tier list —
--  driven by fn_save_product's reconciliation delete — is a structural edit
--  to the live tier list, not a deletion of quote-referencing history; the
--  historical cost data already migrated to price_history before removal.)

-- ----------------------------------------------------------- product_defaults
create policy "product_defaults_select_authenticated"
  on product_defaults for select to authenticated using (true);
create policy "product_defaults_write_admin"
  on product_defaults for insert to authenticated with check (is_admin());
create policy "product_defaults_update_admin"
  on product_defaults for update to authenticated using (is_admin()) with check (is_admin());
create policy "product_defaults_delete_admin"
  on product_defaults for delete to authenticated using (is_admin());

-- --------------------------------------------------------------- components
create policy "components_select_authenticated"
  on components for select to authenticated using (true);
create policy "components_insert_admin"
  on components for insert to authenticated with check (is_admin());
create policy "components_update_admin"
  on components for update to authenticated using (is_admin()) with check (is_admin());
-- no DELETE policy: deactivate via `active = false` (PRD-018), never hard-delete

-- ------------------------------------------------------------- price_history
create policy "price_history_select_authenticated"
  on price_history for select to authenticated using (true);
-- no INSERT/UPDATE/DELETE policy: written only by the log_*_price_change() triggers

-- -------------------------------------------------------------------- quotes
create policy "quotes_select_authenticated"
  on quotes for select to authenticated using (true);

create policy "quotes_insert_own"
  on quotes for insert to authenticated
  with check (owner_id = auth.uid());

create policy "quotes_update_owner_or_admin"
  on quotes for update to authenticated
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());
-- The specific rule "only an admin may move Pending Approval -> Approved"
-- is enforced independently by the validate_quote_status_transition trigger
-- (§1) — even a bypassed/tampered client that satisfies this owner-or-admin
-- check still gets rejected by the trigger if it isn't an admin doing that
-- specific transition (NFR-002).
-- no DELETE policy: quotes are never deleted

-- --------------------------------------------------------------- quote_lines
create policy "quote_lines_select_authenticated"
  on quote_lines for select to authenticated using (true);

create policy "quote_lines_write_owner_or_admin"
  on quote_lines for insert to authenticated
  with check (
    exists (
      select 1 from quotes q
      where q.id = quote_lines.quote_id
        and (q.owner_id = auth.uid() or is_admin())
    )
  );

create policy "quote_lines_update_owner_or_admin"
  on quote_lines for update to authenticated
  using (
    exists (
      select 1 from quotes q
      where q.id = quote_lines.quote_id
        and (q.owner_id = auth.uid() or is_admin())
    )
  )
  with check (
    exists (
      select 1 from quotes q
      where q.id = quote_lines.quote_id
        and (q.owner_id = auth.uid() or is_admin())
    )
  );

create policy "quote_lines_delete_owner_or_admin"
  on quote_lines for delete to authenticated
  using (
    exists (
      select 1 from quotes q
      where q.id = quote_lines.quote_id
        and (q.owner_id = auth.uid() or is_admin())
    )
  );
-- DELETE is allowed here (unlike quotes/products/components) because line
-- replacement inside fn_save_quote's single transaction is exactly how
-- PRD-014's atomic save is implemented (§2) — this is not user-facing
-- deletion of quote history, quote_status_history captures that instead.

-- --------------------------------------------------------- quote_status_history
create policy "quote_status_history_select_authenticated"
  on quote_status_history for select to authenticated using (true);
-- no INSERT/UPDATE/DELETE policy: written only by the log_quote_status_*() triggers
```

---

## 4. Implementation Notes

Things to do, or to decide, while authoring the migrations. The model-level rationale for
the schema itself lives in `docs/DATABASE.md` §5; this section is only what affects getting
the SQL above into the database safely.

### 4.1 Do not wire the save RPC until PRD §2A is signed off

`fn_save_quote` persists the nine pricing columns on `quotes` exactly as the caller supplies
them. That is correct — the server recomputes them (NFR-007) and the database is only
storage (`docs/DATABASE.md` §5.1). But **do not call it from a real Server Action until the
pricing formula and rounding rules in PRD §2A are signed off**: until then there is no
defined value for it to store. At sign-off, confirm the column list still matches that
section's finalized "persisted vs. preview-only" fields and add a reconciling migration if
it does not.

### 4.2 Profile role self-escalation — **fixed 2026-08-01**

The `profiles_update_self_or_admin` policy in [§3](#3-rls-policies) lets a user update their
own row, and does not stop them setting `role = 'admin'` on it. RLS `USING` / `WITH CHECK`
clauses cannot easily express "this specific column may only change if X" without a
companion trigger.

**Add a `BEFORE UPDATE` trigger on `profiles`** — same pattern as
`validate_quote_status_transition` — that raises if `NEW.role IS DISTINCT FROM OLD.role` and
`NOT is_admin()`. This is a privilege-escalation hole in the two-role model (PRD-019), not a
cosmetic gap: without it, RLS-enforced admin-only writes are one self-update away from any
authenticated rep.

**Shipped as `enforce_profile_role_change()` in `0002_profiles_and_auth.sql`, with one
addition to the above:** the trigger also requires `auth.uid() is not null`. Without that
clause there is no way to create the **first** admin — `handle_new_user()` always writes
`'rep'`, and a promotion run from the dashboard SQL editor executes as `postgres` with a NULL
`auth.uid()`, so `is_admin()` is false and the trigger rejects it. The carve-out is not a hole:
every `profiles` policy is `to authenticated`, so an `anon` UPDATE is rejected by RLS before the
trigger runs, and ARCHITECTURE §1 states no service-role key exists anywhere in the app — so the
NULL-`auth.uid()` path is unreachable from application code.

### 4.3 The environment-mismatch flag is client-supplied

`quote_lines.environment_mismatch` is written from a value passed into `fn_save_quote`,
computed by the same shared TypeScript module the rest of NFR-007 relies on. Unlike the
pricing totals, no NFR requires the mismatch flag _specifically_ to be server-recomputed.

If that guarantee is wanted, it is a straightforward `BEFORE INSERT OR UPDATE` trigger on
`quote_lines` that compares `components.environment` against the parent quote's
`environment` and overwrites whatever the client sent — the same treatment the pricing
totals already get.

### 4.4 Regenerate types after every migration

Per TECH-STACK.md §4, run `npm run db:types` (`supabase gen types typescript`) after each
migration lands so `src/lib/supabase/types.ts` stays in sync. This schema introduces four
enums — `user_role`, `quote_status`, `environment_type`, `quote_environment` — that
TypeScript consumers want typed rather than stringly.

### 4.5 Testing surface

These are worth a dedicated test pass beyond the pricing-calc unit tests TECH-STACK.md
already plans, because each is concurrency or authorization behaviour that reading the SQL
will not confirm:

- **`validate_quote_status_transition` and the approval gate** — a non-admin's direct
  `UPDATE quotes SET status = 'approved'` must be rejected **even when they own the row**
  (PRD-010, NFR-002). This is the single most important test in the repo: it is the
  assertion that the approval gate is a database guarantee and not a UI convention. Note it
  is the _only_ layer enforcing this — there is no RLS backstop (§3), so if this test is
  deleted, nothing catches the regression.
- **Request changes is admin-only too** — the same `UPDATE` to `status = 'draft'` from
  `pending_approval` must be rejected for a non-admin owner. Easy to miss because it is the
  one transition that moves a quote _backwards_, and the obvious-looking reading ("a rep can
  always take their own quote back to Draft") is the wrong one under PRD-010.
- **A rejected quote can be resubmitted** — `pending_approval → draft → pending_approval`
  must succeed and leave `submitted_at` set to the _second_ submission's timestamp, not the
  first. This is the assertion that the `submitted_at := null` reset in §1 actually fires.
- **`fn_next_quote_number()`'s counter** — two concurrent calls in the same calendar year
  must produce distinct quote numbers (PRD-011).
- **A plain `authenticated` caller cannot touch `quote_number_sequences`** — a direct
  `select` or `update` must be denied, while `fn_save_quote` still allocates a number
  successfully. This is the pair that proves the `SECURITY DEFINER` hop is doing the work and
  that the table's zero-policy state has not been "fixed" by someone chasing a
  permission-denied error (§2, §3).

### 4.6 Markup units — **resolved 2026-08-01: percents everywhere**

An earlier pass renamed the two `settings` markup columns to `*_markup_multiplier` to match
seed values of `1.50` / `1.20`, leaving `quote_lines.markup_percent` as the odd one out and
the quote builder's pre-fill knowingly wrong. **That direction is reverted.** The mismatch is
fixed the other way: the columns go back to `_percent` names and the _values_ are restated as
`50.00` / `20.00`.

That reversal shipped as `0004_settings_markup_units.sql`, not as an edit to `0003` —
`0003` was already applied to the linked project by the time the decision changed, and
`db push` compares recorded versions, not file contents, so an edit to `0003` would have
been silently skipped while reading as though it had landed.

`1.5×` and `50%` are the same business fact; only the storage representation was in question.
Percent won on three counts:

- **Precision.** A multiplier in `numeric(5,2)` steps 0.01 — one whole percentage point of
  markup, so 18.5% is not representable. The same type holding a percent steps 0.01pp, 100×
  finer. The multiplier naming had quietly locked in the coarser column.
- **Input boundary.** The quote-line markup cell (`src/components/quote-builder/line-items.tsx`)
  is typed into by reps, who enter `18`, not `1.18`. A multiplier column would need a
  conversion at the UI layer — the same "two units in one path" cost, just relocated.
- **No conversion anywhere.** `settings.component_markup_percent` pre-fills
  `quote_lines.markup_percent` as a straight copy, and that column's existing `default 0`
  already means "no markup" (the multiplier reading would have needed `default 1`).

**`quote_lines` needs no change** — `markup_percent numeric(5,2) not null default 0` as
specified in §1 is correct as written, and the quotes migration (`0006` onward, since `0004`
is the markup-units fix and `0005` the settings_history read narrowing) can be authored against it.

The pricing formula applies `cost * (1 + p/100)` in one place, whenever PRD §2A fixes the
calculation order. That sign-off is still outstanding, but it no longer blocks the schema.
