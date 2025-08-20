-- Test Database Connection and Tables
-- Run this in your Supabase SQL Editor to diagnose connection issues

-- 1. Test basic connection
SELECT 'Database connection successful' as status;

-- 2. Check if feedback_settings table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'feedback_settings'
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as feedback_settings_table;

-- 3. Check if feedbacks table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'feedbacks'
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as feedbacks_table;

-- 4. Check table structure if they exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('feedback_settings', 'feedbacks')
ORDER BY table_name, ordinal_position;

-- 5. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('feedback_settings', 'feedbacks');

-- 6. Test inserting a sample record (will fail if RLS blocks it)
-- Uncomment the lines below to test insert permissions
/*
INSERT INTO feedback_settings (
    user_id,
    project_id,
    project_id_locked,
    title,
    show_name,
    show_email,
    button_text,
    theme,
    brand_color
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- Test user ID
    'test-project-123',
    false,
    'Test Settings',
    true,
    true,
    'Test Button',
    'light',
    '#2563eb'
) ON CONFLICT DO NOTHING;

-- Clean up test data
DELETE FROM feedback_settings WHERE project_id = 'test-project-123';
*/

-- 7. Check current user permissions
SELECT 
    current_user,
    current_database(),
    current_schema();

-- 8. Check if auth.users table is accessible
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'users' AND table_schema = 'auth'
        ) THEN 'EXISTS'
        ELSE 'MISSING'
    END as auth_users_table;