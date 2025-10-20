
-- ===================================
-- FIX CRITICAL DATABASE ISSUES
-- ===================================

-- 1. Fix profiles table email constraint
-- Make email nullable since auth.users.email might not always be available
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- 2. Update handle_new_user trigger to properly populate profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile with email from auth.users
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

  -- Create billing profile with 8-day trial
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
$function$;

-- 3. Fix projects table foreign key if it exists incorrectly
-- Drop existing foreign key if it references wrong table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_user_id_fkey' 
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects DROP CONSTRAINT projects_user_id_fkey;
  END IF;
END $$;

-- Add correct foreign key that references auth.users
ALTER TABLE projects 
ADD CONSTRAINT projects_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 4. Drop and recreate get_or_create_user_project function
DROP FUNCTION IF EXISTS public.get_or_create_user_project(uuid);

CREATE FUNCTION public.get_or_create_user_project(p_user_id uuid)
RETURNS TABLE(project_id uuid, project_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_project_id UUID;
  v_project_name TEXT;
BEGIN
  -- Try to get existing project
  SELECT id, name INTO v_project_id, v_project_name
  FROM projects
  WHERE user_id = p_user_id
  LIMIT 1;

  -- If no project exists, create one
  IF v_project_id IS NULL THEN
    -- First ensure user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
      RAISE EXCEPTION 'User does not exist: %', p_user_id;
    END IF;

    INSERT INTO projects (user_id, name, created_at, updated_at)
    VALUES (p_user_id, 'My Project', NOW(), NOW())
    RETURNING id, name INTO v_project_id, v_project_name;
    
    RAISE LOG 'Created project % for user %', v_project_id, p_user_id;
  END IF;

  -- Return project
  RETURN QUERY
  SELECT v_project_id, v_project_name;
END;
$function$;

-- 5. Backfill any existing users missing profiles or billing
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data 
    FROM auth.users 
    WHERE id NOT IN (SELECT user_id FROM profiles)
  LOOP
    -- Create profile
    INSERT INTO profiles (
      user_id,
      email,
      full_name,
      company_name,
      created_at,
      updated_at
    ) VALUES (
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'full_name', 'User'),
      COALESCE(user_record.raw_user_meta_data->>'company_name', 'Individual User'),
      NOW(),
      NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
    
    RAISE LOG 'Backfilled profile for user: %', user_record.id;
  END LOOP;

  FOR user_record IN 
    SELECT id FROM auth.users 
    WHERE id NOT IN (SELECT user_id FROM billing_profiles)
  LOOP
    -- Create billing profile
    INSERT INTO billing_profiles (
      user_id,
      plan,
      subscription_status,
      trial_ends_at,
      created_at,
      updated_at
    ) VALUES (
      user_record.id,
      'trial',
      'trial',
      NOW() + INTERVAL '8 days',
      NOW(),
      NOW()
    ) ON CONFLICT (user_id) DO NOTHING;
    
    RAISE LOG 'Backfilled billing for user: %', user_record.id;
  END LOOP;
END $$;
