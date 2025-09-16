-- ============================================================================
-- FIX PROFILES TABLE STRUCTURE AND AUTH TRIGGERS
-- ============================================================================

-- PART 1: Ensure profiles table structure
DO $$
DECLARE
    has_user_id_col BOOLEAN;
    has_email_confirmed_col BOOLEAN;
    has_trial_start_col BOOLEAN;
    has_trial_end_col BOOLEAN;
BEGIN
    -- Check existing columns
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id'
    ) INTO has_user_id_col;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email_confirmed'
    ) INTO has_email_confirmed_col;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'trial_start'
    ) INTO has_trial_start_col;

    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'trial_end'
    ) INTO has_trial_end_col;

    -- Add missing columns
    IF NOT has_user_id_col THEN
        ALTER TABLE profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT has_email_confirmed_col THEN
        ALTER TABLE profiles ADD COLUMN email_confirmed BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT has_trial_start_col THEN
        ALTER TABLE profiles ADD COLUMN trial_start TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT has_trial_end_col THEN
        ALTER TABLE profiles ADD COLUMN trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '8 days');
    END IF;

    -- Add constraints safely
    BEGIN
        ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ============================================================================
-- PART 2: Update profiles email confirmation from auth.users
-- ============================================================================
UPDATE profiles 
SET email_confirmed = (u.email_confirmed_at IS NOT NULL)
FROM auth.users u
WHERE profiles.id = u.id OR profiles.user_id = u.id;

-- ============================================================================
-- PART 3: Trigger functions
-- ============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (
        id, user_id, email, email_confirmed, trial_start, trial_end, created_at, updated_at
    ) VALUES (
        NEW.id, NEW.id, NEW.email, (NEW.email_confirmed_at IS NOT NULL),
        NOW(), NOW() + INTERVAL '8 days', NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        email_confirmed = EXCLUDED.email_confirmed,
        updated_at = NOW()
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        email_confirmed = EXCLUDED.email_confirmed,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to handle email confirmation updates
CREATE OR REPLACE FUNCTION handle_email_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at THEN
        UPDATE profiles 
        SET email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
            updated_at = NOW()
        WHERE profiles.id = NEW.id OR profiles.user_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
AFTER UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_email_confirmation();

-- ============================================================================
-- PART 4: RLS Policies
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

-- ============================================================================
-- PART 5: Helper Functions
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_profile(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email TEXT,
    email_confirmed BOOLEAN,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    full_name TEXT,
    avatar_url TEXT,
    company TEXT,
    role TEXT,
    preferences JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.user_id, p.email, p.email_confirmed,
        p.trial_start, p.trial_end, p.full_name, p.avatar_url,
        p.company, p.role, p.preferences, p.created_at, p.updated_at
    FROM profiles p
    WHERE p.id = user_uuid OR p.user_id = user_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION is_user_email_confirmed(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE confirmed BOOLEAN;
BEGIN
    SELECT email_confirmed INTO confirmed
    FROM profiles
    WHERE id = user_uuid OR user_id = user_uuid;

    RETURN COALESCE(confirmed, FALSE);
END;
$$;

-- ============================================================================
-- PART 6: Grants
-- ============================================================================
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_email_confirmation() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_email_confirmed(UUID) TO authenticated;

-- ============================================================================
-- PART 7: Final Log
-- ============================================================================
DO $$
DECLARE
    profile_count INTEGER;
    confirmed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO confirmed_count FROM profiles WHERE email_confirmed = TRUE;

    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Total profiles: %', profile_count;
    RAISE NOTICE 'Confirmed profiles: %', confirmed_count;
END $$;

SELECT 'Profiles table structure and auth triggers fixed successfully!' as status;
