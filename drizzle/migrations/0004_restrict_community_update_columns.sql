REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.communities FROM anon, authenticated;
GRANT UPDATE (description, resources) ON public.communities TO authenticated;
UPDATE public.communities SET status = 'pilot', approved_at = NULL, approved_by = NULL WHERE slug = 'west-fargo' AND status = 'official';
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['issues','votes','comments','community_recipients','community_requests','topic_drafts','ai_usage_log','user_roles','states'] LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;