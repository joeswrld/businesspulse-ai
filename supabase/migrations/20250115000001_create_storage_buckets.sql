-- Create storage buckets for reports and data files

-- Create reports bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for reports bucket
CREATE POLICY "Users can upload their own reports"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own reports"
ON storage.objects
FOR SELECT
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own reports"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own reports"
ON storage.objects
FOR DELETE
USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Ensure data-files bucket exists and has proper policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('data-files', 'data-files', false)
ON CONFLICT (id) DO NOTHING;

-- Update data-files policies to be more permissive for processing
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'data-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'data-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'data-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'data-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow service role to access all files for processing
CREATE POLICY "Service role can access all files"
ON storage.objects
FOR ALL
USING (auth.role() = 'service_role');