-- NoteX Reports Storage Bucket Policies
-- Run this in your Supabase SQL Editor after creating the reports bucket

-- 1. Create the reports storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT (id) DO NOTHING;

-- 2. Enable Row Level Security on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create policy for users to upload their own reports
CREATE POLICY "Users can upload their own reports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Create policy for users to view their own reports
CREATE POLICY "Users can view their own reports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Create policy for users to update their own reports
CREATE POLICY "Users can update their own reports" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'reports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Create policy for users to delete their own reports
CREATE POLICY "Users can delete their own reports" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'reports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Success message
SELECT 'NoteX Reports storage bucket and policies created successfully!' as status;