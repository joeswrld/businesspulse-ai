-- Security Fix: Address Critical Error-Level Issues
-- Fix 1: Remove public access to feedback_settings
-- Fix 2: Drop unused backup table
-- Fix 3: Fix all security definer functions to include search_path
-- Fix 4: Remove authorization_code from profiles

-- ============================================
-- FIX 1: Remove Public Access to feedback_settings
-- ============================================

DROP POLICY IF EXISTS "Public can view feedback settings by project_id" ON feedback_settings;

-- Create secure function for public widget validation only
CREATE OR REPLACE FUNCTION public.get_public_widget_settings(project_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'customer_satisfaction_enabled', customer_satisfaction_enabled,
    'product_feedback_enabled', product_feedback_enabled,
    'business_name', business_name,
    'logo_url', logo_url
  ) INTO result
  FROM feedback_settings
  WHERE project_id = project_uuid;
  
  RETURN result;
END;
$$;

-- ============================================
-- FIX 2: Drop Unused Backup Table
-- ============================================

DROP TABLE IF EXISTS feature_requests_backup CASCADE;

-- ============================================
-- FIX 3: Fix All Security Definer Functions - Add search_path
-- ============================================

-- Fix get_or_create_user_project
CREATE OR REPLACE FUNCTION public.get_or_create_user_project(p_user_id uuid)
RETURNS TABLE(project_id uuid, project_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_project_name TEXT;
BEGIN
  SELECT id, name INTO v_project_id, v_project_name
  FROM projects
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_project_id IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
      RAISE EXCEPTION 'User does not exist: %', p_user_id;
    END IF;

    INSERT INTO projects (user_id, name, created_at, updated_at)
    VALUES (p_user_id, 'My Project', NOW(), NOW())
    RETURNING id, name INTO v_project_id, v_project_name;
    
    RAISE LOG 'Created project % for user %', v_project_id, p_user_id;
  END IF;

  RETURN QUERY SELECT v_project_id, v_project_name;
END;
$$;

-- Fix get_user_profile_with_access
CREATE OR REPLACE FUNCTION public.get_user_profile_with_access(user_uuid uuid)
RETURNS TABLE(id uuid, plan text, subscription_status text, trial_ends_at timestamp with time zone, next_billing_date timestamp with time zone, has_access boolean, days_left integer, paystack_customer_id text, paystack_subscription_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
  calculated_access BOOLEAN;
  calculated_days INTEGER;
BEGIN
  SELECT * INTO profile_record
  FROM billing_profiles
  WHERE billing_profiles.id = user_uuid;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      user_uuid as id,
      'trial'::TEXT as plan,
      'trial'::TEXT as subscription_status,
      NULL::TIMESTAMPTZ as trial_ends_at,
      NULL::TIMESTAMPTZ as next_billing_date,
      FALSE as has_access,
      0 as days_left,
      NULL::TEXT as paystack_customer_id,
      NULL::TEXT as paystack_subscription_id;
    RETURN;
  END IF;

  IF profile_record.plan = 'business' AND profile_record.subscription_status = 'active' THEN
    calculated_access := TRUE;
    IF profile_record.next_billing_date IS NOT NULL THEN
      calculated_days := GREATEST(0, EXTRACT(DAY FROM (profile_record.next_billing_date - NOW())));
    ELSE
      calculated_days := 30;
    END IF;
  ELSIF profile_record.plan = 'trial' AND profile_record.trial_ends_at > NOW() THEN
    calculated_access := TRUE;
    calculated_days := GREATEST(0, EXTRACT(DAY FROM (profile_record.trial_ends_at - NOW())));
  ELSE
    calculated_access := FALSE;
    calculated_days := 0;
  END IF;

  RETURN QUERY SELECT
    profile_record.id,
    profile_record.plan,
    profile_record.subscription_status,
    profile_record.trial_ends_at,
    profile_record.next_billing_date,
    calculated_access as has_access,
    calculated_days as days_left,
    profile_record.paystack_customer_code as paystack_customer_id,
    profile_record.paystack_subscription_code as paystack_subscription_id;
END;
$$;

-- Fix check_user_access
CREATE OR REPLACE FUNCTION public.check_user_access(user_uuid uuid)
RETURNS TABLE(has_access boolean, plan text, is_active boolean, trial_expired boolean, days_left integer, trial_end timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN bp.plan = 'business' AND bp.subscription_status = 'active' THEN true
      WHEN bp.plan = 'trial' AND bp.trial_ends_at > now() THEN true
      ELSE false
    END as has_access,
    COALESCE(bp.plan, 'trial') as plan,
    CASE 
      WHEN bp.subscription_status = 'active' THEN true
      WHEN bp.plan = 'trial' AND bp.trial_ends_at > now() THEN true
      ELSE false
    END as is_active,
    CASE 
      WHEN bp.plan = 'trial' AND bp.trial_ends_at <= now() THEN true
      ELSE false
    END as trial_expired,
    CASE 
      WHEN bp.trial_ends_at IS NOT NULL THEN 
        GREATEST(0, EXTRACT(DAY FROM (bp.trial_ends_at - now()))::INTEGER)
      ELSE 0
    END as days_left,
    bp.trial_ends_at as trial_end
  FROM billing_profiles bp
  WHERE bp.user_id = user_uuid;
END;
$$;

-- Fix initialize_user_trial
CREATE OR REPLACE FUNCTION public.initialize_user_trial(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO billing_profiles (
    user_id,
    plan,
    subscription_status,
    trial_ends_at,
    created_at,
    updated_at
  ) VALUES (
    user_uuid,
    'trial',
    'trial',
    now() + INTERVAL '8 days',
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Fix upgrade_user_to_business
CREATE OR REPLACE FUNCTION public.upgrade_user_to_business(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE billing_profiles
  SET 
    plan = 'business',
    subscription_status = 'active',
    next_billing_date = now() + INTERVAL '30 days',
    updated_at = now()
  WHERE user_id = user_uuid;
END;
$$;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    company_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Individual User'),
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

  INSERT INTO public.billing_profiles (
    user_id,
    plan,
    subscription_status,
    trial_ends_at,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'trial',
    'trial',
    NOW() + INTERVAL '8 days',
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RAISE LOG 'Created profile and billing for user: %', NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user data for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Fix initialize_user_data
CREATE OR REPLACE FUNCTION public.initialize_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_base_url TEXT := 'https://notex.com.ng';
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM billing_profiles WHERE user_id = p_user_id) THEN
    INSERT INTO billing_profiles (user_id, plan, subscription_status, trial_ends_at, created_at, updated_at)
    VALUES (p_user_id, 'trial', 'trial', now() + INTERVAL '8 days', now(), now());
    RAISE NOTICE 'Created billing profile for user %', p_user_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM projects WHERE user_id = p_user_id) THEN
    INSERT INTO projects (user_id, name, created_at, updated_at)
    VALUES (p_user_id, 'My Project', now(), now())
    RETURNING id INTO v_project_id;
    RAISE NOTICE 'Created project % for user %', v_project_id, p_user_id;
  ELSE
    SELECT id INTO v_project_id FROM projects WHERE user_id = p_user_id LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM feedback_settings WHERE user_id = p_user_id) THEN
    INSERT INTO feedback_settings (user_id, project_id, customer_survey_url, product_feedback_url, widget_code, created_at, updated_at)
    VALUES (
      p_user_id,
      v_project_id,
      v_base_url || '/csat/' || v_project_id,
      v_base_url || '/product-feedback/' || v_project_id,
      '<script src="' || v_base_url || '/widget.js" data-project-id="' || v_project_id || '"></script>',
      now(),
      now()
    );
    RAISE NOTICE 'Created feedback settings for user %', p_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'project_id', v_project_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in initialize_user_data: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Fix create_feedback_settings_for_user
CREATE OR REPLACE FUNCTION public.create_feedback_settings_for_user(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project_id TEXT;
  base_url TEXT := 'https://notex.com.ng';
BEGIN
  new_project_id := encode(gen_random_bytes(16), 'hex');
  
  INSERT INTO public.feedback_settings (
    user_id,
    project_id,
    customer_survey_url,
    product_feedback_url,
    widget_code,
    customer_satisfaction_enabled,
    product_feedback_enabled
  )
  VALUES (
    user_id_param,
    new_project_id::uuid,
    base_url || '/survey/' || new_project_id,
    base_url || '/feedback/' || new_project_id,
    '<script src="' || base_url || '/widget.js" data-project-id="' || new_project_id || '"></script>',
    true,
    true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    customer_satisfaction_enabled = true,
    product_feedback_enabled = true,
    updated_at = NOW();
END;
$$;

-- Fix check_widget_access
CREATE OR REPLACE FUNCTION public.check_widget_access(project_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_user_id UUID;
  billing_status TEXT;
  trial_end TIMESTAMPTZ;
  has_active_access BOOLEAN := false;
BEGIN
  SELECT user_id INTO owner_user_id
  FROM public.feedback_settings
  WHERE project_id::TEXT = project_id_param
  LIMIT 1;

  IF owner_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT 
    subscription_status,
    trial_ends_at
  INTO 
    billing_status,
    trial_end
  FROM public.billing_profiles
  WHERE id = owner_user_id;

  IF billing_status IS NULL THEN
    RETURN false;
  END IF;

  IF billing_status = 'active' THEN
    has_active_access := true;
  ELSIF billing_status = 'trial' AND trial_end > NOW() THEN
    has_active_access := true;
  ELSE
    has_active_access := false;
  END IF;

  RETURN has_active_access;
END;
$$;

-- ============================================
-- FIX 4: Remove Payment Authorization Code Column
-- ============================================

ALTER TABLE profiles DROP COLUMN IF EXISTS authorization_code;

-- Add a comment to document this security fix
COMMENT ON TABLE profiles IS 'User profiles - authorization codes removed for PCI compliance. Use Paystack customer_code and API for payment authorizations.';

-- ============================================
-- Verification
-- ============================================

-- Verify all functions have search_path set
SELECT 
  p.proname as function_name,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE WHEN 'search_path=public' = ANY(p.proconfig) THEN '✓ FIXED' ELSE '✗ MISSING' END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.prosecdef = true
  AND p.prokind = 'f'
ORDER BY p.proname;