-- Test script to check subscription data
-- This will help us see what's actually in the subscriptions table

-- Check if subscriptions table exists and has data
SELECT 
    'Table exists' as status,
    COUNT(*) as total_records
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'subscriptions';

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- Check if there are any subscriptions
SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN plan_type = 'trial' THEN 1 END) as trial_count,
    COUNT(CASE WHEN plan_type = 'pro' THEN 1 END) as pro_count,
    COUNT(CASE WHEN plan_type = 'business' THEN 1 END) as business_count
FROM subscriptions;

-- Show sample subscription data (if any exists)
SELECT 
    user_id,
    plan_type,
    renewal_date,
    trial_start,
    trial_end,
    is_active,
    created_at
FROM subscriptions 
LIMIT 5;

-- Check if there are any users in auth.users
SELECT 
    COUNT(*) as total_users,
    'Users in auth.users table' as description
FROM auth.users;

-- Show sample user data
SELECT 
    id,
    email,
    created_at
FROM auth.users 
LIMIT 3;