CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger to auto-update 'updated_at'
CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS: Read-only for all authenticated users (Reps and Admins)
CREATE POLICY "Categories are readable by everyone" 
    ON public.categories FOR SELECT 
    USING (auth.role() = 'authenticated');

-- RLS: Writes (Insert, Update, Delete) are Admin-only
CREATE POLICY "Categories are insertable by admins only"
    ON public.categories FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Categories are updatable by admins only"
    ON public.categories FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Categories are deletable by admins only"
    ON public.categories FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Seed the initial 8 placeholder categories
INSERT INTO public.categories (name, sort_order) VALUES
    ('Enclosure', 1),
    ('Display', 2),
    ('Computer', 3),
    ('Payment device', 4),
    ('Printer', 5),
    ('Peripherals', 6),
    ('Power and cabling', 7),
    ('Finishing', 8);
