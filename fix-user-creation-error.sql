-- Fix for user creation database error
-- This script improves the trigger function and adds better error handling

-- First, let's check if the trigger exists and drop it if there are issues
DO $$
BEGIN
  -- Drop the problematic trigger if it exists
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_billing_profile') THEN
    DROP TRIGGER IF EXISTS trigger_create_billing_profile ON auth.users;
    RAISE NOTICE 'Dropped existing trigger_create_billing_profile';
  END IF;
END $$;

-- Drop the function to recreate it with better error handling
DROP FUNCTION IF EXISTS create_billing_profile();

-- Create an improved version of the function with better error handling
CREATE OR REPLACE FUNCTION create_billing_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if billing_profiles table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'billing_profiles') THEN
    RAISE NOTICE 'billing_profiles table does not exist, skipping profile creation';
    RETURN NEW;
  END IF;

  -- Check if the user already has a billing profile
  IF EXISTS (SELECT 1 FROM billing_profiles WHERE id = NEW.id) THEN
    RAISE NOTICE 'User % already has a billing profile, skipping creation', NEW.id;
    RETURN NEW;
  END IF;

  -- Try to create the billing profile with error handling
  BEGIN
    INSERT INTO billing_profiles (id, plan, trial_ends_at, subscription_status)
    VALUES (
      NEW.id,
      'trial',
      NOW() + INTERVAL '8 days',
      'trial'
    );
    
    RAISE NOTICE 'Successfully created billing profile for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create billing profile for user %: %', NEW.id, SQLERRM;
    -- Don't re-raise the error - let the user creation succeed
  END;

  -- Try to create usage tracking record
  BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usage_tracking') THEN
      INSERT INTO usage_tracking (id, user_id, feedback_count, analytics_count, reports_count, insights_count, teams_count)
      VALUES (
        NEW.id,
        NEW.id,
        0,
        0,
        0,
        0,
        0
      );
      RAISE NOTICE 'Successfully created usage tracking for user %', NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create usage tracking for user %: %', NEW.id, SQLERRM;
  END;

  -- Try to create user subscription record
  BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
      INSERT INTO user_subscriptions (user_id, plan_code, plan_name, status)
      VALUES (
        NEW.id,
        'trial',
        'Free Trial (8 days)',
        'active'
      );
      RAISE NOTICE 'Successfully created user subscription for user %', NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user subscription for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger with the improved function
CREATE TRIGGER trigger_create_billing_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_billing_profile();

-- Also create a manual function to create profiles for existing users
CREATE OR REPLACE FUNCTION create_missing_billing_profiles()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Create billing profiles for users who don't have them
  FOR user_record IN 
    SELECT u.id, u.created_at 
    FROM auth.users u 
    WHERE NOT EXISTS (SELECT 1 FROM billing_profiles bp WHERE bp.id = u.id)
  LOOP
    BEGIN
      INSERT INTO billing_profiles (id, plan, trial_ends_at, subscription_status)
      VALUES (
        user_record.id,
        'trial',
        user_record.created_at + INTERVAL '8 days',
        'trial'
      );
      RAISE NOTICE 'Created billing profile for existing user %', user_record.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create billing profile for user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create missing profiles
SELECT create_missing_billing_profiles();

-- Clean up
DROP FUNCTION IF EXISTS create_missing_billing_profiles();

-- Add a comment explaining the fix
COMMENT ON FUNCTION create_billing_profile() IS 'Improved trigger function for creating billing profiles with better error handling';
COMMENT ON TRIGGER trigger_create_billing_profile ON auth.users IS 'Automatically creates billing profile, usage tracking, and subscription for new users';