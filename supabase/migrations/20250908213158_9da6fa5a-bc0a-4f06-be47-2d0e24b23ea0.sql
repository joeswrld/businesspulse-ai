-- Fix existing profiles with NULL trial_end dates
UPDATE profiles 
SET trial_end = trial_start + INTERVAL '8 days'
WHERE trial_end IS NULL AND plan = 'free_trial';

-- Create or replace the get_user_status function with better NULL handling
CREATE OR REPLACE FUNCTION get_user_status(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile RECORD;
    calculated_trial_end TIMESTAMPTZ;
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
        'should_show_lock', (
            (COALESCE(user_profile.plan, 'free_trial') = 'free_trial' AND COALESCE(calculated_trial_end < NOW(), FALSE)) OR
            (COALESCE(user_profile.plan, 'free_trial') = 'business' AND COALESCE(user_profile.is_active, TRUE) = FALSE)
        )
    );
    
    RETURN result;
END;
$$;