ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS closes_at TIMESTAMPTZ;

UPDATE public.issues
SET closes_at = now() + interval '30 days'
WHERE closes_at IS NULL AND status = 'open';

CREATE OR REPLACE FUNCTION public.close_expired_issues()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.issues
  SET status = 'closed'
  WHERE status = 'open' AND closes_at IS NOT NULL AND closes_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.close_expired_issues() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_expired_issues() TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('close-expired-issues') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close-expired-issues');
SELECT cron.schedule('close-expired-issues', '7 * * * *', $$SELECT public.close_expired_issues();$$);

SELECT cron.unschedule('youthvoice-rotate-topics') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'youthvoice-rotate-topics');
SELECT cron.schedule(
  'youthvoice-rotate-topics',
  '0 13 * * 1',
  $$SELECT net.http_post(
      url := 'https://youthvoiceapp.lovable.app/api/public/rotate-topics',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );$$
);