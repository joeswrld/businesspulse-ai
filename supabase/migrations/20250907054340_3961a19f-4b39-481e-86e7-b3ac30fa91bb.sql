-- Fix NoteX billing/trial flow with proper user status management
-- Create comprehensive user status system

-- Step 1: Ensure profiles table has all required columns
DO $$
BEGIN
    -- Add plan column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'plan') THEN
        ALTER TABLE profiles ADD COLUMN plan TEXT DEFAULT 'free_trial';
    END IF;
    
    -- Add trial_start column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'trial_start') THEN
        ALTER TABLE profiles ADD COLUMN trial_start TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add trial_end column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'trial_end') THEN
        ALTER TABLE profiles ADD COLUMN trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '8 days');
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Step 2: Create or replace the get_user_status function
CREATE OR REPLACE FUNCTION get_user_status(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile RECORD;
    result JSON;
BEGIN
    -- Get user profile with all billing info
    SELECT 
        p.plan,
        p.trial_start,
        p.trial_end,
        p.is_active,
        p.created_at,
        bp.subscription_status,
        bp.paystack_customer_id,
        bp.next_billing_date
    INTO user_profile
    FROM profiles p
    LEFT JOIN billing_profiles bp ON bp.id = p.user_id
    WHERE p.user_id = user_uuid;
    
    -- If no profile exists, create one with free trial
    IF NOT FOUND THEN
        INSERT INTO profiles (
            user_id,
            plan,
            trial_start,
            trial_end,
            is_active
        ) VALUES (
            user_uuid,
            'free_trial',
            NOW(),
            NOW() + INTERVAL '8 days',
            TRUE
        )
        RETURNING plan, trial_start, trial_end, is_active, created_at
        INTO user_profile.plan, user_profile.trial_start, user_profile.trial_end, user_profile.is_active, user_profile.created_at;
        
        -- Set default values for billing profile fields
        user_profile.subscription_status := 'trial';
        user_profile.paystack_customer_id := NULL;
        user_profile.next_billing_date := NULL;
    END IF;
    
    -- Build result JSON
    result := json_build_object(
        'plan', COALESCE(user_profile.plan, 'free_trial'),
        'trial_start', user_profile.trial_start,
        'trial_end', user_profile.trial_end,
        'is_active', COALESCE(user_profile.is_active, TRUE),
        'subscription_status', COALESCE(user_profile.subscription_status, 'trial'),
        'paystack_customer_id', user_profile.paystack_customer_id,
        'next_billing_date', user_profile.next_billing_date,
        'trial_days_remaining', GREATEST(0, EXTRACT(days FROM (user_profile.trial_end - NOW()))::INTEGER),
        'is_trial_expired', (user_profile.trial_end < NOW()),
        'should_show_lock', (
            (user_profile.plan = 'free_trial' AND user_profile.trial_end < NOW()) OR
            (user_profile.plan = 'business' AND user_profile.is_active = FALSE)
        )
    );
    
    RETURN result;
END;
$$;

-- Step 3: Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION create_user_profile_with_trial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (
        user_id,
        email,
        plan,
        trial_start,
        trial_end,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        'free_trial',
        NOW(),
        NOW() + INTERVAL '8 days',
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;

-- Create the trigger
CREATE TRIGGER create_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile_with_trial();

-- Step 4: Create function to update user plan after payment
CREATE OR REPLACE FUNCTION update_user_plan_after_payment(
    user_uuid UUID,
    new_plan TEXT,
    paystack_customer_id TEXT DEFAULT NULL,
    paystack_subscription_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Update profiles table
    UPDATE profiles
    SET 
        plan = new_plan,
        is_active = TRUE,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Update or create billing profile
    INSERT INTO billing_profiles (
        id,
        plan,
        subscription_status,
        paystack_customer_id,
        paystack_subscription_id,
        next_billing_date,
        created_at
    ) VALUES (
        user_uuid,
        new_plan,
        'active',
        paystack_customer_id,
        paystack_subscription_id,
        NOW() + INTERVAL '30 days',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        plan = EXCLUDED.plan,
        subscription_status = EXCLUDED.subscription_status,
        paystack_customer_id = EXCLUDED.paystack_customer_id,
        paystack_subscription_id = EXCLUDED.paystack_subscription_id,
        next_billing_date = EXCLUDED.next_billing_date;
    
    -- Return updated status
    SELECT get_user_status(user_uuid) INTO result;
    
    RETURN result;
END;
$$;

-- Step 5: Ensure existing users have proper profile data
INSERT INTO profiles (user_id, plan, trial_start, trial_end, is_active, created_at, updated_at)
SELECT 
    id,
    'free_trial',
    NOW(),
    NOW() + INTERVAL '8 days',
    TRUE,
    NOW(),
    NOW()
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM profiles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO UPDATE SET
    plan = COALESCE(profiles.plan, 'free_trial'),
    trial_start = COALESCE(profiles.trial_start, NOW()),
    trial_end = COALESCE(profiles.trial_end, NOW() + INTERVAL '8 days'),
    is_active = COALESCE(profiles.is_active, TRUE),
    updated_at = NOW();

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_plan_after_payment(UUID, TEXT, TEXT, TEXT) TO service_role;