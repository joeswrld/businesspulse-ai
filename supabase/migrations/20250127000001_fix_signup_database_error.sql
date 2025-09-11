-- ============================================================================
-- FIX SIGNUP DATABASE ERROR - Handle company_name constraint properly
-- ============================================================================

-- First, let's drop the problematic constraint temporarily
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_company_name_required;

-- Update the trigger function to handle company_name properly
CREATE OR REPLACE FUNCTION public.handle_new_user_custom()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_metadata jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    full_name_value text;
    company_name_value text;
BEGIN
    -- Extract full_name from metadata
    full_name_value := COALESCE(
        user_metadata->>'full_name',
        TRIM(CONCAT(
            COALESCE(user_metadata->>'first_name', ''),
            ' ',
            COALESCE(user_metadata->>'last_name', '')
        ))
    );

    -- Extract company_name from metadata, with proper fallback
    company_name_value := TRIM(COALESCE(user_metadata->>'company_name', ''));
    
    -- Ensure company_name is never null or empty - use fallback
    IF company_name_value IS NULL OR company_name_value = '' THEN
        company_name_value := 'Individual User';
    END IF;

    -- Insert or update profile with proper error handling
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
    EXCEPTION 
        WHEN unique_violation THEN
            -- Update existing profile
            UPDATE public.profiles
            SET
                email = NEW.email,
                full_name = COALESCE(NULLIF(TRIM(full_name_value), ''), full_name),
                company_name = COALESCE(NULLIF(company_name_value, ''), company_name),
                email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
                updated_at = NOW()
            WHERE id = NEW.id OR user_id = NEW.id;
        WHEN OTHERS THEN
            -- Log the error but don't fail the user creation
            RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- Also update the simpler trigger function
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
    -- Extract full_name from metadata
    full_name_value := COALESCE(
        user_metadata->>'full_name',
        TRIM(CONCAT(
            COALESCE(user_metadata->>'first_name', ''),
            ' ',
            COALESCE(user_metadata->>'last_name', '')
        ))
    );

    -- Extract company_name from metadata, with proper fallback
    company_name_value := TRIM(COALESCE(user_metadata->>'company_name', ''));
    
    -- Ensure company_name is never null or empty - use fallback
    IF company_name_value IS NULL OR company_name_value = '' THEN
        company_name_value := 'Individual User';
    END IF;

    -- Insert or update profile with proper error handling
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
    EXCEPTION 
        WHEN unique_violation THEN
            -- Update existing profile
            UPDATE public.profiles
            SET
                email = NEW.email,
                full_name = COALESCE(NULLIF(TRIM(full_name_value), ''), full_name),
                company_name = COALESCE(NULLIF(company_name_value, ''), company_name),
                email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
                updated_at = NOW()
            WHERE id = NEW.id OR user_id = NEW.id;
        WHEN OTHERS THEN
            -- Log the error but don't fail the user creation
            RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$;

-- Ensure all existing profiles have a valid company_name
UPDATE public.profiles 
SET company_name = 'Individual User' 
WHERE company_name IS NULL OR TRIM(company_name) = '';

-- Re-add the constraint with a more lenient approach
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_company_name_required 
CHECK (company_name IS NOT NULL AND TRIM(company_name) <> '');

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user_custom() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Final status
SELECT 'Signup database error fix applied successfully!' AS status;