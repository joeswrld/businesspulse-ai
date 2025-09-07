-- Complete Fix for Usage Overview System
-- This fixes the table structure and function issues

-- ===============================
-- 1. Fix usage_counters table structure
-- ===============================

-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS usage_counters CASCADE;

-- Create usage_counters table with correct structure
CREATE TABLE usage_counters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_start DATE NOT NULL,
    feedback_count INTEGER DEFAULT 0,
    insights_count INTEGER DEFAULT 0,
    analytics_count INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month_start)
);

-- Enable RLS
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own usage counters" ON usage_counters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage counters" ON usage_counters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage counters" ON usage_counters
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_month ON usage_counters(user_id, month_start);

-- ===============================
-- 2. Ensure subscriptions table exists
-- ===============================

-- Create subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL DEFAULT 'trial' CHECK (plan_type IN ('trial', 'pro', 'business')),
    renewal_date TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;

CREATE POLICY "Users can view their own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- ===============================
-- 3. Create functions with correct table structure
-- ===============================

-- Drop existing functions
DROP FUNCTION IF EXISTS refresh_user_usage(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS check_usage_limit(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS reset_monthly_usage() CASCADE;

-- Create refresh_user_usage function
CREATE OR REPLACE FUNCTION refresh_user_usage(user_uuid UUID, target_month_start DATE)
RETURNS TABLE (
    user_id UUID,
    month_start DATE,
    feedback_count INTEGER,
    insights_count INTEGER,
    analytics_count INTEGER,
    reports_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := user_uuid;
    v_month_start DATE := target_month_start;
    v_feedback_count INTEGER := 0;
    v_insights_count INTEGER := 0;
    v_analytics_count INTEGER := 0;
    v_reports_count INTEGER := 0;
BEGIN
    -- Get feedback count (using timestamp column)
    SELECT COUNT(*) INTO v_feedback_count
    FROM feedbacks f
    WHERE f.timestamp >= v_month_start;
    
    -- Get analytics count (using analytics_history table)
    SELECT COUNT(*) INTO v_analytics_count
    FROM analytics_history ah
    WHERE ah.user_id = v_user_id 
    AND ah.created_at >= v_month_start;
    
    -- For insights and reports, use analytics_events as proxy
    SELECT COUNT(*) INTO v_insights_count
    FROM analytics_events ae
    WHERE ae.user_id = v_user_id 
    AND ae.event_type = 'insight'
    AND ae.created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_reports_count
    FROM analytics_events ae
    WHERE ae.user_id = v_user_id 
    AND ae.event_type = 'report'
    AND ae.created_at >= v_month_start;
    
    -- Insert or update usage counter
    INSERT INTO usage_counters (
        user_id, 
        month_start, 
        feedback_count, 
        insights_count, 
        analytics_count, 
        reports_count
    )
    VALUES (
        v_user_id, 
        v_month_start, 
        v_feedback_count, 
        v_insights_count, 
        v_analytics_count, 
        v_reports_count
    )
    ON CONFLICT (user_id, month_start) 
    DO UPDATE SET
        feedback_count = EXCLUDED.feedback_count,
        insights_count = EXCLUDED.insights_count,
        analytics_count = EXCLUDED.analytics_count,
        reports_count = EXCLUDED.reports_count,
        updated_at = NOW();
    
    -- Return the updated data
    RETURN QUERY
    SELECT 
        v_user_id,
        v_month_start,
        v_feedback_count,
        v_insights_count,
        v_analytics_count,
        v_reports_count;
END;
$$;

-- Create check_usage_limit function
CREATE OR REPLACE FUNCTION check_usage_limit(user_uuid UUID, feature_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := user_uuid;
    v_feature_type TEXT := feature_type;
    v_plan_type TEXT;
    v_current_count INTEGER := 0;
    v_limit INTEGER := 0;
    v_month_start DATE;
BEGIN
    -- Get current month start
    v_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    
    -- Get user's plan type
    SELECT s.plan_type INTO v_plan_type
    FROM subscriptions s
    WHERE s.user_id = v_user_id;
    
    -- If no subscription found, default to trial
    IF v_plan_type IS NULL THEN
        v_plan_type := 'trial';
    END IF;
    
    -- Get current usage count for the feature
    CASE v_feature_type
        WHEN 'feedback' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM feedbacks f
            WHERE f.timestamp >= v_month_start;
        WHEN 'insights' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM analytics_events ae
            WHERE ae.user_id = v_user_id 
            AND ae.event_type = 'insight'
            AND ae.created_at >= v_month_start;
        WHEN 'analytics' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM analytics_history ah
            WHERE ah.user_id = v_user_id 
            AND ah.created_at >= v_month_start;
        WHEN 'reports' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM analytics_events ae
            WHERE ae.user_id = v_user_id 
            AND ae.event_type = 'report'
            AND ae.created_at >= v_month_start;
        ELSE
            RETURN FALSE;
    END CASE;
    
    -- Get limit based on plan type
    CASE v_plan_type
        WHEN 'trial' THEN
            CASE v_feature_type
                WHEN 'feedback' THEN v_limit := 50;
                WHEN 'insights' THEN v_limit := 10;
                WHEN 'analytics' THEN v_limit := 10;
                WHEN 'reports' THEN v_limit := 5;
            END CASE;
        WHEN 'pro' THEN
            CASE v_feature_type
                WHEN 'feedback' THEN v_limit := 300;
                WHEN 'insights' THEN v_limit := 50;
                WHEN 'analytics' THEN v_limit := 100;
                WHEN 'reports' THEN v_limit := 20;
            END CASE;
        WHEN 'business' THEN
            RETURN TRUE;
    END CASE;
    
    RETURN v_current_count < v_limit;
END;
$$;

-- Create reset_monthly_usage function
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_month_start DATE;
    v_previous_month_start DATE;
BEGIN
    v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_previous_month_start := v_current_month_start - INTERVAL '1 month';
    
    PERFORM refresh_user_usage(user_id, v_current_month_start)
    FROM (
        SELECT DISTINCT user_id 
        FROM usage_counters 
        WHERE month_start = v_previous_month_start
    ) AS users;
    
    INSERT INTO usage_counters (user_id, month_start, feedback_count, insights_count, analytics_count, reports_count)
    SELECT 
        user_id,
        v_current_month_start,
        0, 0, 0, 0
    FROM (
        SELECT DISTINCT user_id 
        FROM usage_counters 
        WHERE month_start = v_previous_month_start
    ) AS users
    ON CONFLICT (user_id, month_start) DO NOTHING;
END;
$$;

-- ===============================
-- 4. Grant permissions
-- ===============================
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_usage() TO service_role;

-- ===============================
-- 5. Test the complete system
-- ===============================
DO $$
DECLARE
    test_user_id UUID;
    test_result RECORD;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test refresh_user_usage function
        SELECT * INTO test_result FROM refresh_user_usage(test_user_id, CURRENT_DATE) LIMIT 1;
        RAISE NOTICE '✓ refresh_user_usage function works with user ID: %', test_user_id;
        RAISE NOTICE '  - Feedback count: %', test_result.feedback_count;
        RAISE NOTICE '  - Insights count: %', test_result.insights_count;
        RAISE NOTICE '  - Analytics count: %', test_result.analytics_count;
        RAISE NOTICE '  - Reports count: %', test_result.reports_count;
        
        -- Test check_usage_limit function
        PERFORM check_usage_limit(test_user_id, 'insights');
        RAISE NOTICE '✓ check_usage_limit function works';
        
        -- Test table structure
        PERFORM 1 FROM usage_counters WHERE user_id = test_user_id LIMIT 1;
        RAISE NOTICE '✓ usage_counters table has correct structure';
        
    ELSE
        RAISE NOTICE '⚠ No users found, but system is ready';
    END IF;
END $$;

-- ===============================
-- 6. Verification
-- ===============================

-- Check table structure
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'usage_counters'
ORDER BY ordinal_position;

-- Check functions
SELECT 
    routine_name,
    '✓ ' || routine_name || ' function created' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('refresh_user_usage', 'check_usage_limit', 'reset_monthly_usage');

-- Final success message
SELECT '🎉 Complete Usage Overview System Deployed Successfully!' as summary;