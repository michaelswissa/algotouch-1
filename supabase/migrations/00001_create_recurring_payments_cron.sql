
-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Set up a daily job to process recurring payments
SELECT cron.schedule(
  'process-recurring-payments',
  '0 3 * * *', -- Run at 3:00 AM every day
  $$
  SELECT
    net.http_post(
      url:='https://ndhakvhrrkczgylcmyoc.supabase.co/functions/v1/cardcom-recurring',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase_functions.service_role_key') || '"}'::jsonb,
      body:='{"action": "process_due"}'::jsonb
    ) AS request_id;
  $$
);

-- Set up a job to clean up expired payment sessions
SELECT cron.schedule(
  'cleanup-expired-payments',
  '0 */2 * * *', -- Run every 2 hours
  $$
  SELECT public.cleanup_expired_payment_sessions();
  $$
);
