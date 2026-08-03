/*
# Fix set_updated_at search_path

Locks the set_updated_at trigger function to a fixed search_path so it is not
affected by role-mutable search path. This is a security hardening fix flagged
by the database linter; no data or behavior changes.
*/

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;
