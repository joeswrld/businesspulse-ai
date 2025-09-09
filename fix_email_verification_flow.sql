-- ===============================
-- 0. DROP OLD FUNCTIONS (avoid 42P13)
-- ===============================
DROP FUNCTION IF EXISTS check_user_access(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_status(UUID) CASCADE;
DROP FUNCTION IF EXISTS confirm_user_email(UUID) CASCADE;

-- ===============================
-- 1. Add email_confirmed column if missing
-- ===============================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'email_confirmed') THEN
        ALTER TABLE profiles ADD COLUMN email_confirmed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added email_confirmed column to profiles table';
    END IF;
END $$;

-- ===============================
-- 2. Sync existing users who have confirmed emails
-- ===============================
UPDATE profiles 
SET email_confirmed = TRUE,
    updated_at = NOW()
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL
);

-- ===============================
-- 3. Trigger to sync auth.users changes to profiles
-- ===============================
CREATE OR REPLACE FUNCTION sync_email_confirmation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles
    SET email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
        updated_at = NOW()
    WHERE user_id = NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_email_confirmation ON auth.users;
CREATE TRIGGER sync_email_confirmation
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_email_confirmation_status();

-- ===============================
-- 4. Recreate check_user_access with correct OUT parameters
-- ===============================
CREATE FUNCTION check_user_access(user_uuid UUID)
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
    SELECT 
        up.plan,
        up.is_active,
        up.trial_expired,
        up.trial_end,
        up.email_confirmed,
        au.email_confirmed_at
    INTO user_profile
    FROM profiles up
    LEFT JOIN auth.users au ON au.id = up.user_id
    WHERE up.user_id = user_uuid;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE,'free_trial',FALSE,TRUE,0,NULL,FALSE,TRUE;
        RETURN;
    END IF;

    is_email_confirmed := COALESCE(user_profile.email_confirmed,FALSE) OR (user_profile.email_confirmed_at IS NOT NULL);

    IF NOT is_email_confirmed THEN
        RETURN QUERY SELECT FALSE,user_profile.plan,user_profile.is_active,user_profile.trial_expired,0,user_profile.trial_end,FALSE,TRUE;
        RETURN;
    END IF;

    days_remaining := GREATEST(0, EXTRACT(DAY FROM (user_profile.trial_end - now_ts))::INT);

    IF user_profile.is_active THEN
        RETURN QUERY SELECT TRUE,user_profile.plan,user_profile.is_active,FALSE,days_remaining,user_profile.trial_end,TRUE,FALSE;
    ELSIF user_profile.plan='free_trial' AND user_profile.trial_end>now_ts THEN
        RETURN QUERY SELECT TRUE,user_profile.plan,user_profile.is_active,FALSE,days_remaining,user_profile.trial_end,TRUE,FALSE;
    ELSE
        RETURN QUERY SELECT FALSE,user_profile.plan,user_profile.is_active,TRUE,0,user_profile.trial_end,TRUE,FALSE;
    END IF;
END;
$$;

-- ===============================
-- 5. Recreate get_user_status
-- ===============================
CREATE FUNCTION get_user_status(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile RECORD;
    trial_end_ts TIMESTAMPTZ;
    is_email_confirmed BOOLEAN;
    result JSON;
BEGIN
    SELECT p.plan,p.trial_start,p.trial_end,p.is_active,p.created_at,p.email_confirmed,au.email_confirmed_at,
           bp.subscription_status,bp.paystack_customer_id,bp.next_billing_date
    INTO user_profile
    FROM profiles p
    LEFT JOIN auth.users au ON au.id = p.user_id
    LEFT JOIN billing_profiles bp ON bp.id = p.user_id
    WHERE p.user_id = user_uuid;

    IF NOT FOUND THEN
        INSERT INTO profiles(user_id,plan,trial_start,trial_end,is_active,email_confirmed)
        VALUES (user_uuid,'free_trial',NOW(),NOW()+INTERVAL '8 days',TRUE,FALSE)
        RETURNING plan,trial_start,trial_end,is_active,created_at,email_confirmed
        INTO user_profile.plan,user_profile.trial_start,user_profile.trial_end,user_profile.is_active,user_profile.created_at,user_profile.email_confirmed;

        user_profile.subscription_status:='trial';
        user_profile.paystack_customer_id:=NULL;
        user_profile.next_billing_date:=NULL;
        user_profile.email_confirmed_at:=NULL;
    END IF;

    is_email_confirmed := COALESCE(user_profile.email_confirmed,FALSE) OR (user_profile.email_confirmed_at IS NOT NULL);
    trial_end_ts := COALESCE(user_profile.trial_end,user_profile.trial_start+INTERVAL '8 days');

    result := json_build_object(
        'plan', COALESCE(user_profile.plan,'free_trial'),
        'trial_start', COALESCE(user_profile.trial_start,user_profile.created_at),
        'trial_end', trial_end_ts,
        'is_active', COALESCE(user_profile.is_active,TRUE),
        'subscription_status', COALESCE(user_profile.subscription_status,'trial'),
        'paystack_customer_id', user_profile.paystack_customer_id,
        'next_billing_date', user_profile.next_billing_date,
        'trial_days_remaining', GREATEST(0, EXTRACT(days FROM (trial_end_ts - NOW()))::INT),
        'is_trial_expired', COALESCE(trial_end_ts<NOW(),FALSE),
        'email_confirmed', is_email_confirmed,
        'should_show_lock', (
            NOT is_email_confirmed OR
            (COALESCE(user_profile.plan,'free_trial')='free_trial' AND COALESCE(trial_end_ts<NOW(),FALSE)) OR
            (COALESCE(user_profile.plan,'free_trial')='business' AND COALESCE(user_profile.is_active,TRUE)=FALSE)
        )
    );

    RETURN result;
END;
$$;

-- ===============================
-- 6. Recreate confirm_user_email
-- ===============================
CREATE FUNCTION confirm_user_email(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    UPDATE profiles
    SET email_confirmed=TRUE,updated_at=NOW()
    WHERE user_id=user_uuid;

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
-- 8. Index for performance
-- ===============================
CREATE INDEX IF NOT EXISTS idx_profiles_email_confirmed ON profiles(email_confirmed);

-- ===============================
-- 9. Success notice
-- ===============================
SELECT '🎉 Email Verification Flow Fixed and check_user_access recreated safely!' as summary;
