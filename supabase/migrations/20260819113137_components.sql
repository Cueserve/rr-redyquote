CREATE TABLE public.components (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id uuid NOT NULL REFERENCES public.categories(id),
    name text NOT NULL,
    sku text NOT NULL UNIQUE,
    vendor text NULL,
    environment environment_type NOT NULL DEFAULT 'any',
    cost numeric(12,2) NOT NULL CHECK (cost >= 0),
    default_labor_hours numeric(6,2) NOT NULL DEFAULT 0 CHECK (default_labor_hours >= 0),
    quoted_date date NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to auto-update 'updated_at'
CREATE TRIGGER set_components_updated_at
    BEFORE UPDATE ON public.components
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

-- RLS: Read-only for all authenticated users (Reps and Admins)
CREATE POLICY "Components are readable by everyone" 
    ON public.components FOR SELECT 
    USING (auth.role() = 'authenticated');

-- RLS: Writes (Insert, Update, Delete) are Admin-only
CREATE POLICY "Components are insertable by admins only"
    ON public.components FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Components are updatable by admins only"
    ON public.components FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Components are deletable by admins only"
    ON public.components FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
