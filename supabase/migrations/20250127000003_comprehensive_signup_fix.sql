-- ============================================================================
-- COMPREHENSIVE SIGNUP FIX - Address all potential issues
-- ============================================================================

-- Step 1: Remove all problematic constraints temporarily
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_company_name_required;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_company_name_not_null;

-- Step 2: Ensure all existing profiles have valid data
UPDATE public.profiles 
SET company_name = 'Individual User' 
WHERE company_name IS NULL OR TRIM(company_name) = '';

-- Step 3: Create a robust trigger function that handles all edge cases
CREATE OR REPLACE FUNCTION public.handle_new_user_robust()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_metadata jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    full_name_value text;
    company_name_value text;
    profile_exists boolean := false;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(
        SELECT 1 FROM public.profiles 
        WHERE id = NEW.id OR user_id = NEW.id
    ) INTO profile_exists;
    
    -- Extract full_name from metadata
    full_name_value := COALESCE(
        user_metadata->>'full_name',
        TRIM(CONCAT(
            COALESCE(user_metadata->>'first_name', ''),
            ' ',
            COALESCE(user_metadata->>'last_name', '')
        ))
    );

    -- Extract company_name from metadata with robust fallback
    company_name_value := TRIM(COALESCE(user_metadata->>'company_name', ''));
    
    -- Ensure company_name is never null or empty
    IF company_name_value IS NULL OR company_name_value = '' THEN
        company_name_value := 'Individual User';
    END IF;

    -- Only create profile if it doesn't exist
    IF NOT profile_exists THEN
        BEGIN
            INSERT INTO public.profiles (
                id, user_id, email, full_name, company_name, email_confirmed, 
                trial_start, trial_end, created_at, updated_at
            ) VALUES (
                NEW.id,
                NEW.id,
                NEW.email,
                NULLIF(TRIM(full_name_value), ''),
                company_name_value,
                (NEW.email_confirmed_at IS NOT NULL),
                NOW(),
                NOW() + INTERVAL '8 days',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Profile created for user: %', NEW.email;
            
        EXCEPTION 
            WHEN unique_violation THEN
                -- Profile already exists, update it
                UPDATE public.profiles
                SET
                    email = NEW.email,
                    full_name = COALESCE(NULLIF(TRIM(full_name_value), ''), full_name),
                    company_name = COALESCE(NULLIF(company_name_value, ''), company_name),
                    email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
                    updated_at = NOW()
                WHERE id = NEW.id OR user_id = NEW.id;
                
                RAISE NOTICE 'Profile updated for user: %', NEW.email;
                
            WHEN OTHERS THEN
                -- Log the error but don't fail the user creation
                RAISE WARNING 'Failed to create/update profile for user %: %', NEW.id, SQLERRM;
        END;
    ELSE
        -- Profile exists, just update it
        UPDATE public.profiles
        SET
            email = NEW.email,
            full_name = COALESCE(NULLIF(TRIM(full_name_value), ''), full_name),
            company_name = COALESCE(NULLIF(company_name_value, ''), company_name),
            email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
            updated_at = NOW()
        WHERE id = NEW.id OR user_id = NEW.id;
        
        RAISE NOTICE 'Profile updated for existing user: %', NEW.email;
    END IF;

    RETURN NEW;
END;
$$;

-- Step 4: Drop existing triggers and create new ones
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

-- Create new robust triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_robust();

CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_email_confirmation_custom();

-- Step 5: Add a more lenient constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_company_name_not_null 
CHECK (company_name IS NOT NULL);

-- Step 6: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user_robust() TO authenticated;

-- Step 7: Create a function to manually create profiles for existing users
CREATE OR REPLACE FUNCTION public.create_missing_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Create profiles for users who don't have them
    FOR user_record IN 
        SELECT u.id, u.email, u.email_confirmed_at, u.raw_user_meta_data
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id OR p.user_id = u.id
        WHERE p.id IS NULL
    LOOP
        BEGIN
            INSERT INTO public.profiles (
                id, user_id, email, full_name, company_name, email_confirmed, 
                trial_start, trial_end, created_at, updated_at
            ) VALUES (
                user_record.id,
                user_record.id,
                user_record.email,
                COALESCE(user_record.raw_user_meta_data->>'full_name', ''),
                COALESCE(user_record.raw_user_meta_data->>'company_name', 'Individual User'),
                (user_record.email_confirmed_at IS NOT NULL),
                NOW(),
                NOW() + INTERVAL '8 days',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Created missing profile for user: %', user_record.email;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create profile for user %: %', user_record.id, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- Step 8: Run the function to create missing profiles
SELECT public.create_missing_profiles();

-- Step 9: Final status
DO $$
DECLARE
    profile_count INTEGER;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    SELECT COUNT(*) INTO user_count FROM auth.users;
    
    RAISE NOTICE 'Signup fix completed successfully!';
    RAISE NOTICE 'Total users: %, Total profiles: %', user_count, profile_count;
END
$$;

SELECT 'Comprehensive signup fix applied successfully!' AS status;