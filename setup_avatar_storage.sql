-- Setup avatar storage bucket and policies for profile picture uploads

-- Create the avatars storage bucket (this needs to be done in Supabase Dashboard)
-- Go to Storage > Create a new bucket
-- Bucket name: avatars
-- Public bucket: true
-- File size limit: 5MB
-- Allowed MIME types: image/*

-- After creating the bucket, run these SQL commands to set up policies:

-- Enable Row Level Security on the storage bucket
-- This is automatically enabled when you create a bucket

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can view their own avatar
CREATE POLICY "Users can view their own avatar" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Alternative: Allow all authenticated users to view avatars (for public profiles)
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Note: The folder structure will be: avatars/{user_id}-{timestamp}.{extension}
-- This ensures each user's files are organized and secure