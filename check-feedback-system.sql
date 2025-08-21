-- Check Feedback System Status
-- Run this in your Supabase SQL Editor to diagnose issues

-- 1. Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('feedback_settings', 'feedbacks')
ORDER BY table_name;

-- 2. Check table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('feedback_settings', 'feedbacks')
ORDER BY table_name, ordinal_position;

-- 3. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('feedback_settings', 'feedbacks')
ORDER BY tablename, policyname;

-- 4. Check current data
SELECT 
    'feedback_settings' as table_name,
    COUNT(*) as row_count
FROM feedback_settings
UNION ALL
SELECT 
    'feedbacks' as table_name,
    COUNT(*) as row_count
FROM feedbacks;

-- 5. Check sample feedback_settings data
SELECT 
    id,
    user_id,
    project_id,
    project_id_locked,
    title,
    created_at
FROM feedback_settings 
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Check sample feedbacks data
SELECT 
    id,
    project_id,
    name,
    email,
    message,
    status,
    timestamp
FROM feedbacks 
ORDER BY timestamp DESC 
LIMIT 5;

-- 7. Check indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('feedback_settings', 'feedbacks')
ORDER BY tablename, indexname;

-- 8. Check constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('feedback_settings', 'feedbacks')
ORDER BY tc.table_name, tc.constraint_name;