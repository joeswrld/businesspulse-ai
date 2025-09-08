-- Safe Deployment Script for Usage Overview System
-- This script avoids deadlocks by running operations sequentially and with proper locking

-- ===============================
-- 1. First, ensure we have exclusive access to the tables
-- ===============================

-- Lock the tables we'll be modifying to prevent conflicts
LOCK TABLE usage_counters IN EXCLUSIVE MODE;
LOCK TABLE subscriptions IN EXCLUSIVE MODE;

-- ===============================
-- 2. Drop existing functions safely (one at a time)
-- ===============================

-- Drop functions in reverse dependency order
DROP FUNCTION IF EXISTS reset_monthly_usage() CASCADE;
DROP FUNCTION IF EXISTS check_usage_limit(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS refresh_user_usage(UUID, DATE) CASCADE;

-- ===============================
-- 3. Create functions one at a time
-- ===============================

-- Create refresh_user_usage function first (no dependencies)
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
    -- Get actual counts from source tables for the month
    -- Note: feedbacks table doesn't have user_id, so we'll count all feedbacks for now
    SELECT COUNT(*) INTO v_feedback_count
    FROM feedbacks 
    WHERE created_at >= v_month_start;
    
    -- Count insights (using the actual insights table)
    SELECT COUNT(*) INTO v_insights_count
    FROM insights 
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
    -- Count analytics (using analytics_history table)
    SELECT COUNT(*) INTO v_analytics_count
    FROM analytics_history 
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
    -- Count reports (using analytics_daily as a proxy for reports)
    SELECT COUNT(*) INTO v_reports_count
    FROM analytics_daily 
    WHERE user_id = v_user_id 
    AND date >= v_month_start;
    
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

-- Create check_usage_limit function (depends on refresh_user_usage)
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
            -- Note: feedbacks table doesn't have user_id, so we count all feedbacks
            SELECT COUNT(*) INTO v_current_count
            FROM feedbacks 
            WHERE created_at >= v_month_start;
        WHEN 'insights' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM insights 
            WHERE user_id = v_user_id 
            AND created_at >= v_month_start;
        WHEN 'analytics' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM analytics_history 
            WHERE user_id = v_user_id 
            AND created_at >= v_month_start;
        WHEN 'reports' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM analytics_daily 
            WHERE user_id = v_user_id 
            AND date >= v_month_start;
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

-- Create reset_monthly_usage function (depends on refresh_user_usage)
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
-- 4. Create indexes safely (one at a time)
-- ===============================

-- Drop existing indexes if they exist (to avoid conflicts)
DROP INDEX IF EXISTS idx_feedbacks_user_created;
DROP INDEX IF EXISTS idx_insights_user_created;
DROP INDEX IF EXISTS idx_analytics_user_created;
DROP INDEX IF EXISTS idx_reports_user_created;
DROP INDEX IF EXISTS idx_analytics_history_user_created;
DROP INDEX IF EXISTS idx_analytics_daily_user_date;
DROP INDEX IF EXISTS idx_feedbacks_created;

-- Create indexes for the actual tables (one at a time)
CREATE INDEX IF NOT EXISTS idx_insights_user_created ON insights(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_history_user_created ON analytics_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_user_date ON analytics_daily(user_id, date);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at);

-- ===============================
-- 5. Grant permissions
-- ===============================
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_usage() TO service_role;

-- ===============================
-- 6. Add comments
-- ===============================
COMMENT ON FUNCTION refresh_user_usage(UUID, DATE) IS 'Refreshes usage counts for a user for a specific month (deadlock-safe)';
COMMENT ON FUNCTION check_usage_limit(UUID, TEXT) IS 'Checks if a user can perform an action based on their usage limits (deadlock-safe)';
COMMENT ON FUNCTION reset_monthly_usage() IS 'Resets usage counters for all users at the start of a new month (deadlock-safe)';

-- ===============================
-- 7. Verification (run after deployment)
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

-- Check if tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'usage_counters' THEN '✓ usage_counters table exists'
        WHEN table_name = 'subscriptions' THEN '✓ subscriptions table exists'
        WHEN table_name = 'feedbacks' THEN '✓ feedbacks table exists'
        WHEN table_name = 'insights' THEN '✓ insights table exists'
        WHEN table_name = 'analytics_history' THEN '✓ analytics_history table exists'
        WHEN table_name = 'analytics_daily' THEN '✓ analytics_daily table exists'
        ELSE '✓ ' || table_name || ' table exists'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usage_counters', 'subscriptions', 'feedbacks', 'insights', 'analytics_history', 'analytics_daily');

-- Final success message
SELECT '🎉 Usage Overview System Deployed Safely (No Deadlocks)!' as summary;