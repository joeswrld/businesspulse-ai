-- Migration to remove Pro plan and simplify billing to Trial + Business only
-- This updates the database schema and functions to remove Pro plan references

-- ===============================
-- 1. Update subscriptions table constraints
-- ===============================

-- Update the check constraint to only allow 'trial' and 'business'
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check 
  CHECK (plan_type IN ('trial', 'business'));

-- ===============================
-- 2. Update usage enforcement functions
-- ===============================

-- Update check_usage_limit function to remove Pro plan logic
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
    
    -- Get limit based on plan type (simplified to trial/business only)
    CASE v_plan_type
        WHEN 'trial' THEN
            CASE v_feature_type
                WHEN 'feedback' THEN v_limit := 50;
                WHEN 'insights' THEN v_limit := 10;
                WHEN 'analytics' THEN v_limit := 10;
                WHEN 'reports' THEN v_limit := 5;
            END CASE;
        WHEN 'business' THEN
            -- Business plan has unlimited usage
            RETURN TRUE;
    END CASE;
    
    -- Check if usage is within limit
    RETURN v_current_count < v_limit;
END;
$$;

-- ===============================
-- 3. Update any existing Pro subscriptions to Business
-- ===============================

-- Update any existing 'pro' subscriptions to 'business'
UPDATE subscriptions 
SET plan_type = 'business' 
WHERE plan_type = 'pro';

-- ===============================
-- 4. Update billing profiles if they exist
-- ===============================

-- Update billing_profiles table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_profiles') THEN
        -- Update any 'pro' plans to 'business'
        UPDATE billing_profiles 
        SET plan = 'business' 
        WHERE plan = 'pro';
        
        -- Update the check constraint
        ALTER TABLE billing_profiles DROP CONSTRAINT IF EXISTS billing_profiles_plan_check;
        ALTER TABLE billing_profiles ADD CONSTRAINT billing_profiles_plan_check 
          CHECK (plan IN ('trial', 'business'));
    END IF;
END $$;

-- ===============================
-- 5. Create test data for Business plan
-- ===============================

-- Create a test Business subscription for the first user (if any exist)
DO $$
DECLARE
    test_user_id UUID;
    subscription_exists BOOLEAN;
BEGIN
    -- Get the first user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Check if subscription already exists
        SELECT EXISTS(
            SELECT 1 FROM subscriptions WHERE user_id = test_user_id
        ) INTO subscription_exists;
        
        IF NOT subscription_exists THEN
            -- Create a test Business subscription
            INSERT INTO subscriptions (
                user_id,
                plan_type,
                renewal_date,
                trial_start,
                trial_end,
                is_active
            ) VALUES (
                test_user_id,
                'business',
                NOW() + INTERVAL '30 days',
                NOW() - INTERVAL '2 days',
                NOW() + INTERVAL '6 days',
                true
            );
            
            RAISE NOTICE '✓ Created test Business subscription for user: %', test_user_id;
        ELSE
            RAISE NOTICE '✓ Subscription already exists for user: %', test_user_id;
        END IF;
        
    ELSE
        RAISE NOTICE '⚠ No users found in auth.users table';
    END IF;
END $$;

-- ===============================
-- 6. Verification
-- ===============================

-- Show updated subscription data
SELECT 
    s.user_id,
    u.email,
    s.plan_type,
    s.renewal_date,
    s.trial_start,
    s.trial_end,
    s.is_active,
    s.created_at
FROM subscriptions s
LEFT JOIN auth.users u ON s.user_id = u.id
ORDER BY s.created_at DESC;

-- Test the updated function
DO $$
DECLARE
    test_user_id UUID;
    can_use_feedback BOOLEAN;
    can_use_insights BOOLEAN;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test usage limits
        SELECT check_usage_limit(test_user_id, 'feedback') INTO can_use_feedback;
        SELECT check_usage_limit(test_user_id, 'insights') INTO can_use_insights;
        
        RAISE NOTICE '✓ Usage limit function works';
        RAISE NOTICE '  - Can use feedback: %', can_use_feedback;
        RAISE NOTICE '  - Can use insights: %', can_use_insights;
        
    ELSE
        RAISE NOTICE '⚠ No users found for testing';
    END IF;
END $$;

-- Final success message
SELECT '🎉 Pro Plan Removed - Simplified to Trial + Business Only!' as summary;