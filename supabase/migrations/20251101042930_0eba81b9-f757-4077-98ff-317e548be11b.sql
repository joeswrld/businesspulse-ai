-- Fix mutable search_path for security definer functions
-- This prevents search path hijacking attacks

-- Fix check_widget_access
CREATE OR REPLACE FUNCTION public.check_widget_access(project_id_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix get_or_create_user_project
CREATE OR REPLACE FUNCTION public.get_or_create_user_project(p_user_id uuid)
RETURNS TABLE(project_id uuid, project_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix get_user_profile_with_access
CREATE OR REPLACE FUNCTION public.get_user_profile_with_access(user_uuid uuid)
RETURNS TABLE(id uuid, plan text, subscription_status text, trial_ends_at timestamp with time zone, next_billing_date timestamp with time zone, has_access boolean, days_left integer, paystack_customer_id text, paystack_subscription_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix initialize_user_trial
CREATE OR REPLACE FUNCTION public.initialize_user_trial(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- Fix trigger functions with SET search_path
CREATE OR REPLACE FUNCTION public.update_billing_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_feedback_settings_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_feedback_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;