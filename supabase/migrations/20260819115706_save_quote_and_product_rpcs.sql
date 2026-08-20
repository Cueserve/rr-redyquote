-- ----------------------------------------------------------------------------
-- fn_save_quote: atomic upsert of a quote header + full replacement of its
-- lines (PRD-014). Allocates the quote number race-free on first save
-- (PRD-011). Receives already-computed pricing values — it does not compute
-- them (NFR-007: computation lives in the shared TS pricing module).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_save_quote(
  p_quote_id       uuid,           -- null => new quote
  p_customer_name  text,
  p_product_id     uuid,
  p_fab_tier_id    uuid,
  p_environment    quote_environment,
  p_owner_id       uuid,
  p_pricing        jsonb,          -- server-recomputed totals, see shape below
  p_lines          jsonb           -- array of line objects, see shape below
)
RETURNS public.quotes
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_quote   public.quotes;
  v_number  text;
BEGIN
  IF p_quote_id IS NULL THEN
    -- SECURITY DEFINER hop: quote_number_sequences is policy-less under RLS,
    -- so this function -- running as the caller -- cannot reach it directly.
    v_number := public.fn_next_quote_number();

    INSERT INTO public.quotes (
      quote_number, customer_name, product_id, fab_tier_id, fab_cost_snapshot,
      environment, owner_id,
      total_hard_cost, total_labor_cost, cushion_amount, commission_amount,
      total_cost, final_price_each, gp_dollars, gp_percent, below_margin_floor
    ) VALUES (
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
    RETURNING * INTO v_quote;
  ELSE
    UPDATE public.quotes SET
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
    WHERE id = p_quote_id
    RETURNING * INTO v_quote;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Quote % not found or not permitted', p_quote_id;
    END IF;
  END IF;

  -- Replace all line items inside the same transaction (PRD-014).
  DELETE FROM public.quote_lines WHERE quote_id = v_quote.id;

  INSERT INTO public.quote_lines (
    quote_id, category_id, component_id, description, is_misc,
    hard_cost, labor_hours, labor_cost, markup_percent,
    environment_mismatch, sort_order
  )
  SELECT
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
  FROM jsonb_array_elements(p_lines) AS l;

  RETURN v_quote;
END;
$$;


-- ----------------------------------------------------------------------------
-- fn_transition_quote_status: thin wrapper for status transitions.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_transition_quote_status(
  p_quote_id  uuid,
  p_to_status quote_status
)
RETURNS public.quotes
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_quote public.quotes;
BEGIN
  UPDATE public.quotes SET status = p_to_status
  WHERE id = p_quote_id
  RETURNING * INTO v_quote;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote % not found or not permitted', p_quote_id;
  END IF;

  RETURN v_quote;
END;
$$;


-- ----------------------------------------------------------------------------
-- fn_save_product: atomic upsert of a product + full replacement of its fab
-- tiers and default components (PRD-015). Price-history rows for changed
-- tier costs are handled automatically by fab_tiers_price_history.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_save_product(
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
RETURNS public.products
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_product public.products;
BEGIN
  IF p_product_id IS NULL THEN
    INSERT INTO public.products (name, sku, description, vendor, est_labor_hours, active)
    VALUES (p_name, p_sku, p_description, p_vendor, p_est_labor_hours, p_active)
    RETURNING * INTO v_product;
  ELSE
    UPDATE public.products SET
      name = p_name, sku = p_sku, description = p_description, vendor = p_vendor,
      est_labor_hours = p_est_labor_hours, active = p_active
    WHERE id = p_product_id
    RETURNING * INTO v_product;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found or not permitted', p_product_id;
    END IF;
  END IF;

  -- Upsert tiers by (product_id, qty_tier) so an UPDATE (not delete+insert)
  -- fires fab_tiers_price_history when cost actually changes.
  INSERT INTO public.fab_tiers (product_id, qty_tier, cost, quoted_date, vendor)
  SELECT v_product.id, (t->>'qty_tier')::integer, (t->>'cost')::numeric,
         (t->>'quoted_date')::date, t->>'vendor'
  FROM jsonb_array_elements(p_fab_tiers) AS t
  ON CONFLICT (product_id, qty_tier) DO UPDATE SET
    cost = excluded.cost,
    quoted_date = excluded.quoted_date,
    vendor = excluded.vendor;

  DELETE FROM public.fab_tiers
  WHERE product_id = v_product.id
    AND qty_tier NOT IN (
      SELECT (t->>'qty_tier')::integer FROM jsonb_array_elements(p_fab_tiers) AS t
    );

  DELETE FROM public.product_defaults WHERE product_id = v_product.id;
  INSERT INTO public.product_defaults (product_id, category_id, component_id)
  SELECT v_product.id, (d->>'category_id')::uuid, (d->>'component_id')::uuid
  FROM jsonb_array_elements(p_defaults) AS d;

  RETURN v_product;
END;
$$;
