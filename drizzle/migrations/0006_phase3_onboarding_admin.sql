ALTER TABLE public.community_requests
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS org_type text,
  ADD COLUMN IF NOT EXISTS engagement_plan text,
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS submitter_device text,
  ADD COLUMN IF NOT EXISTS retention_until timestamptz NOT NULL DEFAULT (now() + interval '1 year');

ALTER TABLE public.communities
  ADD COLUMN IF NOT EXISTS verification_note text,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'));

CREATE OR REPLACE FUNCTION public.audit_log_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Audit log entries cannot be changed or deleted'; END; $$;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

-- Official status requires a verification note; signed-in non-platform-admins can never set it.
CREATE OR REPLACE FUNCTION public.guard_official_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'platform_admin') THEN
      RAISE EXCEPTION 'Only platform admins can change a city status';
    END IF;
    IF NEW.status = 'official' AND COALESCE(trim(NEW.verification_note), '') = '' THEN
      RAISE EXCEPTION 'Official Partner status needs a verification note';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER communities_guard_official BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.guard_official_status();

-- Role grants: signed-in users may never grant roles unless platform admin, and never to themselves.
CREATE OR REPLACE FUNCTION public.guard_role_grant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.has_role(auth.uid(), 'platform_admin') THEN
      RAISE EXCEPTION 'Only platform admins can grant roles';
    END IF;
    IF NEW.user_id = auth.uid() THEN
      RAISE EXCEPTION 'You cannot grant a role to yourself';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER user_roles_guard_grant BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.guard_role_grant();

-- City managers manage topics only in their own city, limited columns.
GRANT INSERT (title, description, category, community_id, city, closes_at, status, impact_status, impact_note, location_name) ON public.issues TO authenticated;
GRANT UPDATE (title, description, category, closes_at, status, impact_status, impact_note) ON public.issues TO authenticated;
CREATE POLICY "Managers create topics in their city" ON public.issues
  FOR INSERT TO authenticated
  WITH CHECK (community_id IS NOT NULL AND public.can_manage_community(auth.uid(), community_id) AND source = 'official' AND review_status = 'approved');
CREATE POLICY "Managers update their city topics" ON public.issues
  FOR UPDATE TO authenticated
  USING (community_id IS NOT NULL AND public.can_manage_community(auth.uid(), community_id))
  WITH CHECK (community_id IS NOT NULL AND public.can_manage_community(auth.uid(), community_id));

-- Retention: clear contact details on rejected / old applications.
CREATE OR REPLACE FUNCTION public.purge_expired_applications() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.community_requests
  SET contact_email = 'removed@retention.invalid', contact_name = NULL, contact_phone = NULL, submitter_device = NULL
  WHERE retention_until < now() AND status IN ('rejected','approved') AND contact_email <> 'removed@retention.invalid';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;
REVOKE EXECUTE ON FUNCTION public.purge_expired_applications() FROM PUBLIC, anon, authenticated;