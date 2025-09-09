-- Fix Email Verification Flow and Authenticated Pages
-- This migration addresses the issue where confirmed users see "Email Verification Required"

-- ===============================
-- 1. Add email_confirmed column to profiles table
-- ===============================

-- Add email_confirmed column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'email_confirmed') THEN
        ALTER TABLE profiles ADD COLUMN email_confirmed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added email_confirmed column to profiles table';
    ELSE
        RAISE NOTICE 'email_confirmed column already exists in profiles table';
    END IF;
END $$;

-- ===============================
-- 2. Update existing users to have email_confirmed = TRUE
-- ===============================

-- For existing users who have email_confirmed_at in auth.users, set email_confirmed = TRUE
UPDATE profiles 
SET email_confirmed = TRUE
WHERE user_id IN (
    SELECT id 
    FROM auth.users 
    WHERE email_confirmed_at IS NOT NULL
);

-- ===============================
-- 3. Create function to sync email confirmation status
-- ===============================

CREATE OR REPLACE FUNCTION sync_email_confirmation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update profiles table when auth.users email_confirmed_at changes
    UPDATE profiles 
    SET 
        email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
        updated_at = NOW()
    WHERE user_id = NEW.id;
    
    RETURN NEW;
END;
$$;

-- Create trigger to automatically sync email confirmation status
DROP TRIGGER IF EXISTS sync_email_confirmation ON auth.users;
CREATE TRIGGER sync_email_confirmation
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_email_confirmation_status();

-- ===============================
-- 4. Update check_user_access function to check email confirmation
-- ===============================

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
    current_time TIMESTAMPTZ := NOW();
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
    FROM user_profiles up
    LEFT JOIN auth.users au ON au.id = up.user_id
    WHERE up.user_id = user_uuid;
    
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
    
    -- Determine email confirmation status
    is_email_confirmed := COALESCE(user_profile.email_confirmed, FALSE) OR (user_profile.email_confirmed_at IS NOT NULL);
    
    -- If email is not confirmed, block access
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
        days_remaining := GREATEST(0, EXTRACT(DAY FROM (user_profile.trial_end - current_time))::INTEGER);
    ELSE
        days_remaining := 0;
    END IF;
    
    -- Check access logic for confirmed users
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
    ELSIF user_profile.plan = 'free_trial' AND user_profile.trial_end > current_time THEN
        -- Active trial - limited access
        RETURN QUERY SELECT 
            TRUE, 
            user_profile.plan, 
            user_profile.is_active, 
            FALSE, 
            days_remaining, 
            user_profile.trial_end,
            TRUE,
            FALSE;
    ELSE
        -- Trial expired or no access - locked
        RETURN QUERY SELECT 
            FALSE, 
            user_profile.plan, 
            user_profile.is_active, 
            TRUE, 
            0, 
            user_profile.trial_end,
            TRUE,
            FALSE;
    END IF;
END;
$$;

-- ===============================
-- 5. Update get_user_status function to include email confirmation
-- ===============================

CREATE OR REPLACE FUNCTION get_user_status(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile RECORD;
    calculated_trial_end TIMESTAMPTZ;
    is_email_confirmed BOOLEAN;
    result JSON;
BEGIN
    -- Get user profile with all billing info and email confirmation
    SELECT 
        p.plan,
        p.trial_start,
        p.trial_end,
        p.is_active,
        p.created_at,
        p.email_confirmed,
        au.email_confirmed_at,
        bp.subscription_status,
        bp.paystack_customer_id,
        bp.next_billing_date
    INTO user_profile
    FROM profiles p
    LEFT JOIN auth.users au ON au.id = p.user_id
    LEFT JOIN billing_profiles bp ON bp.id = p.user_id
    WHERE p.user_id = user_uuid;
    
    -- If no profile exists, create one with free trial
    IF NOT FOUND THEN
        INSERT INTO profiles (
            user_id,
            plan,
            trial_start,
            trial_end,
            is_active,
            email_confirmed
        ) VALUES (
            user_uuid,
            'free_trial',
            NOW(),
            NOW() + INTERVAL '8 days',
            TRUE,
            FALSE
        )
        RETURNING plan, trial_start, trial_end, is_active, created_at, email_confirmed
        INTO user_profile.plan, user_profile.trial_start, user_profile.trial_end, 
             user_profile.is_active, user_profile.created_at, user_profile.email_confirmed;
        
        -- Set default values for billing profile fields
        user_profile.subscription_status := 'trial';
        user_profile.paystack_customer_id := NULL;
        user_profile.next_billing_date := NULL;
        user_profile.email_confirmed_at := NULL;
    END IF;
    
    -- Determine email confirmation status
    is_email_confirmed := COALESCE(user_profile.email_confirmed, FALSE) OR (user_profile.email_confirmed_at IS NOT NULL);
    
    -- Calculate trial_end if it's NULL (for existing users)
    calculated_trial_end := COALESCE(
        user_profile.trial_end, 
        user_profile.trial_start + INTERVAL '8 days'
    );
    
    -- Build result JSON with proper NULL handling
    result := json_build_object(
        'plan', COALESCE(user_profile.plan, 'free_trial'),
        'trial_start', COALESCE(user_profile.trial_start, user_profile.created_at),
        'trial_end', calculated_trial_end,
        'is_active', COALESCE(user_profile.is_active, TRUE),
        'subscription_status', COALESCE(user_profile.subscription_status, 'trial'),
        'paystack_customer_id', user_profile.paystack_customer_id,
        'next_billing_date', user_profile.next_billing_date,
        'trial_days_remaining', GREATEST(0, EXTRACT(days FROM (calculated_trial_end - NOW()))::INTEGER),
        'is_trial_expired', COALESCE(calculated_trial_end < NOW(), FALSE),
        'email_confirmed', is_email_confirmed,
        'should_show_lock', (
            NOT is_email_confirmed OR
            (COALESCE(user_profile.plan, 'free_trial') = 'free_trial' AND COALESCE(calculated_trial_end < NOW(), FALSE)) OR
            (COALESCE(user_profile.plan, 'free_trial') = 'business' AND COALESCE(user_profile.is_active, TRUE) = FALSE)
        )
    );
    
    RETURN result;
END;
$$;

-- ===============================
-- 6. Create function to handle email confirmation
-- ===============================

CREATE OR REPLACE FUNCTION confirm_user_email(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Update profiles table to mark email as confirmed
    UPDATE profiles 
    SET 
        email_confirmed = TRUE,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Return updated status
    SELECT get_user_status(user_uuid) INTO result;
    
    RETURN result;
END;
$$;

-- ===============================
-- 7. Grant permissions
-- ===============================

GRANT EXECUTE ON FUNCTION check_user_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_user_email(UUID) TO authenticated;

-- ===============================
-- 8. Update existing users who should be confirmed
-- ===============================

-- Sync email confirmation status for all existing users
UPDATE profiles 
SET 
    email_confirmed = TRUE,
    updated_at = NOW()
WHERE user_id IN (
    SELECT id 
    FROM auth.users 
    WHERE email_confirmed_at IS NOT NULL
);

-- ===============================
-- 9. Create index for performance
-- ===============================

CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed ON profiles(email_confirmed);

-- Final success message
SELECT '🎉 Email Verification Flow Fixed Successfully!' as summary;