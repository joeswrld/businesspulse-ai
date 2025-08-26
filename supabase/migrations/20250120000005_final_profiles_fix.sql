-- Final profiles fix - handle existing profiles safely
-- This migration ensures all users have necessary records without creating duplicates

-- Function to safely ensure user has all necessary records
CREATE OR REPLACE FUNCTION ensure_user_records_safe(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_exists BOOLEAN;
    feedback_settings_exist BOOLEAN;
    subscription_exists BOOLEAN;
BEGIN
    -- Check if records exist
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id_param OR user_id = user_id_param) INTO profile_exists;
    SELECT EXISTS(SELECT 1 FROM feedback_settings WHERE user_id = user_id_param) INTO feedback_settings_exist;
    SELECT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id = user_id_param) INTO subscription_exists;
    
    -- Only create records that don't exist
    IF NOT profile_exists THEN
        -- Try to create profile with minimal data
        BEGIN
            INSERT INTO profiles (id) VALUES (user_id_param);
            RAISE NOTICE 'Created profile for user %', user_id_param;
        EXCEPTION WHEN OTHERS THEN
            -- If that fails, try with user_id
            BEGIN
                INSERT INTO profiles (user_id) VALUES (user_id_param);
                RAISE NOTICE 'Created profile with user_id for user %', user_id_param;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not create profile for user % - may already exist', user_id_param;
            END;
        END;
    END IF;
    
    IF NOT feedback_settings_exist THEN
        INSERT INTO feedback_settings (
            user_id,
            project_id,
            project_id_locked,
            title,
            show_name,
            show_email,
            button_text,
            theme,
            brand_color,
            redirect_url,
            notify_email
        ) VALUES (
            user_id_param,
            '',
            false,
            'Share your thoughts with us',
            true,
            true,
            'Send Feedback',
            'dark',
            '#2563eb',
            null,
            null
        );
        RAISE NOTICE 'Created feedback settings for user %', user_id_param;
    END IF;
    
    IF NOT subscription_exists THEN
        INSERT INTO user_subscriptions (
            user_id,
            subscription_type,
            status,
            current_period_start,
            current_period_end
        ) VALUES (
            user_id_param,
            'free',
            'active',
            NOW(),
            NOW() + INTERVAL '1 year'
        );
        RAISE NOTICE 'Created subscription for user %', user_id_param;
    END IF;
    
    RAISE NOTICE 'User records check completed for user %', user_id_param;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ensure_user_records_safe(UUID) TO authenticated;

-- Update existing profiles with user data if possible
UPDATE profiles 
SET 
    email = COALESCE(profiles.email, auth_users.email),
    full_name = COALESCE(profiles.full_name, auth_users.raw_user_meta_data->>'full_name')
FROM auth.users auth_users
WHERE (profiles.id = auth_users.id OR profiles.user_id = auth_users.id)
AND (profiles.email IS NULL OR profiles.full_name IS NULL);

-- Ensure all existing users have the necessary records
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        PERFORM ensure_user_records_safe(user_record.id);
    END LOOP;
END $$;