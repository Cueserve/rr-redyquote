CREATE TABLE public.fab_tiers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    qty_tier integer NOT NULL CHECK (qty_tier > 0),
    cost numeric(12,2) NOT NULL CHECK (cost >= 0),
    quoted_date date NOT NULL,
    vendor text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, qty_tier)
);

-- Trigger to auto-update 'updated_at'
CREATE TRIGGER set_fab_tiers_updated_at
    BEFORE UPDATE ON public.fab_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security
ALTER TABLE public.fab_tiers ENABLE ROW LEVEL SECURITY;

-- RLS: Read-only for all authenticated users (Reps and Admins)
CREATE POLICY "Fab tiers are readable by everyone" 
    ON public.fab_tiers FOR SELECT 
    USING (auth.role() = 'authenticated');

-- RLS: Writes (Insert, Update, Delete) are Admin-only
CREATE POLICY "Fab tiers are insertable by admins only"
    ON public.fab_tiers FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Fab tiers are updatable by admins only"
    ON public.fab_tiers FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Fab tiers are deletable by admins only"
    ON public.fab_tiers FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
