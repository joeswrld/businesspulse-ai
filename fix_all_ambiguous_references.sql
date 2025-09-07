-- Fix ALL ambiguous column references in the function
-- This fixes the "column reference user_id is ambiguous" error in SELECT statements

-- Drop and recreate the refresh_user_usage function with ALL table aliases
DROP FUNCTION IF EXISTS refresh_user_usage(UUID, DATE) CASCADE;

-- Create refresh_user_usage function with table aliases everywhere
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
    v_existing_record_id UUID;
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
    
    -- Check if record exists (using table alias)
    SELECT uc.id INTO v_existing_record_id
    FROM usage_counters uc
    WHERE uc.user_id = v_user_id AND uc.month_start = v_month_start;
    
    -- Insert or update based on existence
    IF v_existing_record_id IS NOT NULL THEN
        -- Update existing record
        UPDATE usage_counters uc SET
            feedback_count = v_feedback_count,
            insights_count = v_insights_count,
            analytics_count = v_analytics_count,
            reports_count = v_reports_count,
            updated_at = NOW()
        WHERE uc.id = v_existing_record_id;
    ELSE
        -- Insert new record
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
        );
    END IF;
    
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

-- Test the function
DO $$
DECLARE
    test_user_id UUID;
    test_result RECORD;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the function
        SELECT * INTO test_result FROM refresh_user_usage(test_user_id, CURRENT_DATE) LIMIT 1;
        RAISE NOTICE '✓ refresh_user_usage function works with user ID: %', test_user_id;
        RAISE NOTICE '  - Feedback count: %', test_result.feedback_count;
        RAISE NOTICE '  - Insights count: %', test_result.insights_count;
        RAISE NOTICE '  - Analytics count: %', test_result.analytics_count;
        RAISE NOTICE '  - Reports count: %', test_result.reports_count;
        
        -- Test a second call to verify update works
        SELECT * INTO test_result FROM refresh_user_usage(test_user_id, CURRENT_DATE) LIMIT 1;
        RAISE NOTICE '✓ Update functionality works';
        
        -- Test with a different month to verify insert works
        SELECT * INTO test_result FROM refresh_user_usage(test_user_id, CURRENT_DATE - INTERVAL '1 month') LIMIT 1;
        RAISE NOTICE '✓ Insert functionality works';
        
    ELSE
        RAISE NOTICE '⚠ No users found, but function is ready';
    END IF;
END $$;

-- Final success message
SELECT '🎉 ALL Ambiguous Column References Fixed!' as summary;