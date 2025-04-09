
-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  payment_id UUID REFERENCES payment_history(id),
  document_type TEXT NOT NULL, -- 'invoice', 'receipt', etc.
  document_number TEXT,
  document_url TEXT,
  document_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB
);

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own documents
CREATE POLICY "Users can view their own documents" 
ON public.documents FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for the system to insert documents
CREATE POLICY "System can insert documents" 
ON public.documents FOR INSERT 
WITH CHECK (true);
