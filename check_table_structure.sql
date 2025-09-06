-- Diagnostic script to check actual table structure
-- Run this in your Supabase SQL editor to see what tables and columns exist

-- Check if tables exist and their structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('feedbacks', 'insights', 'insights_simple', 'analytics', 'analytics_history', 'analytics_events', 'reports')
ORDER BY table_name, ordinal_position;

-- Check for any tables with 'insights' in the name
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name LIKE '%insights%'
ORDER BY table_name, ordinal_position;

-- Check for any tables with 'analytics' in the name
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name LIKE '%analytics%'
ORDER BY table_name, ordinal_position;

-- Check for any tables with 'reports' in the name
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name LIKE '%reports%'
ORDER BY table_name, ordinal_position;

-- Check for any tables with 'feedback' in the name
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name LIKE '%feedback%'
ORDER BY table_name, ordinal_position;