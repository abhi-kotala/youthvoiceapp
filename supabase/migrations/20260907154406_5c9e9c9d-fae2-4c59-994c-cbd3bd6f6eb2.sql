DROP POLICY IF EXISTS "Anyone can post comments" ON public.comments;
REVOKE INSERT ON public.comments FROM anon, authenticated;
GRANT ALL ON public.comments TO service_role;