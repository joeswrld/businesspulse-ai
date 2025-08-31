-- Fix for "Database error saving new user" issue
-- This migration removes the problematic trigger and creates a safer version

-- Step 1: Remove the problematic trigger that's causing user creation to fail
DROP TRIGGER IF EXISTS trigger_create_billing_profile ON auth.users;

-- Step 2: Drop the problematic function
DROP FUNCTION IF EXISTS create_billing_profile();

-- Step 3: Create a safer function with better error handling
CREATE OR REPLACE FUNCTION create_billing_profile_safe()
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a manual function to create profiles for existing users
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

-- Step 5: Execute the function to create missing profiles
SELECT create_missing_billing_profiles();

-- Step 6: Clean up the temporary function
DROP FUNCTION IF EXISTS create_missing_billing_profiles();

-- Step 7: Add helpful comments
COMMENT ON FUNCTION create_billing_profile_safe() IS 'Safer version of billing profile creation with error handling';
