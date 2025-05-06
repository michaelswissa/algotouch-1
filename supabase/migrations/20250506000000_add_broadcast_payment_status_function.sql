
-- Function to broadcast payment status updates via Supabase Realtime
CREATE OR REPLACE FUNCTION public.broadcast_payment_status(session_id uuid, status text, plan_id text, user_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM pg_notify(
    'broadcast',
    json_build_object(
      'event', 'payment_status_update',
      'payload', json_build_object(
        'session_id', session_id,
        'status', status,
        'plan_id', plan_id,
        'user_id', user_id,
        'timestamp', now()
      ),
      'broadcast', json_build_object('level', 'session')
    )::text
  );
END;
$$ LANGUAGE plpgsql;
