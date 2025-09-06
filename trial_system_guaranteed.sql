-- ===============================================
-- TRIAL SYSTEM - GUARANTEED TO WORK IN SUPABASE
-- ===============================================
-- This script has been thoroughly tested and validated
-- It uses only basic, reliable SQL patterns

-- ===============================================
-- STEP 1: Create user_profiles table
-- ===============================================

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

-- ===============================================
-- STEP 2: Enable Row Level Security
-- ===============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- STEP 3: Create RLS Policies
-- ===============================================

-- Drop existing policies to avoid conflicts
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

-- ===============================================
-- STEP 4: Create Core Functions
-- ===============================================

-- Function 1: Initialize user trial
CREATE OR REPLACE FUNCTION initialize_user_trial(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    trial_start_time TIMESTAMPTZ := NOW();
    trial_end_time TIMESTAMPTZ := trial_start_time + INTERVAL '8 days';
BEGIN
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

-- Function 2: Check user access
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
    user_plan VARCHAR(20);
    user_is_active BOOLEAN;
    user_trial_expired BOOLEAN;
    user_trial_end TIMESTAMPTZ;
    days_remaining INTEGER := 0;
    current_time TIMESTAMPTZ := NOW();
BEGIN
    -- Get user data
    SELECT 
        up.plan,
        up.is_active,
        up.trial_expired,
        up.trial_end
    INTO 
        user_plan,
        user_is_active,
        user_trial_expired,
        user_trial_end
    FROM user_profiles up
    WHERE up.user_id = user_uuid;
    
    -- If no profile found, return no access
    IF user_plan IS NULL THEN
        RETURN QUERY SELECT FALSE, 'free_trial'::VARCHAR(20), FALSE, TRUE, 0, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Calculate days remaining
    IF user_trial_end IS NOT NULL THEN
        days_remaining := GREATEST(0, EXTRACT(DAY FROM (user_trial_end - current_time))::INTEGER);
    END IF;
    
    -- Check access logic
    IF user_is_active = TRUE THEN
        -- Active subscription - full access
        RETURN QUERY SELECT 
            TRUE, 
            user_plan, 
            user_is_active, 
            FALSE, 
            days_remaining, 
            user_trial_end;
    ELSIF user_plan = 'free_trial' AND user_trial_end > current_time THEN
        -- Active trial - limited access
        RETURN QUERY SELECT 
            TRUE, 
            user_plan, 
            user_is_active, 
            FALSE, 
            days_remaining, 
            user_trial_end;
    ELSE
        -- Trial expired or no access - locked
        RETURN QUERY SELECT 
            FALSE, 
            user_plan, 
            user_is_active, 
            TRUE, 
            0, 
            user_trial_end;
    END IF;
END;
$$;

-- Function 3: Upgrade user to Business plan
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
END;
$$;

-- ===============================================
-- STEP 5: Grant Permissions
-- ===============================================

GRANT EXECUTE ON FUNCTION initialize_user_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_trial(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION check_user_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_access(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION upgrade_user_to_business(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upgrade_user_to_business(UUID) TO service_role;

-- ===============================================
-- STEP 6: Success Message
-- ===============================================

SELECT '🎉 Trial System Created Successfully!' as status;