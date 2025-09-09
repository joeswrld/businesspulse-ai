-- Check current database schema for email verification tracking
-- This script will help us understand the current state

-- Check auth.users table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'auth' 
AND table_name = 'users'
AND column_name IN ('email_confirmed_at', 'email_confirmed', 'confirmed_at')
ORDER BY ordinal_position;

-- Check profiles table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('email_confirmed', 'email_confirmed_at', 'confirmed_at')
ORDER BY ordinal_position;

-- Check if check_user_access function exists and its signature
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'check_user_access';

-- Check if get_user_status function exists and its signature
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_user_status';

-- Sample a few users to see their current email confirmation status
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
LIMIT 5;