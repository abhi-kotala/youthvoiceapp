DROP POLICY IF EXISTS "Anyone can register a token" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can update their token row" ON public.push_subscriptions;
REVOKE INSERT, UPDATE, DELETE, SELECT ON public.push_subscriptions FROM anon, authenticated;
-- Registration and reads happen exclusively through server functions using service_role.