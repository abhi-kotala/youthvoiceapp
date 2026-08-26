
CREATE POLICY "No direct client access to admin_sessions" ON public.admin_sessions
  FOR SELECT USING (false);
CREATE POLICY "No direct client access to push_subscriptions" ON public.push_subscriptions
  FOR SELECT USING (false);
