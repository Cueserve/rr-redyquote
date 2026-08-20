CREATE TABLE public.price_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type text NOT NULL CHECK (source_type IN ('component', 'fab_tier')),
    component_id uuid NULL REFERENCES public.components(id) ON DELETE CASCADE,
    product_id uuid NULL REFERENCES public.products(id) ON DELETE CASCADE,
    qty_tier integer NULL,
    cost numeric(12,2) NOT NULL CHECK (cost >= 0),
    quoted_date date NOT NULL,
    vendor text NULL,
    changed_by uuid NOT NULL REFERENCES public.profiles(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    
    CHECK (
        (source_type = 'component' AND component_id IS NOT NULL AND product_id IS NULL AND qty_tier IS NULL) OR
        (source_type = 'fab_tier' AND product_id IS NOT NULL AND qty_tier IS NOT NULL AND component_id IS NULL)
    )
);

-- Append-only table, no updated_at trigger required

-- Enable Row Level Security
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- RLS: Read-only for all authenticated users (Reps and Admins)
CREATE POLICY "Price history is readable by everyone" 
    ON public.price_history FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Note: No INSERT/UPDATE/DELETE policies are added. 
-- Clients cannot write to this table directly. It is written exclusively by the trigger function below.

-- Trigger function to log cost changes (SECURITY DEFINER allows it to write to price_history despite RLS)
CREATE OR REPLACE FUNCTION public.log_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only log if it's an INSERT, or if it's an UPDATE where the cost actually changed
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.cost IS NOT DISTINCT FROM NEW.cost) THEN
            RETURN NEW;
        END IF;
    END IF;

    IF (TG_TABLE_NAME = 'components') THEN
        INSERT INTO public.price_history (source_type, component_id, cost, quoted_date, vendor, changed_by)
        VALUES ('component', NEW.id, NEW.cost, NEW.quoted_date, NEW.vendor, auth.uid());
    ELSIF (TG_TABLE_NAME = 'fab_tiers') THEN
        INSERT INTO public.price_history (source_type, product_id, qty_tier, cost, quoted_date, vendor, changed_by)
        VALUES ('fab_tier', NEW.product_id, NEW.qty_tier, NEW.cost, NEW.quoted_date, NEW.vendor, auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

-- Attach trigger to components
CREATE TRIGGER log_component_price_change
    AFTER INSERT OR UPDATE OF cost, quoted_date, vendor
    ON public.components
    FOR EACH ROW
    EXECUTE FUNCTION public.log_price_change();

-- Attach trigger to fab_tiers
CREATE TRIGGER log_fab_tier_price_change
    AFTER INSERT OR UPDATE OF cost, quoted_date, vendor
    ON public.fab_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.log_price_change();
