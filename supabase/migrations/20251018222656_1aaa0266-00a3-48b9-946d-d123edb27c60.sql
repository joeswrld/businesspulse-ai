-- ============================================================================
-- SIMPLIFIED SIGNUP FIX - Focus only on signup functionality
-- ============================================================================

-- Step 1: Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users CASCADE;
DROP TRIGGER IF EXISTS trigger_create_billing_profile ON auth.users CASCADE;

-- Step 2: Drop old functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_billing_profile_for_user() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_user_trial() CASCADE;

-- Step 3: Add missing columns to billing_profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'billing_profiles' AND column_name = 'plan') THEN
    ALTER TABLE public.billing_profiles ADD COLUMN plan TEXT DEFAULT 'trial';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'billing_profiles' AND column_name = 'trial_ends_at') THEN
    ALTER TABLE public.billing_profiles ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '8 days');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'billing_profiles' AND column_name = 'next_billing_date') THEN
    ALTER TABLE public.billing_profiles ADD COLUMN next_billing_date TIMESTAMPTZ;
  END IF;
END $$;

-- Step 4: Update ONLY existing profiles that have matching users
UPDATE public.billing_profiles bp
SET 
  plan = COALESCE(bp.plan, 'trial'),
  plan_type = COALESCE(bp.plan_type, 'free'),
  subscription_status = COALESCE(bp.subscription_status, 'trial'),
  trial_ends_at = COALESCE(bp.trial_ends_at, bp.trial_end_date, NOW() + INTERVAL '8 days'),
  user_id = bp.id
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = bp.id)
  AND (bp.plan IS NULL OR bp.trial_ends_at IS NULL OR bp.user_id IS NULL OR bp.user_id != bp.id);

-- Step 5: Create a simple, robust user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try to insert a new billing profile
  INSERT INTO public.billing_profiles (
    id,
    user_id,
    plan,
    plan_type,
    subscription_status,
    trial_start_date,
    trial_end_date,
    trial_ends_at,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id,
    'trial',
    'free',
    'trial',
    NOW(),
    NOW() + INTERVAL '8 days',
    NOW() + INTERVAL '8 days',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = NEW.id,
    plan = COALESCE(billing_profiles.plan, 'trial'),
    trial_ends_at = COALESCE(billing_profiles.trial_ends_at, NOW() + INTERVAL '8 days'),
    updated_at = NOW();

  -- Also create a profile entry if it doesn't exist
  INSERT INTO public.profiles (
    id,
    user_id,
    email,
    company_name,
    email_confirmed,
    trial_start,
    trial_end,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Individual User'),
    (NEW.email_confirmed_at IS NOT NULL),
    NOW(),
    NOW() + INTERVAL '8 days',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_confirmed = EXCLUDED.email_confirmed,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 6: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Step 8: Success message
DO $$
BEGIN
  RAISE NOTICE 'Signup fix applied successfully! New user signups should now work properly.';
END $$;