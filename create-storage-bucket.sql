-- Create business-logos storage bucket and policies
-- This script sets up the storage bucket for business logo uploads

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy for users to upload their own logos
CREATE POLICY IF NOT EXISTS "Users can upload their own business logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'business-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to view their own logos
CREATE POLICY IF NOT EXISTS "Users can view their own business logos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'business-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to update their own logos
CREATE POLICY IF NOT EXISTS "Users can update their own business logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'business-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for users to delete their own logos
CREATE POLICY IF NOT EXISTS "Users can delete their own business logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'business-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for public access to view logos (for feedback forms)
CREATE POLICY IF NOT EXISTS "Public can view business logos" ON storage.objects
FOR SELECT USING (bucket_id = 'business-logos');