-- Fix for RLS policies conflict
-- This script handles existing policies by dropping and recreating them

-- ===============================
-- 1. Drop existing policies if they exist
-- ===============================

-- Drop usage_counters policies
DROP POLICY IF EXISTS "Users can view their own usage counters" ON usage_counters;
DROP POLICY IF EXISTS "Users can insert their own usage counters" ON usage_counters;
DROP POLICY IF EXISTS "Users can update their own usage counters" ON usage_counters;

-- Drop subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;

-- ===============================
-- 2. Recreate policies
-- ===============================

-- Usage counters policies
CREATE POLICY "Users can view their own usage counters" ON usage_counters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage counters" ON usage_counters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage counters" ON usage_counters
    FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- ===============================
-- 3. Verify policies were created
-- ===============================

-- Check usage_counters policies
SELECT 
    policyname,
    CASE 
        WHEN policyname = 'Users can view their own usage counters' THEN '✓ View policy created'
        WHEN policyname = 'Users can insert their own usage counters' THEN '✓ Insert policy created'
        WHEN policyname = 'Users can update their own usage counters' THEN '✓ Update policy created'
        ELSE '✓ Policy created: ' || policyname
    END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'usage_counters';

-- Check subscriptions policies
SELECT 
    policyname,
    CASE 
        WHEN policyname = 'Users can view their own subscriptions' THEN '✓ View policy created'
        WHEN policyname = 'Users can insert their own subscriptions' THEN '✓ Insert policy created'
        WHEN policyname = 'Users can update their own subscriptions' THEN '✓ Update policy created'
        ELSE '✓ Policy created: ' || policyname
    END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'subscriptions';

-- Summary
SELECT '🎉 All RLS policies have been successfully created!' as summary;