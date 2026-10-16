CREATE TABLE public.community_interest_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_key text NOT NULL,
  city_name text NOT NULL,
  state_code text NOT NULL REFERENCES public.states(code),
  community_type text NOT NULL,
  reason text,
  wants_to_help boolean NOT NULL DEFAULT false,
  organization text,
  contact_email text,
  device_hash text NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','under_review','more_info','outreach','approved_pilot','official_confirmed','declined','on_hold')),
  admin_note text,
  verification_note text,
  outreach_at date,
  followup_at date,
  community_id uuid REFERENCES public.communities(id),
  pipeline_id uuid REFERENCES public.partner_pipeline(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_key, device_hash)
);
CREATE INDEX community_interest_key_idx ON public.community_interest_requests (community_key);
GRANT SELECT ON public.community_interest_requests TO authenticated;
GRANT ALL ON public.community_interest_requests TO service_role;
ALTER TABLE public.community_interest_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read interest requests" ON public.community_interest_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE TRIGGER community_interest_updated_at BEFORE UPDATE ON public.community_interest_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE FUNCTION public.guard_interest_official() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'official_confirmed' AND COALESCE(trim(NEW.verification_note),'') = '' THEN
    RAISE EXCEPTION 'Official partner confirmation needs a verification note';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.status <> 'received' THEN
    RAISE EXCEPTION 'New requests always start as received';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER community_interest_guard BEFORE INSERT OR UPDATE ON public.community_interest_requests FOR EACH ROW EXECUTE FUNCTION public.guard_interest_official();