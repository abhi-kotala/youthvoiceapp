CREATE TABLE public.impact_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  action TEXT NOT NULL,
  points INT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX impact_events_unique_award
  ON public.impact_events (device_id, action, COALESCE(ref_type,''), COALESCE(ref_id,''));

CREATE INDEX impact_events_device_idx ON public.impact_events (device_id);

GRANT ALL ON public.impact_events TO service_role;

ALTER TABLE public.impact_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to impact_events"
  ON public.impact_events FOR SELECT
  USING (false);