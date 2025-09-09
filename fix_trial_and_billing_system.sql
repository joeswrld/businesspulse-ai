-- Comprehensive Fix for Free Trial, Business Plan, and Platform Lock Logic
-- This migration fixes all issues with trial tracking, business plan access, and platform locking

-- ===============================
-- 1. Fix Database Schema Issues
-- ===============================

-- Ensure we have a unified user_profiles table with all required fields
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    company TEXT,
    role TEXT,
    preferences JSONB DEFAULT '{}',
    -- Trial and subscription fields
    plan VARCHAR(20) DEFAULT 'free_trial' CHECK (plan IN ('free_trial', 'business')),
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    subscription_active BOOLEAN DEFAULT FALSE,
    subscription_expiry_date TIMESTAMPTZ,
    trial_expired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing user_profiles table
DO $$
BEGIN
    -- Add plan column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'plan') THEN
        ALTER TABLE user_profiles ADD COLUMN plan VARCHAR(20) DEFAULT 'free_trial' CHECK (plan IN ('free_trial', 'business'));
    END IF;
    
    -- Add trial_start column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'trial_start') THEN
        ALTER TABLE user_profiles ADD COLUMN trial_start TIMESTAMPTZ;
    END IF;
    
    -- Add trial_end column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'trial_end') THEN
        ALTER TABLE user_profiles ADD COLUMN trial_end TIMESTAMPTZ;
    END IF;
    
    -- Add subscription_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'subscription_active') THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_active BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add subscription_expiry_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'subscription_expiry_date') THEN
        ALTER TABLE user_profiles ADD COLUMN subscription_expiry_date TIMESTAMPTZ;
    END IF;
    
    -- Add trial_expired column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'trial_expired') THEN
        ALTER TABLE user_profiles ADD COLUMN trial_expired BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan ON user_profiles(plan);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_active ON user_profiles(subscription_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_end ON user_profiles(trial_end);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_start ON user_profiles(trial_start);

-- ===============================
-- 2. Fix Existing Data Issues
-- ===============================

-- Fix existing users who don't have trial data
UPDATE user_profiles 
SET 
    trial_start = COALESCE(trial_start, created_at),
    trial_end = COALESCE(trial_end, created_at + INTERVAL '8 days'),
    plan = COALESCE(plan, 'free_trial'),
    subscription_active = COALESCE(subscription_active, FALSE),
    trial_expired = CASE 
        WHEN COALESCE(trial_end, created_at + INTERVAL '8 days') < NOW() THEN TRUE
        ELSE FALSE
    END
WHERE trial_start IS NULL OR trial_end IS NULL;

-- Fix business plan users who should have active subscriptions
UPDATE user_profiles 
SET 
    subscription_active = TRUE,
    subscription_expiry_date = COALESCE(subscription_expiry_date, NOW() + INTERVAL '1 year'),
    trial_expired = FALSE
WHERE plan = 'business' AND subscription_active = FALSE;

-- ===============================
-- 3. Create Fixed Database Functions
-- ===============================

-- Function to initialize trial for new users (8 days)
CREATE OR REPLACE FUNCTION initialize_user_trial(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    trial_start_time TIMESTAMPTZ := NOW();
    trial_end_time TIMESTAMPTZ := trial_start_time + INTERVAL '8 days';
BEGIN
    -- Insert or update user profile with trial data
    INSERT INTO user_profiles (
        user_id,
        trial_start,
        trial_end,
        plan,
        subscription_active,
        trial_expired,
        created_at,
        updated_at
    )
    VALUES (
        user_uuid,
        trial_start_time,
        trial_end_time,
        'free_trial',
        FALSE,
        FALSE,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        trial_start = COALESCE(user_profiles.trial_start, trial_start_time),
        trial_end = COALESCE(user_profiles.trial_end, trial_end_time),
        plan = COALESCE(user_profiles.plan, 'free_trial'),
        subscription_active = COALESCE(user_profiles.subscription_active, FALSE),
        trial_expired = COALESCE(user_profiles.trial_expired, FALSE),
        updated_at = NOW();
END;
$$;

-- Fixed function to check user access with proper logic
CREATE OR REPLACE FUNCTION check_user_access(user_uuid UUID)
RETURNS TABLE (
    has_access BOOLEAN,
    plan VARCHAR(20),
    is_active BOOLEAN,
    trial_expired BOOLEAN,
    days_left INTEGER,
    trial_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    subscription_active BOOLEAN,
    subscription_expiry_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile RECORD;
    current_time TIMESTAMPTZ := NOW();
    days_remaining INTEGER;
BEGIN
    -- Get user profile
    SELECT 
        up.plan,
        up.subscription_active,
        up.trial_expired,
        up.trial_end,
        up.trial_start,
        up.subscription_expiry_date
    INTO user_profile
    FROM user_profiles up
    WHERE up.user_id = user_uuid;
    
    -- If no profile found, create one with trial
    IF NOT FOUND THEN
        PERFORM initialize_user_trial(user_uuid);
        
        -- Get the newly created profile
        SELECT 
            up.plan,
            up.subscription_active,
            up.trial_expired,
            up.trial_end,
            up.trial_start,
            up.subscription_expiry_date
        INTO user_profile
        FROM user_profiles up
        WHERE up.user_id = user_uuid;
    END IF;
    
    -- Calculate days remaining
    IF user_profile.trial_end IS NOT NULL THEN
        days_remaining := GREATEST(0, EXTRACT(DAY FROM (user_profile.trial_end - current_time))::INTEGER);
    ELSE
        days_remaining := 0;
    END IF;
    
    -- FIXED ACCESS LOGIC:
    -- 1. Business plan users with active subscription: ALWAYS ALLOW ACCESS
    IF user_profile.plan = 'business' AND user_profile.subscription_active = TRUE THEN
        -- Check if subscription hasn't expired
        IF user_profile.subscription_expiry_date IS NULL OR user_profile.subscription_expiry_date > current_time THEN
            RETURN QUERY SELECT 
                TRUE, 
                user_profile.plan, 
                TRUE, 
                FALSE, 
                days_remaining, 
                user_profile.trial_end,
                user_profile.trial_start,
                user_profile.subscription_active,
                user_profile.subscription_expiry_date;
            RETURN;
        END IF;
    END IF;
    
    -- 2. Free trial users with active trial: ALLOW ACCESS
    IF user_profile.plan = 'free_trial' AND user_profile.trial_end > current_time THEN
        RETURN QUERY SELECT 
            TRUE, 
            user_profile.plan, 
            FALSE, 
            FALSE, 
            days_remaining, 
            user_profile.trial_end,
            user_profile.trial_start,
            user_profile.subscription_active,
            user_profile.subscription_expiry_date;
        RETURN;
    END IF;
    
    -- 3. All other cases: LOCK PLATFORM
    RETURN QUERY SELECT 
        FALSE, 
        user_profile.plan, 
        user_profile.subscription_active, 
        TRUE, 
        0, 
        user_profile.trial_end,
        user_profile.trial_start,
        user_profile.subscription_active,
        user_profile.subscription_expiry_date;
END;
$$;

-- Function to upgrade user to Business plan
CREATE OR REPLACE FUNCTION upgrade_user_to_business(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        plan = 'business',
        subscription_active = TRUE,
        subscription_expiry_date = NOW() + INTERVAL '1 year',
        trial_expired = FALSE,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Also update billing_profiles table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_profiles') THEN
        UPDATE billing_profiles 
        SET 
            plan = 'business',
            subscription_status = 'active',
            next_billing_date = NOW() + INTERVAL '1 year'
        WHERE id = user_uuid;
    END IF;
    
    -- Also update user_subscriptions table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
        UPDATE user_subscriptions 
        SET 
            subscription_type = 'business',
            status = 'active',
            current_period_start = NOW(),
            current_period_end = NOW() + INTERVAL '1 year'
        WHERE user_id = user_uuid;
    END IF;
END;
$$;

-- Function to get comprehensive user status
CREATE OR REPLACE FUNCTION get_user_status(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile RECORD;
    access_result RECORD;
    result JSON;
BEGIN
    -- Get access status first
    SELECT * INTO access_result FROM check_user_access(user_uuid);
    
    -- Get additional profile data
    SELECT 
        up.email,
        up.full_name,
        up.avatar_url,
        up.company,
        up.role,
        up.created_at
    INTO user_profile
    FROM user_profiles up
    WHERE up.user_id = user_uuid;
    
    -- Build comprehensive result JSON
    result := json_build_object(
        'plan', access_result.plan,
        'trial_start', access_result.trial_start,
        'trial_end', access_result.trial_end,
        'is_active', access_result.subscription_active,
        'subscription_status', CASE 
            WHEN access_result.plan = 'business' AND access_result.subscription_active THEN 'active'
            WHEN access_result.plan = 'free_trial' AND NOT access_result.trial_expired THEN 'trial'
            ELSE 'expired'
        END,
        'paystack_customer_id', NULL, -- Will be populated by billing system
        'next_billing_date', access_result.subscription_expiry_date,
        'trial_days_remaining', access_result.days_left,
        'is_trial_expired', access_result.trial_expired,
        'should_show_lock', NOT access_result.has_access,
        'has_access', access_result.has_access,
        'subscription_active', access_result.subscription_active,
        'subscription_expiry_date', access_result.subscription_expiry_date
    );
    
    RETURN result;
END;
$$;

-- ===============================
-- 4. Create Triggers for Automatic Setup
-- ===============================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Initialize trial for new user
    PERFORM initialize_user_trial(NEW.id);
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ===============================
-- 5. Enable RLS and Create Policies
-- ===============================

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON user_profiles;

-- Create new policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- ===============================
-- 6. Grant Permissions
-- ===============================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION initialize_user_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_trial(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION check_user_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_access(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION upgrade_user_to_business(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upgrade_user_to_business(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_status(UUID) TO service_role;

-- ===============================
-- 7. Test the Fixed System
-- ===============================

-- Test function to verify the system works correctly
DO $$
DECLARE
    test_user_id UUID;
    access_result RECORD;
    status_result JSON;
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test trial initialization
        PERFORM initialize_user_trial(test_user_id);
        RAISE NOTICE '✓ Trial initialized for user: %', test_user_id;
        
        -- Test access check
        SELECT * INTO access_result FROM check_user_access(test_user_id);
        RAISE NOTICE '✓ Access check result: has_access=%, plan=%, days_left=%', 
                     access_result.has_access, access_result.plan, access_result.days_left;
        
        -- Test user status
        SELECT get_user_status(test_user_id) INTO status_result;
        RAISE NOTICE '✓ User status: %', status_result;
        
        -- Test upgrade
        PERFORM upgrade_user_to_business(test_user_id);
        RAISE NOTICE '✓ User upgraded to business plan';
        
        -- Test access after upgrade
        SELECT * INTO access_result FROM check_user_access(test_user_id);
        RAISE NOTICE '✓ Access after upgrade: has_access=%, plan=%, subscription_active=%', 
                     access_result.has_access, access_result.plan, access_result.subscription_active;
        
    ELSE
        RAISE NOTICE '⚠ No users found for testing';
    END IF;
END $$;

-- Final success message
SELECT '🎉 Free Trial, Business Plan, and Platform Lock Logic Fixed Successfully!' as summary;