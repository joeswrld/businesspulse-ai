-- ============================================================================
-- CLEAN, IDPOTENT MIGRATION: Custom Auth for NoteX (company_name required)
-- ============================================================================

-- Make sure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- PART 0: Ensure profiles table exists (minimal skeleton if absent)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
    ) THEN
        CREATE TABLE public.profiles (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            email text,
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
        RAISE NOTICE 'Created minimal profiles table';
    ELSE
        RAISE NOTICE 'Profiles table exists';
    END IF;
END
$$;


-- ============================================================================
-- PART 1: Add missing columns and safe constraints (single DO block — no nesting)
-- ============================================================================
DO $$
BEGIN
    -- Add missing columns (if absent)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company_name'
    ) THEN
        EXECUTE 'ALTER TABLE public.profiles ADD COLUMN company_name TEXT';
        RAISE NOTICE 'Added column: company_name';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name'
    ) THEN
        EXECUTE 'ALTER TABLE public.profiles ADD COLUMN full_name TEXT';
        RAISE NOTICE 'Added column: full_name';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_confirmed'
    ) THEN
        EXECUTE 'ALTER TABLE public.profiles ADD COLUMN email_confirmed BOOLEAN DEFAULT FALSE';
        RAISE NOTICE 'Added column: email_confirmed';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'trial_start'
    ) THEN
        EXECUTE 'ALTER TABLE public.profiles ADD COLUMN trial_start TIMESTAMPTZ DEFAULT NOW()';
        RAISE NOTICE 'Added column: trial_start';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'trial_end'
    ) THEN
        EXECUTE 'ALTER TABLE public.profiles ADD COLUMN trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL ''8 days'')';
        RAISE NOTICE 'Added column: trial_end';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
    ) THEN
        EXECUTE 'ALTER TABLE public.profiles ADD COLUMN user_id UUID';
        RAISE NOTICE 'Added column: user_id (no FK yet)';

        -- add FK only if auth.users exists
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'auth' AND table_name = 'users'
        ) THEN
            BEGIN
                -- try adding FK; swallow exception if it fails
                EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE';
                RAISE NOTICE 'Added FK: profiles.user_id -> auth.users.id';
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not add FK to auth.users (auth.users may not exist or constraint exists) — skipping FK creation';
            END;
        END IF;
    END IF;

    -- Populate user_id with id when column exists
    PERFORM 1; -- dummy to keep flow
    EXECUTE 'UPDATE public.profiles SET user_id = id WHERE user_id IS NULL';

    -- Fix existing rows so CHECK constraint won’t fail
    EXECUTE 'UPDATE public.profiles SET company_name = ''Individual User'' WHERE company_name IS NULL OR TRIM(company_name) = ''''';

    -- Safely add CHECK constraint for company_name
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'profiles_company_name_required'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        EXECUTE $q$
            ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_company_name_required
            CHECK (company_name IS NOT NULL AND TRIM(company_name) <> '')
        $q$;
        RAISE NOTICE 'Added constraint: profiles_company_name_required';
    ELSE
        RAISE NOTICE 'Constraint already exists: profiles_company_name_required';
    END IF;

    -- Add unique constraint on user_id safely
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_user_id_unique'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        BEGIN
            EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id)';
            RAISE NOTICE 'Added constraint: profiles_user_id_unique';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add unique constraint profiles_user_id_unique (may already exist) — skipping';
        END;
    ELSE
        RAISE NOTICE 'Constraint exists: profiles_user_id_unique';
    END IF;

    -- Add unique constraint on email safely
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'profiles_email_unique'
          AND conrelid = 'public.profiles'::regclass
    ) THEN
        BEGIN
            EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email)';
            RAISE NOTICE 'Added constraint: profiles_email_unique';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not add unique constraint profiles_email_unique (may already exist) — skipping';
        END;
    ELSE
        RAISE NOTICE 'Constraint exists: profiles_email_unique';
    END IF;

    -- Ensure created_at/updated_at columns exist (useful)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
    ) THEN
        EXECUTE 'ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW()';
        RAISE NOTICE 'Added column: created_at';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at'
    ) THEN
        EXECUTE 'ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()';
        RAISE NOTICE 'Added column: updated_at';
    END IF;

END
$$;


-- ============================================================================
-- PART 2: Sync email_confirmed from auth.users
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        EXECUTE $sync$
            UPDATE public.profiles p
            SET email_confirmed = (u.email_confirmed_at IS NOT NULL)
            FROM auth.users u
            WHERE p.id = u.id OR p.user_id = u.id
        $sync$;
        RAISE NOTICE 'Synced email_confirmed from auth.users (if any)';
    ELSE
        RAISE NOTICE 'auth.users not present — skipping email_confirmed sync';
    END IF;
END
$$;


-- ============================================================================
-- PART 3: Trigger functions for new users & email confirmation
-- ============================================================================
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
    -- derive full_name
    full_name_value := COALESCE(
        user_metadata->>'full_name',
        TRIM(CONCAT(
            COALESCE(user_metadata->>'first_name', ''),
            ' ',
            COALESCE(user_metadata->>'last_name', '')
        ))
    );

    company_name_value := TRIM(COALESCE(user_metadata->>'company_name', ''));

    -- Company name required: fallback to 'Individual User' for automated inserts
    IF company_name_value IS NULL OR company_name_value = '' THEN
        company_name_value := 'Individual User';
    END IF;

    -- Insert or update profile
    BEGIN
        INSERT INTO public.profiles (
            id, user_id, email, full_name, company_name, email_confirmed, trial_start, trial_end, created_at, updated_at
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
    EXCEPTION WHEN unique_violation THEN
        UPDATE public.profiles
        SET
            email = NEW.email,
            full_name = COALESCE(NULLIF(TRIM(full_name_value), ''), full_name),
            company_name = COALESCE(NULLIF(company_name_value, ''), company_name),
            email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
            updated_at = NOW()
        WHERE id = NEW.id OR user_id = NEW.id;
    END;

    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.handle_email_confirmation_custom()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
        UPDATE public.profiles
        SET email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
            updated_at = NOW()
        WHERE id = NEW.id OR user_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;


-- ============================================================================
-- PART 4: Create triggers on auth.users (if auth.users exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        -- Remove existing triggers to avoid duplicates
        EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users';
        EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users';

        -- Create triggers
        EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_custom()';
        EXECUTE 'CREATE TRIGGER on_auth_user_email_confirmed AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_email_confirmation_custom()';

        RAISE NOTICE 'Triggers created on auth.users';
    ELSE
        RAISE NOTICE 'auth.users not found — skipping trigger creation (will create when auth.users exists)';
    END IF;
END
$$;


-- ============================================================================
-- PART 5: Row Level Security (RLS) policies for profiles
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT
    USING ( auth.uid() = id OR auth.uid() = user_id );

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE
    USING ( auth.uid() = id OR auth.uid() = user_id );

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT
    WITH CHECK ( auth.uid() = id OR auth.uid() = user_id );


-- ============================================================================
-- ============================================================================
-- PART 6: Helper functions (access check + profile fetch + validate company)
-- ============================================================================

-- Drop old versions to avoid "cannot change return type" errors
DROP FUNCTION IF EXISTS public.check_user_access(uuid);
DROP FUNCTION IF EXISTS public.get_user_profile_with_access(uuid);

CREATE OR REPLACE FUNCTION public.check_user_access(user_uuid uuid DEFAULT auth.uid())
RETURNS TABLE (
    has_access boolean,
    is_trial_active boolean,
    is_subscription_active boolean,
    trial_expires_at timestamptz,
    subscription_status text
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
    SELECT * INTO profile_record
    FROM public.profiles
    WHERE id = user_uuid OR user_id = user_uuid
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, false, false, NULL::timestamptz, 'no_profile'::text;
        RETURN;
    END IF;

    IF profile_record.trial_end IS NOT NULL AND profile_record.trial_end > NOW() THEN
        trial_active := true;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'billing_profiles'
    ) THEN
        SELECT * INTO subscription_record
        FROM public.billing_profiles
        WHERE id = user_uuid
        LIMIT 1;

        IF FOUND AND subscription_record.subscription_status = 'active' THEN
            subscription_active := true;
        END IF;
    END IF;

    RETURN QUERY
        SELECT (trial_active OR subscription_active),
               trial_active,
               subscription_active,
               profile_record.trial_end,
               COALESCE(subscription_record.subscription_status, 'trial'::text);
END;
$$;


CREATE OR REPLACE FUNCTION public.get_user_profile_with_access(user_uuid uuid DEFAULT auth.uid())
RETURNS TABLE (
    id uuid,
    user_id uuid,
    email text,
    full_name text,
    company_name text,
    email_confirmed boolean,
    trial_start timestamptz,
    trial_end timestamptz,
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
        p.id, p.user_id, p.email, p.full_name, p.company_name, p.email_confirmed,
        p.trial_start, p.trial_end,
        a.has_access, a.is_trial_active, a.is_subscription_active, a.subscription_status,
        p.created_at, p.updated_at
    FROM public.profiles p
    CROSS JOIN LATERAL public.check_user_access(p.id) a
    WHERE p.id = user_uuid OR p.user_id = user_uuid;
END;
$$;


CREATE OR REPLACE FUNCTION public.validate_company_name(company_name_input text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN company_name_input IS NOT NULL
        AND TRIM(company_name_input) <> ''
        AND LENGTH(TRIM(company_name_input)) >= 2
        AND LENGTH(TRIM(company_name_input)) <= 100;
END;
$$;

-- ============================================================================
-- PART 7: Grants
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.handle_new_user_custom() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_email_confirmation_custom() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_with_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_company_name(text) TO authenticated;


-- ============================================================================
-- PART 8: Update existing profiles fallback values (idempotent)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        EXECUTE $sync$
            UPDATE public.profiles p
            SET email_confirmed = (u.email_confirmed_at IS NOT NULL)
            FROM auth.users u
            WHERE p.id = u.id OR p.user_id = u.id
        $sync$;
    END IF;

    -- Ensure company_name fallback exists
    UPDATE public.profiles
    SET company_name = 'Individual User'
    WHERE company_name IS NULL OR TRIM(company_name) = '';

    -- Ensure timestamps exist
    UPDATE public.profiles
    SET created_at = COALESCE(created_at, NOW()), updated_at = COALESCE(updated_at, NOW());
END
$$;


-- ============================================================================
-- PART 9: Logging & final status (safe)
-- ============================================================================
DO $$
DECLARE
    profile_count int;
    confirmed_count int;
    company_count int;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    SELECT COUNT(*) INTO confirmed_count FROM public.profiles WHERE email_confirmed = TRUE;
    SELECT COUNT(*) INTO company_count FROM public.profiles WHERE company_name IS NOT NULL AND TRIM(company_name) <> '';

    RAISE NOTICE 'Migration finished: profiles=% confirmed=% with_company=%', profile_count, confirmed_count, company_count;
END
$$;

-- Final message
SELECT 'Custom authentication system with company_name requirement applied (idempotent).' AS status;
