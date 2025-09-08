-- Complete usage enforcement solution with monthly auto-reset
-- 1. Update usage_counters table with all required columns
ALTER TABLE usage_counters 
ADD COLUMN IF NOT EXISTS feedback_disabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS insights_disabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS analytics_disabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reports_disabled BOOLEAN DEFAULT FALSE;

-- 2. Create function to get plan limits
CREATE OR REPLACE FUNCTION get_plan_limits(plan_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    limits JSONB;
BEGIN
    CASE plan_code
        WHEN 'free' THEN
            limits := '{"feedback": 50, "insights": 10, "analytics": 5, "reports": 2}';
        WHEN 'pro' THEN  
            limits := '{"feedback": 300, "insights": 100, "analytics": 50, "reports": 25}';
        WHEN 'business' THEN
            limits := '{"feedback": -1, "insights": -1, "analytics": -1, "reports": -1}';
        ELSE
            limits := '{"feedback": 50, "insights": 10, "analytics": 5, "reports": 2}';
    END CASE;
    
    RETURN limits;
END;
$$;

-- 3. Function to reset usage monthly
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_month_start DATE;
BEGIN
    current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    
    -- Reset all usage counters for users whose month_start is before current month
    UPDATE usage_counters
    SET feedback_count = 0,
        insights_count = 0,
        analytics_count = 0, 
        reports_count = 0,
        feedback_disabled = FALSE,
        insights_disabled = FALSE,
        analytics_disabled = FALSE,
        reports_disabled = FALSE,
        month_start = current_month_start,
        updated_at = NOW()
    WHERE month_start < current_month_start;
    
    RAISE NOTICE 'Monthly usage reset completed for % users', 
        (SELECT COUNT(*) FROM usage_counters WHERE month_start = current_month_start);
END;
$$;

-- 4. Function to enforce usage limits based on plan
CREATE OR REPLACE FUNCTION enforce_usage_limits(user_uuid UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
    plan_limits JSONB;
    user_plan_code TEXT;
BEGIN
    -- If specific user provided, only check that user, otherwise check all
    FOR rec IN 
        SELECT uc.user_id, uc.feedback_count, uc.insights_count, 
               uc.analytics_count, uc.reports_count,
               COALESCE(bp.plan, 'free') as plan_code
        FROM usage_counters uc
        LEFT JOIN billing_profiles bp ON bp.id = uc.user_id
        WHERE (user_uuid IS NULL OR uc.user_id = user_uuid)
    LOOP
        -- Get plan limits
        plan_limits := get_plan_limits(rec.plan_code);
        
        -- Update disabled flags based on usage vs limits
        UPDATE usage_counters
        SET 
            feedback_disabled = CASE 
                WHEN (plan_limits->>'feedback')::INT = -1 THEN FALSE
                ELSE rec.feedback_count >= (plan_limits->>'feedback')::INT
            END,
            insights_disabled = CASE 
                WHEN (plan_limits->>'insights')::INT = -1 THEN FALSE
                ELSE rec.insights_count >= (plan_limits->>'insights')::INT
            END,
            analytics_disabled = CASE 
                WHEN (plan_limits->>'analytics')::INT = -1 THEN FALSE
                ELSE rec.analytics_count >= (plan_limits->>'analytics')::INT
            END,
            reports_disabled = CASE 
                WHEN (plan_limits->>'reports')::INT = -1 THEN FALSE
                ELSE rec.reports_count >= (plan_limits->>'reports')::INT
            END,
            updated_at = NOW()
        WHERE user_id = rec.user_id;
    END LOOP;
END;
$$;

-- 5. Function to check if user can use a feature
CREATE OR REPLACE FUNCTION can_use_feature(user_uuid UUID, feature_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_month_start DATE;
    usage_record RECORD;
    plan_limits JSONB;
    user_plan_code TEXT;
    current_usage INT;
    limit_value INT;
BEGIN
    current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    
    -- Ensure usage counter exists for current month
    PERFORM ensure_current_month_usage(user_uuid);
    
    -- Get user's usage and plan
    SELECT uc.*, COALESCE(bp.plan, 'free') as plan_code
    INTO usage_record
    FROM usage_counters uc
    LEFT JOIN billing_profiles bp ON bp.id = uc.user_id
    WHERE uc.user_id = user_uuid AND uc.month_start = current_month_start;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get plan limits
    plan_limits := get_plan_limits(usage_record.plan_code);
    
    -- Check specific feature
    CASE feature_name
        WHEN 'feedback' THEN
            current_usage := usage_record.feedback_count;
            limit_value := (plan_limits->>'feedback')::INT;
        WHEN 'insights' THEN
            current_usage := usage_record.insights_count;
            limit_value := (plan_limits->>'insights')::INT;
        WHEN 'analytics' THEN
            current_usage := usage_record.analytics_count;
            limit_value := (plan_limits->>'analytics')::INT;
        WHEN 'reports' THEN
            current_usage := usage_record.reports_count;
            limit_value := (plan_limits->>'reports')::INT;
        ELSE
            RETURN FALSE;
    END CASE;
    
    -- -1 means unlimited
    IF limit_value = -1 THEN
        RETURN TRUE;
    END IF;
    
    RETURN current_usage < limit_value;
END;
$$;

-- 6. Function to increment usage and check limits
CREATE OR REPLACE FUNCTION increment_usage_with_check(user_uuid UUID, feature_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    can_use BOOLEAN;
    current_month_start DATE;
    result JSONB;
BEGIN
    current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    
    -- Check if user can use the feature
    can_use := can_use_feature(user_uuid, feature_name);
    
    IF NOT can_use THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Usage limit exceeded for ' || feature_name,
            'feature', feature_name
        );
    END IF;
    
    -- Increment usage counter
    CASE feature_name
        WHEN 'feedback' THEN
            UPDATE usage_counters 
            SET feedback_count = feedback_count + 1, updated_at = NOW()
            WHERE user_id = user_uuid AND month_start = current_month_start;
        WHEN 'insights' THEN
            UPDATE usage_counters 
            SET insights_count = insights_count + 1, updated_at = NOW()
            WHERE user_id = user_uuid AND month_start = current_month_start;
        WHEN 'analytics' THEN
            UPDATE usage_counters 
            SET analytics_count = analytics_count + 1, updated_at = NOW()
            WHERE user_id = user_uuid AND month_start = current_month_start;
        WHEN 'reports' THEN
            UPDATE usage_counters 
            SET reports_count = reports_count + 1, updated_at = NOW()
            WHERE user_id = user_uuid AND month_start = current_month_start;
    END CASE;
    
    -- Enforce limits after increment
    PERFORM enforce_usage_limits(user_uuid);
    
    -- Get updated usage info
    SELECT jsonb_build_object(
        'success', true,
        'feature', feature_name,
        'current_usage', 
        CASE feature_name
            WHEN 'feedback' THEN uc.feedback_count
            WHEN 'insights' THEN uc.insights_count
            WHEN 'analytics' THEN uc.analytics_count
            WHEN 'reports' THEN uc.reports_count
        END,
        'is_disabled',
        CASE feature_name
            WHEN 'feedback' THEN uc.feedback_disabled
            WHEN 'insights' THEN uc.insights_disabled
            WHEN 'analytics' THEN uc.analytics_disabled
            WHEN 'reports' THEN uc.reports_disabled
        END,
        'plan', COALESCE(bp.plan, 'free')
    ) INTO result
    FROM usage_counters uc
    LEFT JOIN billing_profiles bp ON bp.id = uc.user_id
    WHERE uc.user_id = user_uuid AND uc.month_start = current_month_start;
    
    RETURN result;
END;
$$;

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION get_plan_limits(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_usage() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION enforce_usage_limits(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION can_use_feature(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION increment_usage_with_check(UUID, TEXT) TO authenticated, service_role;