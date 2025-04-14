
-- Create payment_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lowprofile_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users,
  status TEXT NOT NULL,
  transaction_id TEXT,
  plan_id TEXT,
  payment_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_logs_lowprofile_id ON public.payment_logs(lowprofile_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON public.payment_logs(user_id);
