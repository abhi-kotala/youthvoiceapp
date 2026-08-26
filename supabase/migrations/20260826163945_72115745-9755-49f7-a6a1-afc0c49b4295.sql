SELECT cron.unschedule('youthvoice-rotate-topics') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'youthvoice-rotate-topics');
SELECT cron.unschedule('close-expired-issues') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close-expired-issues');
SELECT cron.schedule(
  'youthvoice-replace-closed-topics',
  '7 * * * *',
  $$SELECT net.http_post(
      url := 'https://youthvoiceapp.lovable.app/api/public/rotate-topics',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );$$
);