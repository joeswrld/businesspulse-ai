-- Complete Fix for Trial System
-- This script fixes all issues and creates the complete trial system

-- ===============================
-- 1. Create user_profiles table with unique constraint
-- ===============================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    plan VARCHAR(20) DEFAULT 'free_trial',
    is_active BOOLEAN DEFAULT FALSE,
    trial_expired BOOLEAN DEFAULT FALSE
);

-- ===============================
-- 2. Add unique constraint if table already exists without it
-- ===============================

DO $$
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%user_id%'
    ) THEN
        -- Add unique constraint
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);
        RAISE NOTICE '✓ Added unique constraint to user_profiles.user_id';
    ELSE
        RAISE NOTICE '✓ Unique constraint already exists on user_profiles.user_id';
    END IF;
END $$;

-- ===============================
-- 3. Add missing columns if they don't exist
-- ===============================

-- Add trial_start column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'trial_start') THEN
        ALTER TABLE user_profiles ADD COLUMN trial_start TIMESTAMPTZ;
        RAISE NOTICE '✓ Added trial_start column';
    END IF;
END $$;

-- Add trial_end column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'trial_end') THEN
        ALTER TABLE user_profiles ADD COLUMN trial_end TIMESTAMPTZ;
        RAISE NOTICE '✓ Added trial_end column';
    END IF;
END $$;

-- Add plan column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'plan') THEN
        ALTER TABLE user_profiles ADD COLUMN plan VARCHAR(20) DEFAULT 'free_trial';
        RAISE NOTICE '✓ Added plan column';
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'is_active') THEN
        ALTER TABLE user_profiles ADD COLUMN is_active BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✓ Added is_active column';
    END IF;
END $$;

-- Add trial_expired column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'trial_expired') THEN
        ALTER TABLE user_profiles ADD COLUMN trial_expired BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✓ Added trial_expired column';
    END IF;
END $$;

-- ===============================
-- 4. Add indexes for performance
-- ===============================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan ON user_profiles(plan);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_end ON user_profiles(trial_end);

-- ===============================
-- 5. Enable RLS
-- ===============================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ===============================
-- 6. Create RLS policies
-- ===============================

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: System can insert profiles
DROP POLICY IF EXISTS "System can insert profiles" ON user_profiles;
CREATE POLICY "System can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- ===============================
-- 7. Create trial management functions
-- ===============================

-- Function to initialize trial for new users
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
        is_active,
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
        is_active = COALESCE(user_profiles.is_active, FALSE),
        trial_expired = COALESCE(user_profiles.trial_expired, FALSE),
        updated_at = NOW();
END;
$$;

-- Function to check if user has active access
CREATE OR REPLACE FUNCTION check_user_access(user_uuid UUID)
RETURNS TABLE (
    has_access BOOLEAN,
    plan VARCHAR(20),
    is_active BOOLEAN,
    trial_expired BOOLEAN,
    days_left INTEGER,
    trial_end TIMESTAMPTZ
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
        up.is_active,
        up.trial_expired,
        up.trial_end
    INTO user_profile
    FROM user_profiles up
    WHERE up.user_id = user_uuid;
    
    -- If no profile found, return no access
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'free_trial'::VARCHAR(20), FALSE, TRUE, 0, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Calculate days remaining
    IF user_profile.trial_end IS NOT NULL THEN
        days_remaining := GREATEST(0, EXTRACT(DAY FROM (user_profile.trial_end - current_time))::INTEGER);
    ELSE
        days_remaining := 0;
    END IF;
    
    -- Check access logic
    -- User has access if:
    -- 1. They have an active subscription (is_active = TRUE), OR
    -- 2. They are on free trial and trial hasn't expired yet
    IF user_profile.is_active = TRUE THEN
        -- Active subscription - full access
        RETURN QUERY SELECT 
            TRUE, 
            user_profile.plan, 
            user_profile.is_active, 
            FALSE, 
            days_remaining, 
            user_profile.trial_end;
    ELSIF user_profile.plan = 'free_trial' AND user_profile.trial_end > current_time THEN
        -- Active trial - limited access
        RETURN QUERY SELECT 
            TRUE, 
            user_profile.plan, 
            user_profile.is_active, 
            FALSE, 
            days_remaining, 
            user_profile.trial_end;
    ELSE
        -- Trial expired or no access - locked
        RETURN QUERY SELECT 
            FALSE, 
            user_profile.plan, 
            user_profile.is_active, 
            TRUE, 
            0, 
            user_profile.trial_end;
    END IF;
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
        is_active = TRUE,
        trial_expired = FALSE,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Also update subscriptions table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        UPDATE subscriptions 
        SET 
            plan_type = 'business',
            is_active = TRUE,
            updated_at = NOW()
        WHERE user_id = user_uuid;
    END IF;
END;
$$;

-- Function to expire trials (run daily via cron)
CREATE OR REPLACE FUNCTION expire_trials()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Mark trials as expired
    UPDATE user_profiles 
    SET 
        trial_expired = TRUE,
        is_active = FALSE,
        updated_at = NOW()
    WHERE 
        plan = 'free_trial' 
        AND trial_end <= NOW() 
        AND trial_expired = FALSE;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$;

-- Function to check if user can access feedback features
CREATE OR REPLACE FUNCTION can_access_feedback(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    access_result RECORD;
BEGIN
    SELECT has_access INTO access_result.has_access
    FROM check_user_access(user_uuid);
    
    RETURN access_result.has_access;
END;
$$;

-- Function to check if user can access analytics features
CREATE OR REPLACE FUNCTION can_access_analytics(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    access_result RECORD;
BEGIN
    SELECT has_access INTO access_result.has_access
    FROM check_user_access(user_uuid);
    
    RETURN access_result.has_access;
END;
$$;

-- ===============================
-- 8. Create triggers for automatic trial initialization
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
-- 9. Grant permissions
-- ===============================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION initialize_user_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_trial(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION check_user_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_access(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION upgrade_user_to_business(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upgrade_user_to_business(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION expire_trials() TO service_role;
GRANT EXECUTE ON FUNCTION can_access_feedback(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_feedback(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION can_access_analytics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_analytics(UUID) TO service_role;

-- ===============================
-- 10. Test the system
-- ===============================

-- Test function to verify trial system works
DO $$
DECLARE
    test_user_id UUID;
    access_result RECORD;
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
        
        -- Test upgrade
        PERFORM upgrade_user_to_business(test_user_id);
        RAISE NOTICE '✓ User upgraded to business plan';
        
        -- Test access after upgrade
        SELECT * INTO access_result FROM check_user_access(test_user_id);
        RAISE NOTICE '✓ Access after upgrade: has_access=%, plan=%, is_active=%', 
                     access_result.has_access, access_result.plan, access_result.is_active;
        
    ELSE
        RAISE NOTICE '⚠ No users found for testing';
    END IF;
END $$;

-- ===============================
-- 11. Final verification
-- ===============================

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Show constraints
SELECT 
    constraint_name,
    constraint_type,
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_profiles'
ORDER BY tc.constraint_name;

-- Show function signatures
SELECT 
    routine_name,
    routine_type,
    '✓ ' || routine_name || ' function created' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('initialize_user_trial', 'check_user_access', 'upgrade_user_to_business', 'expire_trials', 'can_access_feedback', 'can_access_analytics');

-- Final success message
SELECT '🎉 Complete Trial System Fixed and Created Successfully!' as summary;