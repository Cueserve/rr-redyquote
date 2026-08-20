CREATE TABLE public.quote_number_sequences (
    year smallint PRIMARY KEY,
    last_number integer NOT NULL DEFAULT 0
);

-- RLS: On, but with zero policies so no client can reach the counter directly.
ALTER TABLE public.quote_number_sequences ENABLE ROW LEVEL SECURITY;

-- No policies = deny all (even SELECT) for authenticated/anon roles.
-- The RPC below uses SECURITY DEFINER to bypass RLS.

-- RPC function to atomically increment and return the next quote number
CREATE OR REPLACE FUNCTION public.fn_next_quote_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_year smallint;
    next_num integer;
    formatted_num text;
BEGIN
    current_year := extract(year from now())::smallint;

    -- Upsert the row for the current year, incrementing the counter atomically
    INSERT INTO public.quote_number_sequences (year, last_number)
    VALUES (current_year, 1)
    ON CONFLICT (year) DO UPDATE
    SET last_number = public.quote_number_sequences.last_number + 1
    RETURNING last_number INTO next_num;

    -- Format to Q-YYYY-NNNN (e.g., Q-2026-0001)
    formatted_num := 'Q-' || current_year::text || '-' || lpad(next_num::text, 4, '0');
    
    RETURN formatted_num;
END;
$$;
