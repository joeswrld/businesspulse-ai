-- ===============================
-- COMPREHENSIVE SAFE MIGRATION
-- ===============================

-- 0. Ensure required columns exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free_trial' CHECK (plan IN ('free_trial','business'));

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT FALSE;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS subscription_expiry_date TIMESTAMPTZ;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS trial_expired BOOLEAN DEFAULT FALSE;

-- 1. Fix existing data
UPDATE user_profiles
SET 
    trial_start = COALESCE(trial_start, created_at),
    trial_end = COALESCE(trial_end, created_at + INTERVAL '8 days'),
    plan = COALESCE(plan, 'free_trial'),
    subscription_active = COALESCE(subscription_active, FALSE),
    trial_expired = CASE WHEN COALESCE(trial_end, created_at + INTERVAL '8 days') < NOW() THEN TRUE ELSE FALSE END
WHERE trial_start IS NULL OR trial_end IS NULL;

UPDATE user_profiles
SET 
    subscription_active = TRUE,
    subscription_expiry_date = COALESCE(subscription_expiry_date, NOW() + INTERVAL '1 year'),
    trial_expired = FALSE
WHERE plan = 'business' AND subscription_active = FALSE;

-- 2. Drop old functions to avoid 42P13 errors
DROP FUNCTION IF EXISTS check_user_access(UUID) CASCADE;
DROP FUNCTION IF EXISTS initialize_user_trial(UUID) CASCADE;
DROP FUNCTION IF EXISTS upgrade_user_to_business(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_status(UUID) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- 3. Create functions
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
        user_id, trial_start, trial_end, plan, subscription_active, trial_expired, created_at, updated_at
    )
    VALUES (
        user_uuid, trial_start_time, trial_end_time, 'free_trial', FALSE, FALSE, NOW(), NOW()
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
    SELECT plan, subscription_active, trial_expired, trial_end, trial_start, subscription_expiry_date
    INTO user_profile
    FROM user_profiles
    WHERE user_id = user_uuid;

    IF NOT FOUND THEN
        PERFORM initialize_user_trial(user_uuid);
        SELECT plan, subscription_active, trial_expired, trial_end, trial_start, subscription_expiry_date
        INTO user_profile
        FROM user_profiles
        WHERE user_id = user_uuid;
    END IF;

    days_remaining := COALESCE(GREATEST(0, EXTRACT(DAY FROM (user_profile.trial_end - current_time))::INT),0);

    IF user_profile.plan = 'business' AND user_profile.subscription_active = TRUE THEN
        IF user_profile.subscription_expiry_date IS NULL OR user_profile.subscription_expiry_date > current_time THEN
            RETURN QUERY SELECT TRUE, user_profile.plan, TRUE, FALSE, days_remaining, user_profile.trial_end, user_profile.trial_start, user_profile.subscription_active, user_profile.subscription_expiry_date;
            RETURN;
        END IF;
    END IF;

    IF user_profile.plan = 'free_trial' AND user_profile.trial_end > current_time THEN
        RETURN QUERY SELECT TRUE, user_profile.plan, FALSE, FALSE, days_remaining, user_profile.trial_end, user_profile.trial_start, user_profile.subscription_active, user_profile.subscription_expiry_date;
        RETURN;
    END IF;

    RETURN QUERY SELECT FALSE, user_profile.plan, user_profile.subscription_active, TRUE, 0, user_profile.trial_end, user_profile.trial_start, user_profile.subscription_active, user_profile.subscription_expiry_date;
END;
$$;

CREATE OR REPLACE FUNCTION upgrade_user_to_business(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE user_profiles
    SET plan='business', subscription_active=TRUE, subscription_expiry_date=NOW()+INTERVAL '1 year', trial_expired=FALSE, updated_at=NOW()
    WHERE user_id=user_uuid;

    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='billing_profiles') THEN
        UPDATE billing_profiles
        SET plan='business', subscription_status='active', next_billing_date=NOW()+INTERVAL '1 year'
        WHERE id=user_uuid;
    END IF;

    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='user_subscriptions') THEN
        UPDATE user_subscriptions
        SET subscription_type='business', status='active', current_period_start=NOW(), current_period_end=NOW()+INTERVAL '1 year'
        WHERE user_id=user_uuid;
    END IF;
END;
$$;

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
    SELECT * INTO access_result FROM check_user_access(user_uuid);

    SELECT email, full_name, avatar_url, company, role, created_at
    INTO user_profile
    FROM user_profiles
    WHERE user_id=user_uuid;

    result := json_build_object(
        'plan', access_result.plan,
        'trial_start', access_result.trial_start,
        'trial_end', access_result.trial_end,
        'is_active', access_result.subscription_active,
        'subscription_status', CASE 
            WHEN access_result.plan='business' AND access_result.subscription_active THEN 'active'
            WHEN access_result.plan='free_trial' AND NOT access_result.trial_expired THEN 'trial'
            ELSE 'expired'
        END,
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

-- 4. Triggers for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM initialize_user_trial(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- ✅ Migration complete
RAISE NOTICE '🎉 Free Trial, Business Plan, and Platform Lock Logic Fixed Successfully!';
