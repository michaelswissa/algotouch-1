
-- Enable the pg_net extension for making HTTP requests from the database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to handle payment status changes
CREATE OR REPLACE FUNCTION public.handle_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  notification_data JSONB;
BEGIN
  -- Get the user's email from the profiles table
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  
  -- Only send notifications when we have a meaningful status change
  IF NEW.status != OLD.status AND user_email IS NOT NULL THEN
    -- Prepare notification data
    notification_data = jsonb_build_object(
      'user_id', NEW.user_id,
      'payment_id', NEW.id,
      'status', NEW.status,
      'email', user_email,
      'plan_id', NEW.plan_id,
      'timestamp', CURRENT_TIMESTAMP
    );

    -- Send status change to webhooks endpoint
    -- This uses the Edge Function we'll create next
    PERFORM net.http_post(
      url := CONCAT(current_setting('app.settings.backend_url'), '/functions/v1/payment-notifications'),
      body := notification_data::TEXT,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', CONCAT('Bearer ', current_setting('app.settings.anon_key'))
      )
    );
    
    -- Log the webhook event in a separate table for monitoring
    INSERT INTO public.webhook_events (
      source_table,
      source_id,
      event_type,
      event_data
    ) VALUES (
      'payment_sessions',
      NEW.id,
      'status_change',
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'user_id', NEW.user_id,
        'plan_id', NEW.plan_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create a table to track webhook events
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS webhook_events_processed_idx ON public.webhook_events (processed);

-- Add trigger to payment_sessions table
DROP TRIGGER IF EXISTS on_payment_status_change ON public.payment_sessions;

CREATE TRIGGER on_payment_status_change
  AFTER UPDATE OF status ON public.payment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_status_change();

-- Set application variables needed by the webhook function
DO $$
BEGIN
  -- Try to set the app settings if they don't exist
  BEGIN
    ALTER DATABASE postgres SET app.settings.backend_url = 'https://ndhakvhrrkczgylcmyoc.supabase.co';
    ALTER DATABASE postgres SET app.settings.anon_key = current_setting('supabase_anon_key');
  EXCEPTION WHEN OTHERS THEN
    -- Settings may already exist or may be restricted
    RAISE NOTICE 'Could not set app settings: %', SQLERRM;
  END;
END $$;

-- Add enabling publication for realtime subscription
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_sessions;

-- Set full replica identity to ensure we get old and new values in change events
ALTER TABLE public.payment_sessions REPLICA IDENTITY FULL;
