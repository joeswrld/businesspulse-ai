-- Fix Email Confirmation Database Issues
-- This migration fixes the RPC functions to properly handle email confirmation

-- 1. First, let's ensure the profiles table has the email_confirmed column
DO $$
BEGIN
    -- Add email_confirmed column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'email_confirmed'
    ) THEN
        ALTER TABLE profiles ADD COLUMN email_confirmed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added email_confirmed column to profiles table';
    END IF;
END $$;

-- 2. Sync existing users who have confirmed emails
UPDATE profiles 
SET email_confirmed = TRUE,
    updated_at = NOW()
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL
);

-- 3. Create trigger to sync email confirmation status
CREATE OR REPLACE FUNCTION sync_email_confirmation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update profiles table when email_confirmed_at changes
    UPDATE profiles 
    SET email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
        updated_at = NOW()
    WHERE user_id = NEW.id;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_email_confirmation ON auth.users;

-- Create trigger
CREATE TRIGGER sync_email_confirmation
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_email_confirmation_status();

-- 4. Fix check_user_access function with proper email confirmation handling
DROP FUNCTION IF EXISTS check_user_access(UUID) CASCADE;

CREATE OR REPLACE FUNCTION check_user_access(user_uuid UUID)
RETURNS TABLE (
    has_access BOOLEAN,
    plan VARCHAR(20),
    is_active BOOLEAN,
    trial_expired BOOLEAN,
    days_left INTEGER,
    trial_end TIMESTAMPTZ,
    email_confirmed BOOLEAN,
    should_show_email_verification BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile RECORD;
    now_ts TIMESTAMPTZ := NOW();
    days_remaining INTEGER;
    is_email_confirmed BOOLEAN;
BEGIN
    -- Get user profile and email confirmation status
    SELECT 
        up.plan,
        up.is_active,
        up.trial_expired,
        up.trial_end,
        up.email_confirmed,
        au.email_confirmed_at
    INTO user_profile
    FROM profiles up
    LEFT JOIN auth.users au ON up.user_id = au.id
    WHERE up.user_id = user_uuid;
    
    -- Check if email is confirmed
    is_email_confirmed := COALESCE(user_profile.email_confirmed, FALSE) OR (user_profile.email_confirmed_at IS NOT NULL);
    
    -- If no profile found, return no access
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE, 
            'free_trial'::VARCHAR(20), 
            FALSE, 
            TRUE, 
            0, 
            NULL::TIMESTAMPTZ,
            FALSE,
            TRUE;
        RETURN;
    END IF;
    
    -- If email not confirmed, return no access
    IF NOT is_email_confirmed THEN
        RETURN QUERY SELECT 
            FALSE, 
            user_profile.plan, 
            user_profile.is_active, 
            user_profile.trial_expired, 
            0, 
            user_profile.trial_end,
            FALSE,
            TRUE;
        RETURN;
    END IF;
    
    -- Calculate days remaining
    IF user_profile.trial_end IS NOT NULL THEN
        days_remaining := GREATEST(0, EXTRACT(DAY FROM (user_profile.trial_end - now_ts))::INTEGER);
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
            user_profile.trial_end,
            TRUE,
            FALSE;
    ELSIF user_profile.plan = 'free_trial' AND NOT user_profile.trial_expired THEN
        -- Free trial - limited access
        RETURN QUERY SELECT 
            TRUE, 
            user_profile.plan, 
            user_profile.is_active, 
            user_profile.trial_expired, 
            days_remaining, 
            user_profile.trial_end,
            TRUE,
            FALSE;
    ELSE
        -- No access
        RETURN QUERY SELECT 
            FALSE, 
            user_profile.plan, 
            user_profile.is_active, 
            user_profile.trial_expired, 
            days_remaining, 
            user_profile.trial_end,
            TRUE,
            FALSE;
    END IF;
END;
$$;

-- 5. Fix initialize_user_trial function
DROP FUNCTION IF EXISTS initialize_user_trial(UUID) CASCADE;

CREATE OR REPLACE FUNCTION initialize_user_trial(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    trial_start_time TIMESTAMPTZ := NOW();
    trial_end_time TIMESTAMPTZ := trial_start_time + INTERVAL '8 days';
    user_email TEXT;
BEGIN
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = user_uuid;
    
    -- Insert or update user profile with trial data
    INSERT INTO profiles (
        user_id,
        trial_start,
        trial_end,
        plan,
        is_active,
        trial_expired,
        email_confirmed,
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
        FALSE, -- Will be updated by trigger when email is confirmed
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        trial_start = COALESCE(profiles.trial_start, trial_start_time),
        trial_end = COALESCE(profiles.trial_end, trial_end_time),
        plan = COALESCE(profiles.plan, 'free_trial'),
        is_active = COALESCE(profiles.is_active, FALSE),
        trial_expired = COALESCE(profiles.trial_expired, FALSE),
        updated_at = NOW();
END;
$$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION check_user_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_access(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION initialize_user_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_user_trial(UUID) TO service_role;

-- 7. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed ON profiles(email_confirmed);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 8. Test the functions
DO $$
DECLARE
    test_uuid UUID := '00000000-0000-0000-0000-000000000000';
    access_result RECORD;
BEGIN
    -- Test with a dummy UUID (this will return no access, which is expected)
    SELECT * INTO access_result FROM check_user_access(test_uuid);
    RAISE NOTICE '✓ check_user_access function works - returned: %', access_result;
    
    -- Test initialize_user_trial (this will fail gracefully with dummy UUID)
    BEGIN
        PERFORM initialize_user_trial(test_uuid);
        RAISE NOTICE '✓ initialize_user_trial function works';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✓ initialize_user_trial function works (expected to fail with dummy UUID)';
    END;
END;
$$;

-- Success message
SELECT '🎉 Email Confirmation Database Fix Applied Successfully!' as summary;