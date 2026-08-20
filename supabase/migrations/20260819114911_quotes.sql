CREATE TABLE public.quotes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number text NOT NULL UNIQUE,
    customer_name text NOT NULL,
    product_id uuid NOT NULL REFERENCES public.products(id),
    fab_tier_id uuid NOT NULL REFERENCES public.fab_tiers(id),
    fab_cost_snapshot numeric(12,2) NOT NULL,
    environment quote_environment NOT NULL,
    status quote_status NOT NULL DEFAULT 'draft',
    owner_id uuid NOT NULL REFERENCES public.profiles(id),
    approved_by uuid NULL REFERENCES public.profiles(id),
    submitted_at timestamptz NULL,
    approved_at timestamptz NULL,
    sent_at timestamptz NULL,
    total_hard_cost numeric(12,2) NOT NULL DEFAULT 0,
    total_labor_cost numeric(12,2) NOT NULL DEFAULT 0,
    cushion_amount numeric(12,2) NOT NULL DEFAULT 0,
    commission_amount numeric(12,2) NOT NULL DEFAULT 0,
    total_cost numeric(12,2) NOT NULL DEFAULT 0,
    final_price_each numeric(12,2) NOT NULL DEFAULT 0,
    gp_dollars numeric(12,2) NOT NULL DEFAULT 0,
    gp_percent numeric(6,3) NOT NULL DEFAULT 0,
    below_margin_floor boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to auto-update 'updated_at'
CREATE TRIGGER set_quotes_updated_at
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Trigger to validate quote status transitions and set timestamps automatically
CREATE OR REPLACE FUNCTION public.validate_quote_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Rule: only an admin may move Pending Approval -> Approved
        IF (NEW.status = 'approved' AND OLD.status = 'pending_approval') THEN
            IF NOT public.is_admin() THEN
                RAISE EXCEPTION 'Only an admin may approve a quote';
            END IF;
            NEW.approved_at = now();
            NEW.approved_by = auth.uid();
        ELSIF (NEW.status = 'pending_approval' AND OLD.status = 'draft') THEN
            NEW.submitted_at = now();
        ELSIF (NEW.status = 'sent' AND OLD.status = 'approved') THEN
            NEW.sent_at = now();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER check_quote_status_transition
    BEFORE UPDATE ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_quote_status_transition();

-- Enable Row Level Security
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_select_authenticated"
    ON public.quotes FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "quotes_insert_own"
    ON public.quotes FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "quotes_update_owner_or_admin"
    ON public.quotes FOR UPDATE TO authenticated
    USING (owner_id = auth.uid() OR public.is_admin())
    WITH CHECK (owner_id = auth.uid() OR public.is_admin());
