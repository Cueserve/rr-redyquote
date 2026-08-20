CREATE TABLE public.quote_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    old_status quote_status NULL,
    new_status quote_status NOT NULL,
    changed_by uuid NOT NULL REFERENCES public.profiles(id),
    changed_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.quote_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_status_history_select_authenticated"
    ON public.quote_status_history FOR SELECT TO authenticated USING (true);

-- No INSERT/UPDATE/DELETE policies, only written by the trigger below.

-- Trigger function to log status changes (SECURITY DEFINER allows writing despite RLS)
CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.quote_status_history (quote_id, old_status, new_status, changed_by)
        VALUES (NEW.id, NULL, NEW.status, auth.uid());
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.quote_status_history (quote_id, old_status, new_status, changed_by)
            VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Attach trigger to quotes
CREATE TRIGGER log_quote_status_change
    AFTER INSERT OR UPDATE OF status
    ON public.quotes
    FOR EACH ROW
    EXECUTE FUNCTION public.log_quote_status_change();
