-- Fix for permission error: "must be owner of relation users"
-- This script uses a different approach that doesn't require triggers on auth.users

-- First, let's clean up any existing problematic triggers and functions
DO $$
BEGIN
  -- Drop the problematic trigger if it exists
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_billing_profile') THEN
    DROP TRIGGER IF EXISTS trigger_create_billing_profile ON auth.users;
    RAISE NOTICE 'Dropped existing trigger_create_billing_profile';
  END IF;
END $$;

-- Drop the function to recreate it with better permissions
DROP FUNCTION IF EXISTS create_billing_profile();
DROP FUNCTION IF EXISTS create_missing_billing_profiles();

-- Create a function that can be called manually or from your application
-- This avoids permission issues with auth.users triggers
CREATE OR REPLACE FUNCTION create_user_billing_profile(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  profile_created BOOLEAN := FALSE;
  usage_created BOOLEAN := FALSE;
  subscription_created BOOLEAN := FALSE;
BEGIN
  -- Initialize result
  result := '{"success": true, "message": "", "details": {}}'::JSON;
  
  -- Check if billing_profiles table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'billing_profiles') THEN
    result := jsonb_set(result::jsonb, '{success}', 'false'::jsonb);
    result := jsonb_set(result::jsonb, '{message}', '"billing_profiles table does not exist"'::jsonb);
    RETURN result;
  END IF;

  -- Check if the user already has a billing profile
  IF EXISTS (SELECT 1 FROM billing_profiles WHERE id = user_uuid) THEN
    result := jsonb_set(result::jsonb, '{message}', '"User already has a billing profile"'::jsonb);
    result := jsonb_set(result::jsonb, '{details, profile_exists}', 'true'::jsonb);
  ELSE
    -- Try to create the billing profile
    BEGIN
      INSERT INTO billing_profiles (id, plan, trial_ends_at, subscription_status)
      VALUES (
        user_uuid,
        'trial',
        NOW() + INTERVAL '8 days',
        'trial'
      );
      profile_created := TRUE;
      result := jsonb_set(result::jsonb, '{details, profile_created}', 'true'::jsonb);
      RAISE NOTICE 'Successfully created billing profile for user %', user_uuid;
    EXCEPTION WHEN OTHERS THEN
      result := jsonb_set(result::jsonb, '{success}', 'false'::jsonb);
      result := jsonb_set(result::jsonb, '{message}', ('"Failed to create billing profile: ' || SQLERRM || '"')::jsonb);
      result := jsonb_set(result::jsonb, '{details, profile_error}', ('"' || SQLERRM || '"')::jsonb);
    END;
  END IF;

  -- Try to create usage tracking record
  IF profile_created OR EXISTS (SELECT 1 FROM billing_profiles WHERE id = user_uuid) THEN
    BEGIN
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usage_tracking') THEN
        IF NOT EXISTS (SELECT 1 FROM usage_tracking WHERE id = user_uuid) THEN
          INSERT INTO usage_tracking (id, user_id, feedback_count, analytics_count, reports_count, insights_count, teams_count)
          VALUES (
            user_uuid,
            user_uuid,
            0,
            0,
            0,
            0,
            0
          );
          usage_created := TRUE;
          result := jsonb_set(result::jsonb, '{details, usage_created}', 'true'::jsonb);
          RAISE NOTICE 'Successfully created usage tracking for user %', user_uuid;
        ELSE
          result := jsonb_set(result::jsonb, '{details, usage_exists}', 'true'::jsonb);
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      result := jsonb_set(result::jsonb, '{details, usage_error}', ('"' || SQLERRM || '"')::jsonb);
      RAISE WARNING 'Failed to create usage tracking for user %: %', user_uuid, SQLERRM;
    END;
  END IF;

  -- Try to create user subscription record
  IF profile_created OR EXISTS (SELECT 1 FROM billing_profiles WHERE id = user_uuid) THEN
    BEGIN
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
        IF NOT EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = user_uuid) THEN
          INSERT INTO user_subscriptions (user_id, plan_code, plan_name, status)
          VALUES (
            user_uuid,
            'trial',
            'Free Trial (8 days)',
            'active'
          );
          subscription_created := TRUE;
          result := jsonb_set(result::jsonb, '{details, subscription_created}', 'true'::jsonb);
          RAISE NOTICE 'Successfully created user subscription for user %', user_uuid;
        ELSE
          result := jsonb_set(result::jsonb, '{details, subscription_exists}', 'true'::jsonb);
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      result := jsonb_set(result::jsonb, '{details, subscription_error}', ('"' || SQLERRM || '"')::jsonb);
      RAISE WARNING 'Failed to create user subscription for user %: %', user_uuid, SQLERRM;
    END;
  END IF;

  -- Set final message
  IF profile_created OR usage_created OR subscription_created THEN
    result := jsonb_set(result::jsonb, '{message}', '"Billing profile setup completed successfully"'::jsonb);
  ELSE
    result := jsonb_set(result::jsonb, '{message}', '"No new profiles created - all already exist"'::jsonb);
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_billing_profile(UUID) TO authenticated;

-- Create a function to set up profiles for existing users
CREATE OR REPLACE FUNCTION setup_existing_users_billing()
RETURNS JSON AS $$
DECLARE
  user_record RECORD;
  result JSON;
  total_users INTEGER := 0;
  processed_users INTEGER := 0;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO total_users FROM auth.users;
  
  -- Process each user
  FOR user_record IN SELECT id FROM auth.users LOOP
    processed_users := processed_users + 1;
    
    BEGIN
      SELECT create_user_billing_profile(user_record.id) INTO result;
      
      IF (result->>'success')::BOOLEAN THEN
        success_count := success_count + 1;
      ELSE
        error_count := error_count + 1;
      END IF;
      
      RAISE NOTICE 'Processed user %/%: %', processed_users, total_users, result->>'message';
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING 'Failed to process user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
  
  -- Return summary
  RETURN json_build_object(
    'total_users', total_users,
    'processed_users', processed_users,
    'success_count', success_count,
    'error_count', error_count,
    'message', format('Processed %s users: %s successful, %s errors', processed_users, success_count, error_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION setup_existing_users_billing() TO authenticated;

-- Create a function to check user billing status
CREATE OR REPLACE FUNCTION check_user_billing_status(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  result := json_build_object(
    'user_id', user_uuid,
    'has_billing_profile', EXISTS (SELECT 1 FROM billing_profiles WHERE id = user_uuid),
    'has_usage_tracking', EXISTS (SELECT 1 FROM usage_tracking WHERE id = user_uuid),
    'has_subscription', EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = user_uuid),
    'billing_profile', (
      SELECT json_build_object(
        'plan', plan,
        'trial_ends_at', trial_ends_at,
        'subscription_status', subscription_status
      )
      FROM billing_profiles 
      WHERE id = user_uuid
    ),
    'usage_data', (
      SELECT json_build_object(
        'feedback_count', feedback_count,
        'analytics_count', analytics_count,
        'reports_count', reports_count,
        'insights_count', insights_count,
        'teams_count', teams_count
      )
      FROM usage_tracking 
      WHERE id = user_uuid
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_billing_status(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION create_user_billing_profile(UUID) IS 'Creates billing profile, usage tracking, and subscription for a user without requiring auth.users triggers';
COMMENT ON FUNCTION setup_existing_users_billing() IS 'Sets up billing profiles for all existing users';
COMMENT ON FUNCTION check_user_billing_status(UUID) IS 'Returns comprehensive billing status for a user';

-- Test the function (optional - remove this line if you don't want to test immediately)
-- SELECT create_user_billing_profile('00000000-0000-0000-0000-000000000000');

-- Show summary of what was created
SELECT 
  'Functions created successfully' as status,
  'create_user_billing_profile' as function_name,
  'Use this to create billing profiles for new users' as description
UNION ALL
SELECT 
  'Functions created successfully' as status,
  'setup_existing_users_billing' as function_name,
  'Use this to set up billing for existing users' as description
UNION ALL
SELECT 
  'Functions created successfully' as status,
  'check_user_billing_status' as function_name,
  'Use this to check user billing status' as description;