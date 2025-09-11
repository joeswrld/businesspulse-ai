-- ============================================================================
-- COMPREHENSIVE NOTEX SAAS PLATFORM SCHEMA
-- Based on detailed specification for landing → auth → trial → subscription → widget
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 1: PROFILES TABLE (Core user data with trial system)
-- ============================================================================

-- Drop existing profiles table if it exists to start fresh
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  plan_status text NOT NULL DEFAULT 'trialing', -- 'trialing' | 'active' | 'expired'
  trial_start_date timestamptz DEFAULT now(),
  trial_expiry_date timestamptz DEFAULT (now() + interval '8 days'),
  paystack_customer_id text,
  paystack_subscription_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT profiles_plan_status_check CHECK (plan_status IN ('trialing', 'active', 'expired')),
  CONSTRAINT profiles_email_unique UNIQUE (email)
);

-- ============================================================================
-- PART 2: PROJECTS TABLE (Unique project_id ownership)
-- ============================================================================

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text NOT NULL UNIQUE, -- The value used in embed script
  name text NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT projects_project_id_format CHECK (project_id ~ '^[a-z0-9\-]{4,30}$'),
  CONSTRAINT projects_name_required CHECK (name IS NOT NULL AND TRIM(name) <> '')
);

-- ============================================================================
-- PART 3: SUBSCRIPTIONS TABLE (Paystack integration)
-- ============================================================================

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paystack_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'incomplete', -- 'incomplete', 'active', 'cancelled', 'past_due'
  plan_code text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT subscriptions_status_check CHECK (status IN ('incomplete', 'active', 'cancelled', 'past_due'))
);

-- ============================================================================
-- PART 4: FEEDBACKS TABLE (Client feedback storage)
-- ============================================================================

CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  user_email text,
  content text NOT NULL,
  sentiment text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT feedbacks_content_required CHECK (content IS NOT NULL AND TRIM(content) <> ''),
  CONSTRAINT feedbacks_sentiment_check CHECK (sentiment IN ('positive', 'negative', 'neutral') OR sentiment IS NULL)
);

-- ============================================================================
-- PART 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_self" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own" ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own" ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Feedbacks policies (only project owners can see their feedback)
CREATE POLICY "feedbacks_select_project_owner" ON public.feedbacks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "feedbacks_insert_project_owner" ON public.feedbacks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.user_id = auth.uid() AND p.is_active = true
    )
  );

-- ============================================================================
-- PART 6: HELPER FUNCTIONS
-- ============================================================================

-- Function to check user access (trial + subscription status)
CREATE OR REPLACE FUNCTION public.check_user_access(user_uuid uuid DEFAULT auth.uid())
RETURNS TABLE (
  has_access boolean,
  is_trial_active boolean,
  is_subscription_active boolean,
  trial_expires_at timestamptz,
  subscription_status text,
  plan_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record record;
  subscription_record record;
  trial_active boolean := false;
  subscription_active boolean := false;
BEGIN
  -- Get user profile
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = user_uuid
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, false, NULL::timestamptz, 'no_profile'::text, 'no_profile'::text;
    RETURN;
  END IF;

  -- Check trial status
  IF profile_record.trial_expiry_date IS NOT NULL AND profile_record.trial_expiry_date > NOW() THEN
    trial_active := true;
  END IF;

  -- Check subscription status
  SELECT * INTO subscription_record
  FROM public.subscriptions
  WHERE user_id = user_uuid AND status = 'active'
  LIMIT 1;

  IF FOUND THEN
    subscription_active := true;
  END IF;

  -- Determine overall access
  RETURN QUERY
    SELECT (trial_active OR subscription_active),
           trial_active,
           subscription_active,
           profile_record.trial_expiry_date,
           COALESCE(subscription_record.status, 'trial'::text),
           profile_record.plan_status;
END;
$$;

-- Function to expire trials (for cron job)
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET plan_status = 'expired'
  WHERE plan_status = 'trialing'
    AND trial_expiry_date < now();
    
  RAISE NOTICE 'Expired trials updated: %', ROW_COUNT;
END;
$$;

-- Function to get user profile with access info
CREATE OR REPLACE FUNCTION public.get_user_profile_with_access(user_uuid uuid DEFAULT auth.uid())
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  plan_status text,
  trial_start_date timestamptz,
  trial_expiry_date timestamptz,
  has_access boolean,
  is_trial_active boolean,
  is_subscription_active boolean,
  subscription_status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.email, p.full_name, p.plan_status,
    p.trial_start_date, p.trial_expiry_date,
    a.has_access, a.is_trial_active, a.is_subscription_active, a.subscription_status,
    p.created_at, p.updated_at
  FROM public.profiles p
  CROSS JOIN LATERAL public.check_user_access(p.id) a
  WHERE p.id = user_uuid;
END;
$$;

-- Function to validate project_id uniqueness
CREATE OR REPLACE FUNCTION public.validate_project_id_uniqueness(project_id_input text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check format
  IF project_id_input !~ '^[a-z0-9\-]{4,30}$' THEN
    RETURN false;
  END IF;
  
  -- Check uniqueness
  RETURN NOT EXISTS (
    SELECT 1 FROM public.projects WHERE project_id = project_id_input
  );
END;
$$;

-- ============================================================================
-- PART 7: TRIGGERS FOR AUTOMATIC PROFILE CREATION
-- ============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_metadata jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  full_name_value text;
BEGIN
  -- Extract full name from metadata
  full_name_value := COALESCE(
    user_metadata->>'full_name',
    TRIM(CONCAT(
      COALESCE(user_metadata->>'first_name', ''),
      ' ',
      COALESCE(user_metadata->>'last_name', '')
    ))
  );

  -- Insert profile with 8-day trial
  INSERT INTO public.profiles (
    id, email, full_name, plan_status, trial_start_date, trial_expiry_date
  ) VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(full_name_value), ''),
    'trialing',
    NOW(),
    NOW() + INTERVAL '8 days'
  );

  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 8: GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.check_user_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_trials() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_with_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_project_id_uniqueness(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- ============================================================================
-- PART 9: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_plan_status ON public.profiles(plan_status);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expiry ON public.profiles(trial_expiry_date);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_id ON public.projects(project_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id ON public.feedbacks(project_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at);

-- ============================================================================
-- PART 10: INITIAL DATA AND SETUP
-- ============================================================================

-- Create a function to set up initial data for existing users
CREATE OR REPLACE FUNCTION public.setup_existing_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update existing profiles to have proper trial dates if they don't have them
  UPDATE public.profiles
  SET 
    trial_start_date = COALESCE(trial_start_date, NOW()),
    trial_expiry_date = COALESCE(trial_expiry_date, NOW() + INTERVAL '8 days'),
    plan_status = CASE 
      WHEN plan_status IS NULL THEN 'trialing'
      WHEN trial_expiry_date < NOW() THEN 'expired'
      ELSE plan_status
    END
  WHERE trial_start_date IS NULL OR trial_expiry_date IS NULL;
  
  RAISE NOTICE 'Existing users setup completed';
END;
$$;

-- Run the setup function
SELECT public.setup_existing_users();

-- ============================================================================
-- FINAL STATUS
-- ============================================================================

SELECT 'Comprehensive NoteX SaaS platform schema created successfully!' AS status;