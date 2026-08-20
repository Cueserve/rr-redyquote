CREATE TABLE public.product_defaults (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.categories(id),
    component_id uuid NULL REFERENCES public.components(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, category_id)
);

-- Trigger to auto-update 'updated_at'
CREATE TRIGGER set_product_defaults_updated_at
    BEFORE UPDATE ON public.product_defaults
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security
ALTER TABLE public.product_defaults ENABLE ROW LEVEL SECURITY;

-- RLS: Read-only for all authenticated users (Reps and Admins)
CREATE POLICY "Product defaults are readable by everyone" 
    ON public.product_defaults FOR SELECT 
    USING (auth.role() = 'authenticated');

-- RLS: Writes (Insert, Update, Delete) are Admin-only
CREATE POLICY "Product defaults are insertable by admins only"
    ON public.product_defaults FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Product defaults are updatable by admins only"
    ON public.product_defaults FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Product defaults are deletable by admins only"
    ON public.product_defaults FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
