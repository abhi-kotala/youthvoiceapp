ALTER TABLE public.communities DROP CONSTRAINT communities_status_check;
ALTER TABLE public.communities ADD CONSTRAINT communities_status_check CHECK (status = ANY (ARRAY['draft','pending','listed','pilot','official','paused']));
COMMENT ON COLUMN public.communities.status IS 'draft/paused hidden; listed = Not Yet Participating; pending = Pending Approval; pilot = testing; official = verified partner';
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS resources jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS zip_codes text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.is_public_community(_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.communities WHERE id = _id AND status IN ('listed','pending','pilot','official'))
$$;

DROP POLICY "Anyone can read public communities" ON public.communities;
CREATE POLICY "Anyone can read public communities" ON public.communities FOR SELECT TO anon, authenticated
  USING (status IN ('listed','pending','pilot','official'));

GRANT UPDATE (description, resources) ON public.communities TO authenticated;
CREATE POLICY "Managers update their community info" ON public.communities FOR UPDATE TO authenticated
  USING (public.can_manage_community(auth.uid(), id)) WITH CHECK (public.can_manage_community(auth.uid(), id));

DROP POLICY "Anyone can read approved issues" ON public.issues;
CREATE POLICY "Anyone can read approved issues" ON public.issues FOR SELECT TO anon, authenticated
  USING (((source = 'official') OR (review_status = 'approved')) AND (community_id IS NULL OR public.is_public_community(community_id)));
CREATE POLICY "Managers read their community issues" ON public.issues FOR SELECT TO authenticated
  USING (community_id IS NOT NULL AND public.can_manage_community(auth.uid(), community_id));