CREATE OR REPLACE FUNCTION public.issues_set_community()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.community_id IS NULL THEN
    SELECT id INTO NEW.community_id FROM public.communities WHERE legacy_city = NEW.city;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER issues_set_community_trg BEFORE INSERT OR UPDATE OF city ON public.issues
FOR EACH ROW EXECUTE FUNCTION public.issues_set_community();