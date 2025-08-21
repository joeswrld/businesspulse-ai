-- Enable Real-time for Feedback System
-- Run this in your Supabase SQL Editor to ensure real-time is working

-- 1. Enable real-time for the feedbacks table
ALTER PUBLICATION supabase_realtime ADD TABLE feedbacks;

-- 2. Enable real-time for the feedback_settings table (optional, for settings updates)
ALTER PUBLICATION supabase_realtime ADD TABLE feedback_settings;

-- 3. Check current real-time configuration
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 4. Verify RLS policies allow real-time
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'feedbacks'
ORDER BY policyname;

-- 5. Check if the feedbacks table has the required columns for real-time
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'feedbacks' 
AND column_name IN ('id', 'project_id', 'timestamp')
ORDER BY column_name;