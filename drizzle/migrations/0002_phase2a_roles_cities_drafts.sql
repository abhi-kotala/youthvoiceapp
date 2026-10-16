CREATE TYPE public.app_role AS ENUM ('platform_admin','community_admin','partner','official');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_roles_unique ON public.user_roles (user_id, role, COALESCE(community_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.can_manage_community(_user_id uuid, _community_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = 'platform_admin' OR (role IN ('community_admin','partner') AND community_id = _community_id))
  )
$$;

CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Communities: lifecycle + per-city settings
ALTER TABLE public.communities
  ADD COLUMN approved_by text,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN ai_topics_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN min_votes_for_results integer NOT NULL DEFAULT 10,
  ADD COLUMN topic_run_days integer NOT NULL DEFAULT 45;
UPDATE public.communities SET status = 'pilot' WHERE status = 'active';
ALTER TABLE public.communities ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.communities ADD CONSTRAINT communities_status_check CHECK (status IN ('draft','pending','pilot','official','paused'));
DROP POLICY "Anyone can read active communities" ON public.communities;
CREATE POLICY "Anyone can read public communities" ON public.communities FOR SELECT TO anon, authenticated USING (status IN ('pilot','official'));
CREATE POLICY "Managers can read their communities" ON public.communities FOR SELECT TO authenticated USING (public.can_manage_community(auth.uid(), id));

CREATE POLICY "Managers read their recipients" ON public.community_recipients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin') OR (community_id IS NOT NULL AND public.can_manage_community(auth.uid(), community_id)));
GRANT SELECT ON public.community_recipients TO authenticated;

-- City requests
CREATE TABLE public.community_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,
  state_code text NOT NULL REFERENCES public.states(code),
  requester_role text NOT NULL DEFAULT 'student',
  organization text,
  contact_email text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT ON public.community_requests TO authenticated;
GRANT ALL ON public.community_requests TO service_role;
ALTER TABLE public.community_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read requests" ON public.community_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'platform_admin'));

-- AI drafts + usage
CREATE TABLE public.topic_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Community',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','discarded')),
  published_issue_id uuid REFERENCES public.issues(id) ON DELETE SET NULL,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.topic_drafts TO authenticated;
GRANT ALL ON public.topic_drafts TO service_role;
ALTER TABLE public.topic_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read their drafts" ON public.topic_drafts FOR SELECT TO authenticated USING (public.can_manage_community(auth.uid(), community_id));

CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  feature text NOT NULL,
  model text,
  drafts_created integer NOT NULL DEFAULT 0,
  prompt_tokens integer,
  completion_tokens integer,
  est_cost_usd numeric(10,5) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_usage_log TO authenticated;
GRANT ALL ON public.ai_usage_log TO service_role;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read AI usage" ON public.ai_usage_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'platform_admin'));

-- 13+ account requirement, enforced at signup
CREATE OR REPLACE FUNCTION public.enforce_account_age()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.raw_user_meta_data->>'age_13_confirmed','') <> 'true' THEN
    RAISE EXCEPTION 'You must be 13 or older to create a YouthVoice account.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER enforce_account_age_trg BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_account_age();