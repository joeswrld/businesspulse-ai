-- Check what tables actually exist in your database
-- Run this first to see what we're working with

-- Check all tables in the public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check for any tables with 'insight' in the name
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name LIKE '%insight%'
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

-- Check for any tables with 'feedback' in the name
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name LIKE '%feedback%'
ORDER BY table_name, ordinal_position;

-- Check for any tables with 'report' in the name
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name LIKE '%report%'
ORDER BY table_name, ordinal_position;

-- Get a sample user ID from auth.users (if it exists)
SELECT id, email FROM auth.users LIMIT 1;