
-- Function to clean up expired payment sessions
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
    low_profile_code,
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
    -- Skip sessions we've already logged as expired
    SELECT 
      CAST(payment_data->>'session_id' AS uuid)
    FROM public.user_payment_logs
    WHERE status = 'payment_expired'
    AND payment_data->>'session_id' IS NOT NULL
  );
END;
$$;

-- Create function to validate payment session before processing
CREATE OR REPLACE FUNCTION public.validate_payment_session(session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_valid boolean;
BEGIN
  SELECT 
    EXISTS(
      SELECT 1 
      FROM public.payment_sessions 
      WHERE id = session_id
      AND status = 'initiated'
      AND expires_at > NOW()
    ) INTO is_valid;
    
  RETURN is_valid;
END;
$$;

-- Create function to handle duplicate payment prevention
CREATE OR REPLACE FUNCTION public.check_duplicate_payment_extended(low_profile_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if we already have a completed payment with this low profile ID
  SELECT 
    jsonb_build_object(
      'exists', true,
      'session_id', ps.id,
      'status', ps.status,
      'transaction_id', ps.transaction_id,
      'created_at', ps.created_at
    ) INTO result
  FROM public.payment_sessions ps
  WHERE ps.low_profile_code = low_profile_id
  AND ps.status = 'completed'
  LIMIT 1;
  
  -- If no completed payment found, check user_payment_logs
  IF result IS NULL THEN
    SELECT 
      jsonb_build_object(
        'exists', true,
        'token', upl.token,
        'status', upl.status,
        'transaction_id', upl.transaction_id,
        'created_at', upl.created_at
      ) INTO result
    FROM public.user_payment_logs upl
    WHERE upl.token = low_profile_id
    AND upl.status IN ('payment_success', 'token_created')
    LIMIT 1;
  END IF;
  
  -- If still no match found
  IF result IS NULL THEN
    result := jsonb_build_object('exists', false);
  END IF;
  
  RETURN result;
END;
$$;
