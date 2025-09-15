-- Update the signup trigger to include plan_type field
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
                trial_start, trial_end, plan_type, created_at, updated_at
            ) VALUES (
                NEW.id,
                NEW.id,
                NEW.email,
                NULLIF(TRIM(full_name_value), ''),
                company_name_value,
                (NEW.email_confirmed_at IS NOT NULL),
                NOW(),
                NOW() + INTERVAL '8 days',
                'trial',
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
                    plan_type = COALESCE(plan_type, 'trial'),
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
            plan_type = COALESCE(plan_type, 'trial'),
            updated_at = NOW()
        WHERE id = NEW.id OR user_id = NEW.id;
        
        RAISE NOTICE 'Profile updated for existing user: %', NEW.email;
    END IF;

    RETURN NEW;
END;
$$;

-- Also update the simpler handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (
        id, user_id, email, email_confirmed, trial_start, trial_end, plan_type, created_at, updated_at
    ) VALUES (
        NEW.id, NEW.id, NEW.email, (NEW.email_confirmed_at IS NOT NULL),
        NOW(), NOW() + INTERVAL '8 days', 'trial', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        email_confirmed = EXCLUDED.email_confirmed,
        plan_type = COALESCE(profiles.plan_type, 'trial'),
        updated_at = NOW()
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        email_confirmed = EXCLUDED.email_confirmed,
        plan_type = COALESCE(profiles.plan_type, 'trial'),
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Update existing profiles to have plan_type if they don't
UPDATE profiles 
SET plan_type = 'trial'
WHERE plan_type IS NULL;