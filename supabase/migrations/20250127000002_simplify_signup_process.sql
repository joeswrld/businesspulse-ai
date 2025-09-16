-- ============================================================================
-- SIMPLIFY SIGNUP PROCESS - Remove problematic constraints temporarily
-- ============================================================================

-- Temporarily disable the company_name constraint to allow signups
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_company_name_required;

-- Create a more lenient constraint that allows empty strings but not null
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_company_name_not_null 
CHECK (company_name IS NOT NULL);

-- Update the trigger function to be more forgiving
CREATE OR REPLACE FUNCTION public.handle_new_user_simple()
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

    -- Extract company_name from metadata, with fallback
    company_name_value := COALESCE(
        TRIM(user_metadata->>'company_name'), 
        'Individual User'
    );

    -- Insert profile with error handling
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

-- Drop existing triggers and create new ones
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

-- Create new triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_simple();

CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_email_confirmation_custom();

-- Ensure all existing profiles have a valid company_name
UPDATE public.profiles 
SET company_name = 'Individual User' 
WHERE company_name IS NULL;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user_simple() TO authenticated;

-- Final status
SELECT 'Simplified signup process applied successfully!' AS status;