-- ===============================================
-- FIX LOCK SCREEN LOGIC FOR NOTEX BILLING/TRIAL FLOW
-- ===============================================
-- This script implements the complete fix for the lock screen logic
-- ensuring new users get 8-day free trials and business users stay unlocked

-- ===============================================
-- STEP 1: Ensure profiles table has all required fields
-- ===============================================

-- Add missing columns to profiles table if they don't exist
DO $$
BEGIN
    -- Add plan column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'plan') THEN
        ALTER TABLE profiles ADD COLUMN plan TEXT DEFAULT 'free_trial';
        RAISE NOTICE 'Added plan column to profiles table';
    END IF;
    
    -- Add trial_start column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'trial_start') THEN
        ALTER TABLE profiles ADD COLUMN trial_start TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added trial_start column to profiles table';
    END IF;
    
    -- Add trial_end column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'trial_end') THEN
        ALTER TABLE profiles ADD COLUMN trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '8 days');
        RAISE NOTICE 'Added trial_end column to profiles table';
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added is_active column to profiles table';
    END IF;
END $$;

-- ===============================================
-- STEP 2: Create signup trigger for automatic free trial
-- ===============================================

-- Function to handle new user signup with free trial
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table with free trial setup
  INSERT INTO profiles (user_id, email, plan, trial_start, trial_end, is_active, created_at, updated_at)
  VALUES (
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
  
  RAISE NOTICE 'Created free trial profile for new user: %', NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===============================================
-- STEP 3: Create get_user_status RPC function
-- ===============================================

CREATE OR REPLACE FUNCTION get_user_status(user_uuid UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'plan', COALESCE(plan, 'free_trial'),
    'trial_start', COALESCE(trial_start, created_at),
    'trial_end', COALESCE(trial_end, created_at + INTERVAL '8 days'),
    'is_active', COALESCE(is_active, TRUE),
    'subscription_status', 'trial',
    'paystack_customer_id', NULL,
    'next_billing_date', NULL,
    'trial_days_remaining', GREATEST(0, EXTRACT(days FROM (COALESCE(trial_end, created_at + INTERVAL '8 days') - NOW()))::INTEGER),
    'is_trial_expired', COALESCE(trial_end, created_at + INTERVAL '8 days') < NOW(),
    'should_show_lock', (
      (COALESCE(plan, 'free_trial') = 'free_trial' AND COALESCE(trial_end, created_at + INTERVAL '8 days') < NOW()) OR
      (COALESCE(plan, 'free_trial') = 'business' AND COALESCE(is_active, TRUE) = FALSE)
    )
  )
  FROM profiles
  WHERE user_id = user_uuid
  LIMIT 1;
$$;

-- ===============================================
-- STEP 4: Create function to update user plan after payment
-- ===============================================

CREATE OR REPLACE FUNCTION update_user_plan_after_payment(
    user_uuid UUID,
    new_plan TEXT,
    paystack_customer_id TEXT DEFAULT NULL,
    paystack_subscription_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Update profiles table
    UPDATE profiles
    SET 
        plan = new_plan,
        is_active = TRUE,
        updated_at = NOW()
    WHERE user_id = user_uuid;
    
    -- Return updated status
    SELECT get_user_status(user_uuid) INTO result;
    
    RETURN result;
END;
$$;

-- ===============================================
-- STEP 5: Ensure existing users have proper profile data
-- ===============================================

-- Create profiles for existing users who don't have them
INSERT INTO profiles (user_id, email, plan, trial_start, trial_end, is_active, created_at, updated_at)
SELECT 
    id,
    email,
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

-- Fix any existing profiles with NULL trial_end dates
UPDATE profiles 
SET trial_end = COALESCE(trial_start, created_at) + INTERVAL '8 days'
WHERE trial_end IS NULL AND plan = 'free_trial';

-- ===============================================
-- STEP 6: Grant permissions
-- ===============================================

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_plan_after_payment(UUID, TEXT, TEXT, TEXT) TO service_role;

-- ===============================================
-- STEP 7: Create Paystack webhook function
-- ===============================================

CREATE OR REPLACE FUNCTION handle_paystack_webhook(
    event_type TEXT,
    user_email TEXT,
    subscription_status TEXT DEFAULT 'active'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_uuid UUID;
    result JSONB;
BEGIN
    -- Find user by email
    SELECT id INTO user_uuid FROM auth.users WHERE email = user_email;
    
    IF user_uuid IS NULL THEN
        RETURN jsonb_build_object('error', 'User not found');
    END IF;
    
    -- Update user plan based on webhook event
    IF event_type = 'subscription.create' OR event_type = 'subscription.enable' THEN
        UPDATE profiles 
        SET plan = 'business', is_active = TRUE, updated_at = NOW()
        WHERE user_id = user_uuid;
    ELSIF event_type = 'subscription.disable' OR event_type = 'subscription.terminate' THEN
        UPDATE profiles 
        SET is_active = FALSE, updated_at = NOW()
        WHERE user_id = user_uuid;
    END IF;
    
    -- Return updated status
    SELECT get_user_status(user_uuid) INTO result;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION handle_paystack_webhook(TEXT, TEXT, TEXT) TO service_role;

-- ===============================================
-- COMPLETION MESSAGE
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Lock screen logic fix completed successfully!';
    RAISE NOTICE '📊 What was implemented:';
    RAISE NOTICE '   • Profiles table updated with required fields';
    RAISE NOTICE '   • Signup trigger for automatic free trial setup';
    RAISE NOTICE '   • get_user_status RPC function';
    RAISE NOTICE '   • update_user_plan_after_payment function';
    RAISE NOTICE '   • Paystack webhook handler';
    RAISE NOTICE '   • Existing users migrated to free trial';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Expected behavior:';
    RAISE NOTICE '   • New users → 8 days free access, then locked if no upgrade';
    RAISE NOTICE '   • Paid Business users → never locked while active';
    RAISE NOTICE '   • Expired or canceled users → locked with Upgrade CTA';
END $$;