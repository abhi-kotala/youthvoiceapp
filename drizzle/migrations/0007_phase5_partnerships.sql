CREATE TABLE public.partner_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id),
  request_id uuid REFERENCES public.community_requests(id),
  name text NOT NULL,
  org_type text NOT NULL DEFAULT 'other',
  state_code text REFERENCES public.states(code),
  verified boolean NOT NULL DEFAULT false,
  verification_note text,
  verified_by uuid,
  verified_at timestamptz,
  public_listing boolean NOT NULL DEFAULT false,
  public_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_organizations TO anon, authenticated;
GRANT ALL ON public.partner_organizations TO service_role;
ALTER TABLE public.partner_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads verified listed partners" ON public.partner_organizations FOR SELECT TO anon, authenticated USING (verified AND public_listing);
CREATE POLICY "Admins read partners" ON public.partner_organizations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'platform_admin'));

CREATE TABLE public.partner_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid UNIQUE REFERENCES public.community_requests(id),
  community_id uuid REFERENCES public.communities(id),
  coordinator text,
  last_contact_at date,
  next_followup_at date,
  notes text,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_pipeline TO authenticated;
GRANT ALL ON public.partner_pipeline TO service_role;
ALTER TABLE public.partner_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read pipeline" ON public.partner_pipeline FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'platform_admin'));

CREATE TABLE public.onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.partner_pipeline(id) ON DELETE CASCADE,
  step_no integer NOT NULL CHECK (step_no BETWEEN 1 AND 10),
  done_by uuid,
  done_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pipeline_id, step_no)
);
GRANT SELECT ON public.onboarding_steps TO authenticated;
GRANT ALL ON public.onboarding_steps TO service_role;
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and own managers read steps" ON public.onboarding_steps FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'platform_admin') OR EXISTS (SELECT 1 FROM public.partner_pipeline p WHERE p.id = pipeline_id AND p.community_id IS NOT NULL AND public.can_manage_community(auth.uid(), p.community_id)));

CREATE TABLE public.outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  summary text NOT NULL,
  contacted_on date NOT NULL DEFAULT current_date,
  next_followup_at date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.outreach_log TO authenticated;
GRANT ALL ON public.outreach_log TO service_role;
ALTER TABLE public.outreach_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read outreach" ON public.outreach_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'platform_admin'));

CREATE TABLE public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organization text NOT NULL,
  email text NOT NULL,
  state_code text,
  message text,
  status text NOT NULL DEFAULT 'new',
  submitter_device text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_requests TO authenticated;
GRANT ALL ON public.demo_requests TO service_role;
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read demo requests" ON public.demo_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'platform_admin'));

CREATE TABLE public.impact_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id),
  issue_id uuid REFERENCES public.issues(id) ON DELETE SET NULL,
  occurred_on date NOT NULL,
  description text NOT NULL,
  evidence_url text,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','in_progress','completed','verified')),
  public boolean NOT NULL DEFAULT false,
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.impact_records TO anon, authenticated;
GRANT INSERT (community_id, issue_id, occurred_on, description, evidence_url, status, created_by) ON public.impact_records TO authenticated;
GRANT ALL ON public.impact_records TO service_role;
ALTER TABLE public.impact_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published impact" ON public.impact_records FOR SELECT TO anon, authenticated USING (public AND reviewed_by IS NOT NULL AND public.is_public_community(community_id));
CREATE POLICY "Managers read own impact" ON public.impact_records FOR SELECT TO authenticated USING (public.can_manage_community(auth.uid(), community_id));
CREATE POLICY "Managers add own impact" ON public.impact_records FOR INSERT TO authenticated WITH CHECK (public.can_manage_community(auth.uid(), community_id) AND status <> 'verified' AND created_by = auth.uid());

CREATE TABLE public.toolkit_pages (
  slug text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.toolkit_pages TO anon, authenticated;
GRANT ALL ON public.toolkit_pages TO service_role;
ALTER TABLE public.toolkit_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads toolkit" ON public.toolkit_pages FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.program_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pilot_target integer NOT NULL DEFAULT 5,
  pilot_start date NOT NULL DEFAULT current_date,
  pilot_end date NOT NULL DEFAULT (current_date + 180)
);
GRANT SELECT ON public.program_settings TO authenticated;
GRANT ALL ON public.program_settings TO service_role;
ALTER TABLE public.program_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read settings" ON public.program_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'platform_admin'));
INSERT INTO public.program_settings (id) VALUES (1);

CREATE OR REPLACE FUNCTION public.guard_partner_verify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.verified AND COALESCE(trim(NEW.verification_note),'') = '' THEN
    RAISE EXCEPTION 'Verifying a partner needs a verification note';
  END IF;
  IF NEW.public_listing AND NOT NEW.verified THEN
    RAISE EXCEPTION 'Only verified partners can be listed publicly';
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'platform_admin') THEN
    RAISE EXCEPTION 'Only platform admins can change partners';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER partner_verify_guard BEFORE INSERT OR UPDATE ON public.partner_organizations FOR EACH ROW EXECUTE FUNCTION public.guard_partner_verify();