CREATE TABLE public.quote_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    category_id uuid NULL REFERENCES public.categories(id),
    component_id uuid NULL REFERENCES public.components(id),
    description text NOT NULL,
    is_misc boolean NOT NULL DEFAULT false,
    hard_cost numeric(12,2) NOT NULL DEFAULT 0,
    labor_hours numeric(6,2) NOT NULL DEFAULT 0,
    labor_cost numeric(12,2) NOT NULL DEFAULT 0,
    markup_percent numeric(5,2) NOT NULL DEFAULT 0,
    environment_mismatch boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CHECK (is_misc OR category_id IS NOT NULL)
);

CREATE UNIQUE INDEX uq_quote_lines_one_per_fixed_category
    ON public.quote_lines (quote_id, category_id)
    WHERE NOT is_misc;

-- Trigger to auto-update 'updated_at'
CREATE TRIGGER set_quote_lines_updated_at
    BEFORE UPDATE ON public.quote_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable Row Level Security
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_lines_select_authenticated"
    ON public.quote_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "quote_lines_write_owner_or_admin"
    ON public.quote_lines FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quotes q
            WHERE q.id = quote_lines.quote_id
            AND (q.owner_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "quote_lines_update_owner_or_admin"
    ON public.quote_lines FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.quotes q
            WHERE q.id = quote_lines.quote_id
            AND (q.owner_id = auth.uid() OR public.is_admin())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.quotes q
            WHERE q.id = quote_lines.quote_id
            AND (q.owner_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "quote_lines_delete_owner_or_admin"
    ON public.quote_lines FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.quotes q
            WHERE q.id = quote_lines.quote_id
            AND (q.owner_id = auth.uid() OR public.is_admin())
        )
    );
