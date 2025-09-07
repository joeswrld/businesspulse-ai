-- Fix get_user_usage_summary function return type issue
-- This script drops the existing function and recreates it with the correct return type

-- Step 1: Drop the existing function
DROP FUNCTION IF EXISTS get_user_usage_summary(uuid);

-- Step 2: Recreate the function with the correct return type
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
    v_user_id UUID;
    v_plan_code TEXT;
    v_plan_name TEXT;
    v_feedback_count INTEGER := 0;
    v_insights_count INTEGER := 0;
    v_analytics_count INTEGER := 0;
    v_reports_count INTEGER := 0;
    v_feedback_limit INTEGER := 0;
    v_insights_limit INTEGER := 0;
    v_analytics_limit INTEGER := 0;
    v_reports_limit INTEGER := 0;
    v_feedback_remaining INTEGER := 0;
    v_insights_remaining INTEGER := 0;
    v_analytics_remaining INTEGER := 0;
    v_reports_remaining INTEGER := 0;
    v_month_start DATE;
BEGIN
    -- Get user plan information
    SELECT 
        p.plan_code,
        p.plan_name,
        p.feedback_limit,
        p.insights_limit,
        p.analytics_limit,
        p.reports_limit
    INTO 
        v_plan_code,
        v_plan_name,
        v_feedback_limit,
        v_insights_limit,
        v_analytics_limit,
        v_reports_limit
    FROM user_plans up
    JOIN plans p ON up.plan_id = p.id
    WHERE up.user_id = p_user_id
    AND up.is_active = true;

    -- If no plan found, return default values
    IF v_plan_code IS NULL THEN
        v_plan_code := 'free';
        v_plan_name := 'Free Plan';
        v_feedback_limit := 10;
        v_insights_limit := 5;
        v_analytics_limit := 3;
        v_reports_limit := 2;
    END IF;

    -- Get current month start date
    v_month_start := DATE_TRUNC('month', CURRENT_DATE);

    -- Get current usage counts for this month
    SELECT 
        COALESCE(uc.feedback_count, 0),
        COALESCE(uc.insights_count, 0),
        COALESCE(uc.analytics_count, 0),
        COALESCE(uc.reports_count, 0)
    INTO 
        v_feedback_count,
        v_insights_count,
        v_analytics_count,
        v_reports_count
    FROM usage_counters uc
    WHERE uc.user_id = p_user_id
    AND uc.month_start = v_month_start;

    -- Calculate remaining usage
    v_feedback_remaining := GREATEST(0, v_feedback_limit - v_feedback_count);
    v_insights_remaining := GREATEST(0, v_insights_limit - v_insights_count);
    v_analytics_remaining := GREATEST(0, v_analytics_limit - v_analytics_count);
    v_reports_remaining := GREATEST(0, v_reports_limit - v_reports_count);

    -- Set user_id
    v_user_id := p_user_id;

    -- Return the result
    RETURN QUERY SELECT 
        v_user_id,
        v_plan_code,
        v_plan_name,
        v_feedback_count,
        v_insights_count,
        v_analytics_count,
        v_reports_count,
        v_feedback_limit,
        v_insights_limit,
        v_analytics_limit,
        v_reports_limit,
        v_feedback_remaining,
        v_insights_remaining,
        v_analytics_remaining,
        v_reports_remaining,
        v_month_start;
END;
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION get_user_usage_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_usage_summary(UUID) TO service_role;

-- Step 4: Add comment
COMMENT ON FUNCTION get_user_usage_summary(UUID) IS 
'Returns comprehensive usage summary including counts, limits, and remaining usage.';

-- Step 5: Test the function
-- Uncomment the line below to test with a specific user ID
-- SELECT * FROM get_user_usage_summary('your-user-id-here');