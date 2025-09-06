-- Complete Usage Overview System Deployment
-- This script handles all potential conflicts and creates the complete system

-- ===============================
-- 1. Create tables (with IF NOT EXISTS)
-- ===============================

-- Create usage_counters table
CREATE TABLE IF NOT EXISTS usage_counters (
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

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL DEFAULT 'trial' CHECK (plan_type IN ('trial', 'pro', 'business')),
    renewal_date TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trial_end TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ===============================
-- 2. Drop and recreate functions (to avoid conflicts)
-- ===============================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS refresh_user_usage(UUID, DATE);
DROP FUNCTION IF EXISTS check_usage_limit(UUID, TEXT);
DROP FUNCTION IF EXISTS reset_monthly_usage();

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
    -- Get actual counts from source tables for the month
    SELECT COUNT(*) INTO v_feedback_count
    FROM feedbacks 
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_insights_count
    FROM insights_simple 
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_analytics_count
    FROM analytics 
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_reports_count
    FROM reports 
    WHERE user_id = v_user_id 
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
            SELECT COUNT(*) INTO v_current_count
            FROM feedbacks 
            WHERE user_id = v_user_id 
            AND created_at >= v_month_start;
        WHEN 'insights' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM insights_simple 
            WHERE user_id = v_user_id 
            AND created_at >= v_month_start;
        WHEN 'analytics' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM analytics 
            WHERE user_id = v_user_id 
            AND created_at >= v_month_start;
        WHEN 'reports' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM reports 
            WHERE user_id = v_user_id 
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
    -- This will create new records for users who don't have current month data
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
-- 3. Enable RLS and create policies
-- ===============================

-- Enable RLS on tables
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own usage counters" ON usage_counters;
DROP POLICY IF EXISTS "Users can insert their own usage counters" ON usage_counters;
DROP POLICY IF EXISTS "Users can update their own usage counters" ON usage_counters;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;

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
-- 4. Create indexes for performance
-- ===============================
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_month ON usage_counters(user_id, month_start);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_created ON feedbacks(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_insights_user_created ON insights_simple(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_user_created ON analytics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_user_created ON reports(user_id, created_at);

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
COMMENT ON TABLE usage_counters IS 'Tracks monthly usage counts for each user';
COMMENT ON TABLE subscriptions IS 'Stores user subscription information';
COMMENT ON FUNCTION refresh_user_usage(UUID, DATE) IS 'Refreshes usage counts for a user for a specific month';
COMMENT ON FUNCTION check_usage_limit(UUID, TEXT) IS 'Checks if a user can perform an action based on their usage limits';
COMMENT ON FUNCTION reset_monthly_usage() IS 'Resets usage counters for all users at the start of a new month';

-- ===============================
-- 7. Create trigger for automatic monthly reset
-- ===============================
CREATE OR REPLACE FUNCTION trigger_monthly_reset()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if we're in a new month
    IF DATE_TRUNC('month', NEW.created_at) > DATE_TRUNC('month', OLD.created_at) THEN
        PERFORM reset_monthly_usage();
    END IF;
    RETURN NEW;
END;
$$;

-- Create a dummy table to trigger monthly resets
CREATE TABLE IF NOT EXISTS monthly_reset_trigger (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS monthly_reset_trigger ON monthly_reset_trigger;

-- Create trigger
CREATE TRIGGER monthly_reset_trigger
    AFTER INSERT ON monthly_reset_trigger
    FOR EACH ROW
    EXECUTE FUNCTION trigger_monthly_reset();

-- ===============================
-- 8. Verification
-- ===============================

-- Check tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'usage_counters' THEN '✓ usage_counters table created'
        WHEN table_name = 'subscriptions' THEN '✓ subscriptions table created'
        ELSE '✓ ' || table_name || ' table created'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usage_counters', 'subscriptions');

-- Check functions exist
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

-- Check policies exist
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN policyname LIKE '%usage_counters%' THEN '✓ RLS policy created for usage_counters'
        WHEN policyname LIKE '%subscriptions%' THEN '✓ RLS policy created for subscriptions'
        ELSE '✓ RLS policy created: ' || policyname
    END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('usage_counters', 'subscriptions');

-- Final success message
SELECT '🎉 Usage Overview System Successfully Deployed!' as summary;