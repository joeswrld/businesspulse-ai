-- ============================================================================
-- COMPREHENSIVE SIGNUP DATABASE ERROR FIX - UPDATED VERSION
-- ============================================================================
-- This script fixes the "Database error updating user" issue in the signup process
-- Updated to handle all edge cases and conflicts

-- Step 1: Clean up ALL existing triggers and functions to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
DROP TRIGGER IF EXISTS _on_auth_user_created ON auth.users;

-- Step 2: Drop ALL existing functions to recreate them properly
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_custom() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_robust() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_simple() CASCADE;
DROP FUNCTION IF EXISTS public.handle_email_confirmation() CASCADE;
DROP FUNCTION IF EXISTS public.handle_email_confirmation_custom() CASCADE;

-- Step 3: Ensure profiles table exists and has all required columns
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    company_name TEXT DEFAULT 'Individual User',
    email_confirmed BOOLEAN DEFAULT FALSE,
    trial_start TIMESTAMPTZ DEFAULT NOW(),
    trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '8 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Add missing columns if they don't exist
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id') THEN
        ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_confirmed') THEN
        ALTER TABLE public.profiles ADD COLUMN email_confirmed BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'trial_start') THEN
        ALTER TABLE public.profiles ADD COLUMN trial_start TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'trial_end') THEN
        ALTER TABLE public.profiles ADD COLUMN trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '8 days');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company_name') THEN
        ALTER TABLE public.profiles ADD COLUMN company_name TEXT DEFAULT 'Individual User';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at') THEN
        ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Step 5: Remove problematic constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_company_name_required;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_company_name_not_null;

-- Step 6: Update existing profiles to have valid data
UPDATE public.profiles 
SET 
    company_name = COALESCE(NULLIF(TRIM(company_name), ''), 'Individual User'),
    user_id = COALESCE(user_id, id),
    email = COALESCE(email, ''),
    full_name = COALESCE(full_name, ''),
    email_confirmed = COALESCE(email_confirmed, FALSE),
    trial_start = COALESCE(trial_start, NOW()),
    trial_end = COALESCE(trial_end, NOW() + INTERVAL '8 days'),
    created_at = COALESCE(created_at, NOW()),
    updated_at = NOW()
WHERE 
    company_name IS NULL OR TRIM(company_name) = '' OR 
    user_id IS NULL OR 
    email IS NULL OR 
    full_name IS NULL OR 
    email_confirmed IS NULL OR 
    trial_start IS NULL OR 
    trial_end IS NULL OR 
    created_at IS NULL;

-- Step 7: Create a robust user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_metadata jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    full_name_value text;
    company_name_value text;
BEGIN
    -- Extract full_name from metadata with multiple fallbacks
    full_name_value := COALESCE(
        user_metadata->>'full_name',
        TRIM(CONCAT(
            COALESCE(user_metadata->>'first_name', ''),
            ' ',
            COALESCE(user_metadata->>'last_name', '')
        )),
        'User'
    );

    -- Extract company_name from metadata with fallback
    company_name_value := TRIM(COALESCE(user_metadata->>'company_name', ''));
    IF company_name_value IS NULL OR company_name_value = '' THEN
        company_name_value := 'Individual User';
    END IF;

    -- Insert or update profile with comprehensive error handling
    BEGIN
        INSERT INTO public.profiles (
            id, user_id, email, full_name, company_name, email_confirmed, 
            trial_start, trial_end, created_at, updated_at
        ) VALUES (
            NEW.id,
            NEW.id,
            COALESCE(NEW.email, ''),
            NULLIF(TRIM(full_name_value), ''),
            company_name_value,
            (NEW.email_confirmed_at IS NOT NULL),
            NOW(),
            NOW() + INTERVAL '8 days',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = COALESCE(EXCLUDED.email, profiles.email),
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
            email_confirmed = EXCLUDED.email_confirmed,
            updated_at = NOW();
            
    EXCEPTION
        WHEN unique_violation THEN
            -- Handle unique constraint violations
            UPDATE public.profiles 
            SET 
                email = COALESCE(NEW.email, profiles.email),
                full_name = COALESCE(NULLIF(TRIM(full_name_value), ''), profiles.full_name),
                company_name = COALESCE(company_name_value, profiles.company_name),
                email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
                updated_at = NOW()
            WHERE id = NEW.id OR user_id = NEW.id;
            
        WHEN OTHERS THEN
            -- Log the error but don't fail the user creation
            RAISE WARNING 'Failed to create/update profile for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create/update profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Step 8: Create email confirmation function
CREATE OR REPLACE FUNCTION public.handle_email_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at THEN
        UPDATE public.profiles 
        SET 
            email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
            updated_at = NOW()
        WHERE id = NEW.id OR user_id = NEW.id;
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to update email confirmation for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Step 9: Create triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_email_confirmation();

-- Step 10: Add constraints safely
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_company_name_not_null 
CHECK (company_name IS NOT NULL AND TRIM(company_name) != '');

-- Step 11: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_email_confirmation() TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Step 12: Create missing profiles for existing users
INSERT INTO public.profiles (
    id, user_id, email, full_name, company_name, email_confirmed, 
    trial_start, trial_end, created_at, updated_at
)
SELECT 
    u.id,
    u.id,
    COALESCE(u.email, ''),
    COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(u.raw_user_meta_data->>'company_name', 'Individual User'),
    (u.email_confirmed_at IS NOT NULL),
    NOW(),
    NOW() + INTERVAL '8 days',
    NOW(),
    NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id OR p.user_id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    company_name = COALESCE(EXCLUDED.company_name, profiles.company_name),
    email_confirmed = EXCLUDED.email_confirmed,
    updated_at = NOW();

-- Step 13: Final cleanup and verification
DO $$
DECLARE
    profile_count INTEGER;
    user_count INTEGER;
    error_count INTEGER;
    null_company_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    SELECT COUNT(*) INTO user_count FROM auth.users;
    
    -- Check for any profiles with null company_name
    SELECT COUNT(*) INTO null_company_count 
    FROM public.profiles 
    WHERE company_name IS NULL OR TRIM(company_name) = '';
    
    -- Check for any profiles with null user_id
    SELECT COUNT(*) INTO error_count 
    FROM public.profiles 
    WHERE user_id IS NULL;
    
    RAISE NOTICE 'Signup database error fix completed!';
    RAISE NOTICE 'Total users: %, Total profiles: %', user_count, profile_count;
    
    IF null_company_count > 0 THEN
        RAISE WARNING 'Found % profiles with null/empty company_name - fixing...', null_company_count;
        UPDATE public.profiles 
        SET company_name = 'Individual User' 
        WHERE company_name IS NULL OR TRIM(company_name) = '';
    END IF;
    
    IF error_count > 0 THEN
        RAISE WARNING 'Found % profiles with null user_id - fixing...', error_count;
        UPDATE public.profiles 
        SET user_id = id 
        WHERE user_id IS NULL;
    END IF;
    
    RAISE NOTICE 'All profiles now have valid data!';
END
$$;

-- Step 14: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_end ON public.profiles(trial_end);

SELECT 'Signup database error fix applied successfully!' AS status;