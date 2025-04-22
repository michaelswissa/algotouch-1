
-- Update the payment_sessions table
ALTER TABLE public.payment_sessions
ADD COLUMN IF NOT EXISTS operation_type TEXT DEFAULT 'payment',
ADD COLUMN IF NOT EXISTS initial_next_charge_date TIMESTAMPTZ;

-- Update the subscriptions table to support monthly subscription with delayed first charge
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS payment_token TEXT,
ADD COLUMN IF NOT EXISTS next_charge_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_payment_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_failures INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT;
