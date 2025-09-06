-- Quick Fix for Ambiguous Column References
-- This fixes the "column reference user_id is ambiguous" error

-- Drop and recreate functions with table aliases to avoid ambiguity

-- Drop existing functions
DROP FUNCTION IF EXISTS refresh_user_usage(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS check_usage_limit(UUID, TEXT) CASCADE;

-- Create refresh_user_usage function with table aliases
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
    
    -- For insights and reports, we'll use analytics_events as a proxy
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

-- Create check_usage_limit function with table aliases
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
            -- Count all feedbacks (no user_id in feedbacks table)
            SELECT COUNT(*) INTO v_current_count
            FROM feedbacks f
            WHERE f.timestamp >= v_month_start;
        WHEN 'insights' THEN
            -- Use analytics_events as proxy for insights
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
            -- Use analytics_events as proxy for reports
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
            -- Business plan has unlimited usage
            RETURN TRUE;
    END CASE;
    
    -- Check if usage is within limit
    RETURN v_current_count < v_limit;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT) TO service_role;

-- Test the functions
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
        
        -- Test usage limits
        PERFORM check_usage_limit(test_user_id, 'insights');
        RAISE NOTICE '✓ check_usage_limit function works';
    ELSE
        RAISE NOTICE '⚠ No users found in auth.users table';
    END IF;
END $$;

-- Final success message
SELECT '🎉 Ambiguous Column References Fixed!' as summary;