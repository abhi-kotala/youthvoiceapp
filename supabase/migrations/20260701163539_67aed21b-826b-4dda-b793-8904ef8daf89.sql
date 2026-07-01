-- Hide device_id column from public reads
REVOKE SELECT (device_id) ON public.votes FROM anon, authenticated;
REVOKE SELECT (device_id) ON public.comments FROM anon, authenticated;

-- Remove overly-permissive anon vote write policies; all vote writes now go through a server function using service_role
DROP POLICY IF EXISTS "Anyone can cast a vote" ON public.votes;
DROP POLICY IF EXISTS "Anyone can update votes" ON public.votes;