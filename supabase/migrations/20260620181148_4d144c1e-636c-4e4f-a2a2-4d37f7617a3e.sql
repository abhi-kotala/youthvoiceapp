
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  fcm_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX push_subscriptions_device_id_idx ON public.push_subscriptions(device_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO anon, authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can register a token" ON public.push_subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update their token row" ON public.push_subscriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
