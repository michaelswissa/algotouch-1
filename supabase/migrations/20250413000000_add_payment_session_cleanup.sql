
-- Create a function to clean up stale payment sessions
CREATE OR REPLACE FUNCTION public.cleanup_user_payment_sessions(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update all active sessions for this user to be expired
  UPDATE public.payment_sessions
  SET 
    expires_at = NOW(),
    payment_details = jsonb_set(
      COALESCE(payment_details, '{}'::jsonb),
      '{status}',
      '"expired"'
    )
  WHERE 
    user_id = user_id_param
    AND expires_at > NOW();
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.cleanup_user_payment_sessions(UUID) IS 'Cleans up all active payment sessions for a user by marking them as expired';

-- Create a function to find and check for duplicate payment attempts
CREATE OR REPLACE FUNCTION public.check_duplicate_payment(low_profile_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_exists BOOLEAN;
BEGIN
  -- Check if we have a payment with this lowProfileId
  SELECT EXISTS(
    SELECT 1 
    FROM public.user_payment_logs
    WHERE token = low_profile_id
  ) INTO payment_exists;
  
  RETURN payment_exists;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION public.check_duplicate_payment(TEXT) IS 'Checks if a payment with the given lowProfileId already exists';
