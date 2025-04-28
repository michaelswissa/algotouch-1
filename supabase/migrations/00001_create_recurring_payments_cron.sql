
-- Enable required extensions if not already enabled
-- NOTE: pg_cron and pg_net are commented out as they are not supported in the current environment
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- NOTE: The following cron jobs are commented out as they require pg_cron which is not supported
-- They are kept here for documentation purposes and future implementation

/*
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
*/

-- Instead, we'll create the function that can be called manually or by an external scheduler
CREATE OR REPLACE FUNCTION public.process_recurring_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Logic for processing recurring payments
  -- This can be called by an external scheduler or manually
  -- Implementation details would go here
  NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_payment_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark expired sessions as 'expired'
  UPDATE public.payment_sessions
  SET status = 'expired'
  WHERE expires_at < NOW()
  AND status = 'initiated';

  -- Log the expiration
  INSERT INTO public.user_payment_logs (
    user_id,
    token,
    amount,
    status,
    payment_data
  )
  SELECT 
    user_id,
    low_profile_id,
    amount,
    'payment_expired',
    jsonb_build_object(
      'expired_at', NOW(),
      'session_id', id
    )
  FROM public.payment_sessions
  WHERE expires_at < NOW() - INTERVAL '5 minutes'
  AND status = 'expired'
  AND id NOT IN (
    SELECT 
      CAST(payment_data->>'session_id' AS uuid)
    FROM public.user_payment_logs
    WHERE status = 'payment_expired'
    AND payment_data->>'session_id' IS NOT NULL
  );
END;
$$;
