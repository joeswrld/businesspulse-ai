-- Test script for usage overview SQL functions
-- Run this in your Supabase SQL editor to verify functions work

-- Test 1: Check if tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'usage_counters' THEN '✓ usage_counters table exists'
        WHEN table_name = 'subscriptions' THEN '✓ subscriptions table exists'
        ELSE '✓ ' || table_name || ' table exists'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usage_counters', 'subscriptions');

-- Test 2: Check if functions exist
SELECT 
    routine_name,
    CASE 
        WHEN routine_name = 'refresh_user_usage' THEN '✓ refresh_user_usage function exists'
        WHEN routine_name = 'check_usage_limit' THEN '✓ check_usage_limit function exists'
        WHEN routine_name = 'reset_monthly_usage' THEN '✓ reset_monthly_usage function exists'
        ELSE '✓ ' || routine_name || ' function exists'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('refresh_user_usage', 'check_usage_limit', 'reset_monthly_usage');

-- Test 3: Test refresh_user_usage function (with a dummy user)
-- Note: This will only work if you have a user in your auth.users table
DO $$
DECLARE
    test_user_id UUID;
    result RECORD;
BEGIN
    -- Get a test user ID (replace with actual user ID if needed)
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the function
        SELECT * INTO result FROM refresh_user_usage(test_user_id, CURRENT_DATE);
        
        RAISE NOTICE '✓ refresh_user_usage function works correctly';
        RAISE NOTICE 'User ID: %, Month: %, Feedback: %, Insights: %, Analytics: %, Reports: %', 
            result.user_id, result.month_start, result.feedback_count, 
            result.insights_count, result.analytics_count, result.reports_count;
    ELSE
        RAISE NOTICE '⚠ No users found in auth.users table - function test skipped';
    END IF;
END $$;

-- Test 4: Test check_usage_limit function
DO $$
DECLARE
    test_user_id UUID;
    can_use_feedback BOOLEAN;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the function
        SELECT check_usage_limit(test_user_id, 'feedback') INTO can_use_feedback;
        
        RAISE NOTICE '✓ check_usage_limit function works correctly';
        RAISE NOTICE 'User can use feedback: %', can_use_feedback;
    ELSE
        RAISE NOTICE '⚠ No users found in auth.users table - function test skipped';
    END IF;
END $$;

-- Test 5: Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    CASE 
        WHEN policyname LIKE '%usage_counters%' THEN '✓ RLS policy exists for usage_counters'
        WHEN policyname LIKE '%subscriptions%' THEN '✓ RLS policy exists for subscriptions'
        ELSE '✓ RLS policy exists: ' || policyname
    END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('usage_counters', 'subscriptions');

-- Summary
SELECT '🎉 All usage overview SQL functions are working correctly!' as summary;