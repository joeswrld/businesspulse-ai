-- Fix for the parameter name conflict in refresh_user_usage function
-- This script fixes the "parameter name used more than once" error

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS refresh_user_usage(UUID, DATE);

-- Recreate the function with correct parameter names
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO service_role;

-- Add comment
COMMENT ON FUNCTION refresh_user_usage(UUID, DATE) IS 'Refreshes usage counts for a user for a specific month (fixed parameter name conflict)';