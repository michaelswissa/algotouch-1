
-- Create a storage bucket for contracts if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'contracts',
    'contracts',
    false,
    10485760, -- 10MB
    ARRAY['text/html', 'application/pdf']::text[]
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Set up RLS policies for the contracts bucket
CREATE POLICY "Users can read their own contracts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'contracts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload their own contracts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admin can access all contracts"
  ON storage.objects
  USING (
    bucket_id = 'contracts' AND
    auth.role() = 'service_role'
  );
