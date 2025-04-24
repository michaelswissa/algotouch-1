
-- This migration adds the payment_details column to the payment_sessions table
-- If the column doesn't exist already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'payment_sessions'
        AND column_name = 'payment_details'
    ) THEN
        -- Add payment_details column
        ALTER TABLE public.payment_sessions ADD COLUMN payment_details JSONB DEFAULT NULL;
    END IF;
END $$;

-- Update the anonymous_data usage - stored inside payment_details instead
COMMENT ON COLUMN public.payment_sessions.payment_details IS 'Contains operation details, anonymous data for guest users, and processing results';
