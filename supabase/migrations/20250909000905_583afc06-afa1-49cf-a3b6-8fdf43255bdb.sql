-- Remove any problematic triggers on auth.users
DROP TRIGGER IF EXISTS trigger_create_billing_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;

-- Drop problematic functions
DROP FUNCTION IF EXISTS create_billing_profile();
DROP FUNCTION IF EXISTS create_user_profile();
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a safe function to create user profiles that can be called from the frontend
CREATE OR REPLACE FUNCTION create_user_profile_safe(
  user_uuid UUID,
  user_email TEXT,
  first_name TEXT DEFAULT NULL,
  last_name TEXT DEFAULT NULL,
  company_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  profile_created BOOLEAN := FALSE;
  billing_created BOOLEAN := FALSE;
  usage_created BOOLEAN := FALSE;
  feedback_settings_created BOOLEAN := FALSE;
BEGIN
  -- Initialize result
  result := jsonb_build_object('success', true, 'message', 'Profile setup started', 'details', '{}');
  
  -- Create profile
  BEGIN
    INSERT INTO profiles (
      user_id,
      email,
      first_name,
      last_name,
      company_name,
      plan,
      trial_start,
      trial_end,
      is_active,
      onboarding_completed,
      created_at,
      updated_at
    ) VALUES (
      user_uuid,
      user_email,
      first_name,
      last_name,
      company_name,
      'free_trial',
      NOW(),
      NOW() + INTERVAL '8 days',
      TRUE,
      FALSE,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
      last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
      company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
      updated_at = NOW();
      
    profile_created := TRUE;
    result := jsonb_set(result, '{details,profile_created}', 'true'::jsonb);
    
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{details,profile_error}', ('"' || SQLERRM || '"')::jsonb);
  END;
  
  -- Create billing profile
  BEGIN
    INSERT INTO billing_profiles (
      id,
      plan,
      trial_ends_at,
      subscription_status,
      created_at
    ) VALUES (
      user_uuid,
      'trial',
      NOW() + INTERVAL '8 days',
      'trial',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      plan = EXCLUDED.plan,
      trial_ends_at = EXCLUDED.trial_ends_at,
      subscription_status = EXCLUDED.subscription_status;
      
    billing_created := TRUE;
    result := jsonb_set(result, '{details,billing_created}', 'true'::jsonb);
    
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{details,billing_error}', ('"' || SQLERRM || '"')::jsonb);
  END;
  
  -- Create usage tracking
  BEGIN
    INSERT INTO usage_tracking (
      id,
      user_id,
      feedback_count,
      analytics_count,
      reports_count,
      insights_count,
      teams_count,
      created_at,
      updated_at
    ) VALUES (
      user_uuid,
      user_uuid,
      0,
      0,
      0,
      0,
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    usage_created := TRUE;
    result := jsonb_set(result, '{details,usage_created}', 'true'::jsonb);
    
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{details,usage_error}', ('"' || SQLERRM || '"')::jsonb);
  END;
  
  -- Create feedback settings
  BEGIN
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
      notify_email,
      created_at,
      updated_at
    ) VALUES (
      user_uuid,
      '',
      FALSE,
      'Share your thoughts with us',
      TRUE,
      TRUE,
      'Send Feedback',
      'dark',
      '#2563eb',
      NULL,
      user_email,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      notify_email = COALESCE(EXCLUDED.notify_email, feedback_settings.notify_email),
      updated_at = NOW();
      
    feedback_settings_created := TRUE;
    result := jsonb_set(result, '{details,feedback_settings_created}', 'true'::jsonb);
    
  EXCEPTION WHEN OTHERS THEN
    result := jsonb_set(result, '{details,feedback_settings_error}', ('"' || SQLERRM || '"')::jsonb);
  END;
  
  -- Set final message
  IF profile_created AND billing_created AND usage_created AND feedback_settings_created THEN
    result := jsonb_set(result, '{message}', '"User profile setup completed successfully"'::jsonb);
  ELSIF profile_created OR billing_created OR usage_created OR feedback_settings_created THEN
    result := jsonb_set(result, '{message}', '"User profile setup partially completed"'::jsonb);
  ELSE
    result := jsonb_set(result, '{success}', 'false'::jsonb);
    result := jsonb_set(result, '{message}', '"User profile setup failed"'::jsonb);
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile_safe(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION create_user_profile_safe(UUID, TEXT, TEXT, TEXT, TEXT) IS 'Safely creates user profile, billing profile, usage tracking, and feedback settings for new users without requiring auth.users triggers';

-- Test the function (optional - remove this line if you don't want to test immediately)
SELECT 'User profile creation function created successfully' as status;