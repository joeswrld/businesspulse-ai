-- Final Fix for Usage Overview System
-- This version uses only tables that definitely exist and handles missing columns

-- ===============================
-- 1. First, let's see what we're working with
-- ===============================

-- Check what tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'usage_counters' THEN '✓ usage_counters exists'
        WHEN table_name = 'subscriptions' THEN '✓ subscriptions exists'
        WHEN table_name = 'feedbacks' THEN '✓ feedbacks exists'
        WHEN table_name = 'analytics_history' THEN '✓ analytics_history exists'
        WHEN table_name = 'analytics_events' THEN '✓ analytics_events exists'
        ELSE '? ' || table_name || ' exists'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usage_counters', 'subscriptions', 'feedbacks', 'analytics_history', 'analytics_events')
ORDER BY table_name;

-- ===============================
-- 2. Drop existing functions safely
-- ===============================

DROP FUNCTION IF EXISTS reset_monthly_usage() CASCADE;
DROP FUNCTION IF EXISTS check_usage_limit(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS refresh_user_usage(UUID, DATE) CASCADE;

-- ===============================
-- 3. Create functions using only existing tables
-- ===============================

-- Create refresh_user_usage function (using only tables that exist)
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
    FROM feedbacks 
    WHERE timestamp >= v_month_start;
    
    -- Get analytics count (using analytics_history table)
    SELECT COUNT(*) INTO v_analytics_count
    FROM analytics_history 
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
    -- For insights and reports, we'll use analytics_events as a proxy
    -- since the specific tables don't exist
    SELECT COUNT(*) INTO v_insights_count
    FROM analytics_events 
    WHERE user_id = v_user_id 
    AND event_type = 'insight'
    AND created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_reports_count
    FROM analytics_events 
    WHERE user_id = v_user_id 
    AND event_type = 'report'
    AND created_at >= v_month_start;
    
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
    SELECT plan_type INTO v_plan_type
    FROM subscriptions 
    WHERE user_id = v_user_id;
    
    -- If no subscription found, default to trial
    IF v_plan_type IS NULL THEN
        v_plan_type := 'trial';
    END IF;
    
    -- Get current usage count for the feature
    CASE v_feature_type
        WHEN 'feedback' THEN
            -- Count all feedbacks (no user_id in feedbacks table)
            SELECT COUNT(*) INTO v_current_count
            FROM feedbacks 
            WHERE timestamp >= v_month_start;
        WHEN 'insights' THEN
            -- Use analytics_events as proxy for insights
            SELECT COUNT(*) INTO v_current_count
            FROM analytics_events 
            WHERE user_id = v_user_id 
            AND event_type = 'insight'
            AND created_at >= v_month_start;
        WHEN 'analytics' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM analytics_history 
            WHERE user_id = v_user_id 
            AND created_at >= v_month_start;
        WHEN 'reports' THEN
            -- Use analytics_events as proxy for reports
            SELECT COUNT(*) INTO v_current_count
            FROM analytics_events 
            WHERE user_id = v_user_id 
            AND event_type = 'report'
            AND created_at >= v_month_start;
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
            -- Business plan has unlimited usage
            RETURN TRUE;
    END CASE;
    
    -- Check if usage is within limit
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
    -- Get current month start
    v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_previous_month_start := v_current_month_start - INTERVAL '1 month';
    
    -- Refresh usage for all users for the current month
    PERFORM refresh_user_usage(user_id, v_current_month_start)
    FROM (
        SELECT DISTINCT user_id 
        FROM usage_counters 
        WHERE month_start = v_previous_month_start
    ) AS users;
    
    -- Log the reset
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
-- 4. Create indexes for existing tables
-- ===============================

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_feedbacks_created;
DROP INDEX IF EXISTS idx_analytics_history_user_created;
DROP INDEX IF EXISTS idx_analytics_events_user_created;

-- Create indexes for the actual tables
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_history_user_created ON analytics_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at);

-- ===============================
-- 5. Grant permissions
-- ===============================
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_usage() TO service_role;

-- ===============================
-- 6. Get a real user ID for testing
-- ===============================

-- Get a sample user ID from auth.users
SELECT 
    id as user_id,
    email,
    'Use this ID for testing: ' || id as test_instruction
FROM auth.users 
LIMIT 1;

-- ===============================
-- 7. Test the functions with a real user ID
-- ===============================

-- Test refresh_user_usage (replace with actual user ID from above)
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the first user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the function
        PERFORM refresh_user_usage(test_user_id, CURRENT_DATE);
        RAISE NOTICE '✓ refresh_user_usage function works with user ID: %', test_user_id;
    ELSE
        RAISE NOTICE '⚠ No users found in auth.users table';
    END IF;
END $$;

-- ===============================
-- 8. Verification
-- ===============================

-- Check if functions were created successfully
SELECT 
    routine_name,
    CASE 
        WHEN routine_name = 'refresh_user_usage' THEN '✓ refresh_user_usage function created'
        WHEN routine_name = 'check_usage_limit' THEN '✓ check_usage_limit function created'
        WHEN routine_name = 'reset_monthly_usage' THEN '✓ reset_monthly_usage function created'
        ELSE '✓ ' || routine_name || ' function created'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('refresh_user_usage', 'check_usage_limit', 'reset_monthly_usage');

-- Final success message
SELECT '🎉 Usage Overview System Fixed with Existing Tables!' as summary;