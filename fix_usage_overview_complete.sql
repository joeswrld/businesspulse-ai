-- ===============================
-- Complete Usage Overview Fix
-- ===============================
-- This script implements the complete usage overview system with:
-- 1. Monthly auto-reset functionality
-- 2. Plan-based usage limits
-- 3. Real-time usage tracking
-- 4. Comprehensive usage enforcement

-- ===============================
-- 1. Ensure usage_counters table has all needed columns
-- ===============================
ALTER TABLE IF EXISTS usage_counters
ADD COLUMN IF NOT EXISTS month_start DATE NOT NULL DEFAULT DATE_TRUNC('month', CURRENT_DATE),
ADD COLUMN IF NOT EXISTS feedback_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS insights_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS analytics_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS reports_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have proper month_start
UPDATE usage_counters 
SET month_start = DATE_TRUNC('month', CURRENT_DATE)::DATE
WHERE month_start IS NULL;

-- ===============================
-- 2. Refresh user usage and auto-reset monthly counts
-- ===============================
CREATE OR REPLACE FUNCTION refresh_usage(user_uuid UUID)
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
    current_month DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
BEGIN
    -- Reset counts if month_start is not current month
    UPDATE usage_counters
    SET feedback_count = 0,
        insights_count = 0,
        analytics_count = 0,
        reports_count = 0,
        month_start = current_month,
        updated_at = NOW()
    WHERE user_id = user_uuid
      AND month_start <> current_month;

    -- Insert a row if none exists
    INSERT INTO usage_counters (user_id, month_start, feedback_count, insights_count, analytics_count, reports_count, created_at, updated_at)
    SELECT user_uuid, current_month, 0, 0, 0, 0, NOW(), NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM usage_counters WHERE user_id = user_uuid AND month_start = current_month
    );

    -- Return current usage
    RETURN QUERY
    SELECT user_id, month_start, feedback_count, insights_count, analytics_count, reports_count
    FROM usage_counters
    WHERE user_id = user_uuid
      AND month_start = current_month;
END;
$$;

-- ===============================
-- 3. Check usage limits based on plan
-- ===============================
CREATE OR REPLACE FUNCTION check_usage_limit(user_uuid UUID)
RETURNS TABLE (
    can_submit_feedback BOOLEAN,
    can_use_ai_insights BOOLEAN,
    can_generate_analytics BOOLEAN,
    can_generate_reports BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    plan TEXT;
    usage RECORD;
BEGIN
    -- Get user plan
    SELECT plan_code INTO plan
    FROM user_subscriptions
    WHERE user_id = user_uuid
    LIMIT 1;

    -- If no subscription found, check billing_profiles
    IF plan IS NULL THEN
        SELECT plan INTO plan
        FROM billing_profiles
        WHERE id = user_uuid
        LIMIT 1;
    END IF;

    -- Default to 'free' if no plan found
    IF plan IS NULL THEN
        plan := 'free';
    END IF;

    -- Get current month usage
    SELECT * INTO usage
    FROM usage_counters
    WHERE user_id = user_uuid
      AND month_start = DATE_TRUNC('month', CURRENT_DATE);

    -- If no usage record found, create one
    IF usage IS NULL THEN
        PERFORM refresh_usage(user_uuid);
        SELECT * INTO usage
        FROM usage_counters
        WHERE user_id = user_uuid
          AND month_start = DATE_TRUNC('month', CURRENT_DATE);
    END IF;

    -- Default to 0 if still no usage found
    IF usage IS NULL THEN
        usage.feedback_count := 0;
        usage.insights_count := 0;
        usage.analytics_count := 0;
        usage.reports_count := 0;
    END IF;

    RETURN QUERY
    SELECT
        CASE 
            WHEN plan = 'free' AND usage.feedback_count < 50 THEN TRUE
            WHEN plan = 'pro' AND usage.feedback_count < 300 THEN TRUE
            WHEN plan = 'business' THEN TRUE
            ELSE FALSE
        END AS can_submit_feedback,
        CASE 
            WHEN plan = 'free' AND usage.insights_count < 10 THEN TRUE
            WHEN plan = 'pro' AND usage.insights_count < 50 THEN TRUE
            WHEN plan = 'business' THEN TRUE
            ELSE FALSE
        END AS can_use_ai_insights,
        CASE 
            WHEN plan = 'free' AND usage.analytics_count < 10 THEN TRUE
            WHEN plan = 'pro' AND usage.analytics_count < 100 THEN TRUE
            WHEN plan = 'business' THEN TRUE
            ELSE FALSE
        END AS can_generate_analytics,
        CASE 
            WHEN plan = 'free' AND usage.reports_count < 5 THEN TRUE
            WHEN plan = 'pro' AND usage.reports_count < 20 THEN TRUE
            WHEN plan = 'business' THEN TRUE
            ELSE FALSE
        END AS can_generate_reports;
END;
$$;

-- ===============================
-- 4. Get comprehensive usage summary for a user
-- ===============================
CREATE OR REPLACE FUNCTION get_user_usage_summary(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    plan_code TEXT,
    plan_name TEXT,
    feedback_count INTEGER,
    insights_count INTEGER,
    analytics_count INTEGER,
    reports_count INTEGER,
    feedback_limit INTEGER,
    insights_limit INTEGER,
    analytics_limit INTEGER,
    reports_limit INTEGER,
    feedback_remaining INTEGER,
    insights_remaining INTEGER,
    analytics_remaining INTEGER,
    reports_remaining INTEGER,
    month_start DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_month DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    user_plan TEXT;
    usage_data RECORD;
    plan_limits RECORD;
BEGIN
    -- Get user plan
    SELECT plan_code INTO user_plan
    FROM user_subscriptions
    WHERE user_id = p_user_id
    LIMIT 1;

    -- If no subscription found, check billing_profiles
    IF user_plan IS NULL THEN
        SELECT plan INTO user_plan
        FROM billing_profiles
        WHERE id = p_user_id
        LIMIT 1;
    END IF;

    -- Default to 'free' if no plan found
    IF user_plan IS NULL THEN
        user_plan := 'free';
    END IF;

    -- Refresh usage data first
    PERFORM refresh_usage(p_user_id);

    -- Get current usage
    SELECT * INTO usage_data
    FROM usage_counters
    WHERE user_id = p_user_id
      AND month_start = current_month;

    -- Get plan limits
    SELECT 
        CASE 
            WHEN user_plan = 'free' THEN 50
            WHEN user_plan = 'pro' THEN 300
            WHEN user_plan = 'business' THEN -1
            ELSE 50
        END as feedback_limit,
        CASE 
            WHEN user_plan = 'free' THEN 10
            WHEN user_plan = 'pro' THEN 50
            WHEN user_plan = 'business' THEN -1
            ELSE 10
        END as insights_limit,
        CASE 
            WHEN user_plan = 'free' THEN 10
            WHEN user_plan = 'pro' THEN 100
            WHEN user_plan = 'business' THEN -1
            ELSE 10
        END as analytics_limit,
        CASE 
            WHEN user_plan = 'free' THEN 5
            WHEN user_plan = 'pro' THEN 20
            WHEN user_plan = 'business' THEN -1
            ELSE 5
        END as reports_limit
    INTO plan_limits;

    -- Return comprehensive usage summary
    RETURN QUERY
    SELECT
        p_user_id as user_id,
        user_plan as plan_code,
        CASE 
            WHEN user_plan = 'free' THEN 'Free Trial'
            WHEN user_plan = 'pro' THEN 'Pro Plan'
            WHEN user_plan = 'business' THEN 'Business Plan'
            ELSE 'Free Trial'
        END as plan_name,
        COALESCE(usage_data.feedback_count, 0) as feedback_count,
        COALESCE(usage_data.insights_count, 0) as insights_count,
        COALESCE(usage_data.analytics_count, 0) as analytics_count,
        COALESCE(usage_data.reports_count, 0) as reports_count,
        plan_limits.feedback_limit,
        plan_limits.insights_limit,
        plan_limits.analytics_limit,
        plan_limits.reports_limit,
        CASE 
            WHEN plan_limits.feedback_limit = -1 THEN -1
            ELSE GREATEST(0, plan_limits.feedback_limit - COALESCE(usage_data.feedback_count, 0))
        END as feedback_remaining,
        CASE 
            WHEN plan_limits.insights_limit = -1 THEN -1
            ELSE GREATEST(0, plan_limits.insights_limit - COALESCE(usage_data.insights_count, 0))
        END as insights_remaining,
        CASE 
            WHEN plan_limits.analytics_limit = -1 THEN -1
            ELSE GREATEST(0, plan_limits.analytics_limit - COALESCE(usage_data.analytics_count, 0))
        END as analytics_remaining,
        CASE 
            WHEN plan_limits.reports_limit = -1 THEN -1
            ELSE GREATEST(0, plan_limits.reports_limit - COALESCE(usage_data.reports_count, 0))
        END as reports_remaining,
        current_month as month_start;
END;
$$;

-- ===============================
-- 5. Increment usage for a specific action
-- ===============================
CREATE OR REPLACE FUNCTION increment_usage_counter(
    p_user_id UUID,
    p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_month DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    can_proceed BOOLEAN := FALSE;
    limits RECORD;
BEGIN
    -- Check if user can perform this action
    SELECT * INTO limits FROM check_usage_limit(p_user_id);
    
    CASE p_action
        WHEN 'feedback' THEN
            can_proceed := limits.can_submit_feedback;
        WHEN 'insights' THEN
            can_proceed := limits.can_use_ai_insights;
        WHEN 'analytics' THEN
            can_proceed := limits.can_generate_analytics;
        WHEN 'reports' THEN
            can_proceed := limits.can_generate_reports;
        ELSE
            RAISE EXCEPTION 'Invalid action: %. Valid actions are: feedback, insights, analytics, reports', p_action;
    END CASE;

    -- If not allowed, return false
    IF NOT can_proceed THEN
        RETURN FALSE;
    END IF;

    -- Ensure usage record exists for current month
    PERFORM refresh_usage(p_user_id);

    -- Increment the appropriate counter
    CASE p_action
        WHEN 'feedback' THEN
            UPDATE usage_counters
            SET feedback_count = feedback_count + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id
              AND month_start = current_month;
        WHEN 'insights' THEN
            UPDATE usage_counters
            SET insights_count = insights_count + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id
              AND month_start = current_month;
        WHEN 'analytics' THEN
            UPDATE usage_counters
            SET analytics_count = analytics_count + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id
              AND month_start = current_month;
        WHEN 'reports' THEN
            UPDATE usage_counters
            SET reports_count = reports_count + 1,
                updated_at = NOW()
            WHERE user_id = p_user_id
              AND month_start = current_month;
    END CASE;

    RETURN TRUE;
END;
$$;

-- ===============================
-- 6. Grant permissions
-- ===============================
GRANT EXECUTE ON FUNCTION refresh_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_usage(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_usage_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_usage_summary(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION increment_usage_counter(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage_counter(UUID, TEXT) TO service_role;

-- ===============================
-- 7. Create indexes for performance
-- ===============================
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_month 
ON usage_counters(user_id, month_start);

CREATE INDEX IF NOT EXISTS idx_usage_counters_month_start 
ON usage_counters(month_start);

-- ===============================
-- 8. Add comments for documentation
-- ===============================
COMMENT ON FUNCTION refresh_usage(UUID) IS 
'Refreshes user usage data and auto-resets monthly counts. Returns current usage for the month.';

COMMENT ON FUNCTION check_usage_limit(UUID) IS 
'Checks if user can perform specific actions based on their plan and current usage.';

COMMENT ON FUNCTION get_user_usage_summary(UUID) IS 
'Returns comprehensive usage summary including counts, limits, and remaining usage.';

COMMENT ON FUNCTION increment_usage_counter(UUID, TEXT) IS 
'Increments usage counter for a specific action if within limits. Returns true if successful.';

-- ===============================
-- 9. Test the functions
-- ===============================
-- Example usage:
-- SELECT * FROM refresh_usage('<user_uuid>');
-- SELECT * FROM check_usage_limit('<user_uuid>');
-- SELECT * FROM get_user_usage_summary('<user_uuid>');
-- SELECT increment_usage_counter('<user_uuid>', 'feedback');