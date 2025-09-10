-- Custom Authentication System for NoteX Platform
-- This migration creates the complete custom auth system with company_name requirement

-- ============================================================================
-- PART 1: UPDATE PROFILES TABLE FOR CUSTOM AUTH
-- ============================================================================

-- Add missing columns to profiles table for custom auth requirements
DO $$
DECLARE
    has_company_name_col BOOLEAN;
    has_full_name_col BOOLEAN;
    has_email_confirmed_col BOOLEAN;
    has_trial_start_col BOOLEAN;
    has_trial_end_col BOOLEAN;
    has_user_id_col BOOLEAN;
BEGIN
    -- Check which columns exist
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'company_name'
        AND table_schema = 'public'
    ) INTO has_company_name_col;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'full_name'
        AND table_schema = 'public'
    ) INTO has_full_name_col;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'email_confirmed'
        AND table_schema = 'public'
    ) INTO has_email_confirmed_col;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'trial_start'
        AND table_schema = 'public'
    ) INTO has_trial_start_col;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'trial_end'
        AND table_schema = 'public'
    ) INTO has_trial_end_col;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) INTO has_user_id_col;
    
    -- Add missing columns
    IF NOT has_company_name_col THEN
        ALTER TABLE profiles ADD COLUMN company_name TEXT;
        RAISE NOTICE 'Added company_name column to profiles table';
    END IF;
    
    IF NOT has_full_name_col THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
        RAISE NOTICE 'Added full_name column to profiles table';
    END IF;
    
    IF NOT has_email_confirmed_col THEN
        ALTER TABLE profiles ADD COLUMN email_confirmed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added email_confirmed column to profiles table';
    END IF;
    
    IF NOT has_trial_start_col THEN
        ALTER TABLE profiles ADD COLUMN trial_start TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added trial_start column to profiles table';
    END IF;
    
    IF NOT has_trial_end_col THEN
        ALTER TABLE profiles ADD COLUMN trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '8 days');
        RAISE NOTICE 'Added trial_end column to profiles table';
    END IF;
    
    IF NOT has_user_id_col THEN
        ALTER TABLE profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column to profiles table';
    END IF;
    
    -- Populate user_id if it's null
    IF has_user_id_col THEN
        UPDATE profiles SET user_id = id WHERE user_id IS NULL;
        RAISE NOTICE 'Populated user_id column with id values';
    END IF;
    
    -- Add constraints
    BEGIN
        ALTER TABLE profiles ADD CONSTRAINT profiles_company_name_required CHECK (company_name IS NOT NULL AND company_name != '');
        RAISE NOTICE 'Added company_name required constraint';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Company name constraint already exists';
    END;
    
    BEGIN
        ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
        RAISE NOTICE 'Added unique constraint on user_id';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Unique constraint on user_id already exists';
    END;
    
    BEGIN
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
        RAISE NOTICE 'Added unique constraint on email';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Unique constraint on email already exists';
    END;
    
END $$;

-- ============================================================================
-- PART 2: CREATE CUSTOM AUTH FUNCTIONS
-- ============================================================================

-- Function to handle new user creation with company_name requirement
CREATE OR REPLACE FUNCTION handle_new_user_custom()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_metadata JSONB;
    full_name_value TEXT;
    company_name_value TEXT;
BEGIN
    -- Extract metadata from the new user
    user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    full_name_value := COALESCE(
        user_metadata->>'full_name',
        CONCAT(
            COALESCE(user_metadata->>'first_name', ''),
            ' ',
            COALESCE(user_metadata->>'last_name', '')
        )
    );
    company_name_value := user_metadata->>'company_name';
    
    -- Validate required fields
    IF company_name_value IS NULL OR company_name_value = '' THEN
        RAISE EXCEPTION 'Company name is required for NoteX accounts';
    END IF;
    
    -- Insert profile with all required fields
    INSERT INTO profiles (
        id,
        user_id,
        email,
        full_name,
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
        TRIM(full_name_value),
        TRIM(company_name_value),
        (NEW.email_confirmed_at IS NOT NULL),
        NOW(),
        NOW() + INTERVAL '8 days',
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Created profile for new user: % with company: %', NEW.id, company_name_value;
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create profile for user %: %', NEW.id, SQLERRM;
END;
$$;

-- Function to handle email confirmation updates
CREATE OR REPLACE FUNCTION handle_email_confirmation_custom()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update the profile's email_confirmed status when auth.users.email_confirmed_at changes
    IF OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at THEN
        UPDATE profiles 
        SET 
            email_confirmed = (NEW.email_confirmed_at IS NOT NULL),
            updated_at = NOW()
        WHERE profiles.id = NEW.id OR profiles.user_id = NEW.id;
        
        RAISE NOTICE 'Updated email_confirmed status for user: % (confirmed: %)', 
            NEW.id, (NEW.email_confirmed_at IS NOT NULL);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to check if user has active trial or subscription
CREATE OR REPLACE FUNCTION check_user_access(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    has_access BOOLEAN,
    is_trial_active BOOLEAN,
    is_subscription_active BOOLEAN,
    trial_expires_at TIMESTAMPTZ,
    subscription_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    profile_record RECORD;
    subscription_record RECORD;
    trial_active BOOLEAN := FALSE;
    subscription_active BOOLEAN := FALSE;
    access_granted BOOLEAN := FALSE;
BEGIN
    -- Get user profile
    SELECT * INTO profile_record
    FROM profiles
    WHERE id = user_uuid OR user_id = user_uuid;
    
    -- Check if profile exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, FALSE, FALSE, NULL::TIMESTAMPTZ, 'no_profile'::TEXT;
        RETURN;
    END IF;
    
    -- Check trial status
    IF profile_record.trial_end > NOW() THEN
        trial_active := TRUE;
    END IF;
    
    -- Check subscription status (if billing_profiles table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_profiles') THEN
        SELECT * INTO subscription_record
        FROM billing_profiles
        WHERE id = user_uuid;
        
        IF FOUND AND subscription_record.subscription_status = 'active' THEN
            subscription_active := TRUE;
        END IF;
    END IF;
    
    -- Grant access if trial is active OR subscription is active
    access_granted := trial_active OR subscription_active;
    
    RETURN QUERY SELECT 
        access_granted,
        trial_active,
        subscription_active,
        profile_record.trial_end,
        COALESCE(subscription_record.subscription_status, 'trial'::TEXT);
END;
$$;

-- ============================================================================
-- PART 3: CREATE AUTH TRIGGERS
-- ============================================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;

-- Create new triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_custom();

CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_email_confirmation_custom();

-- ============================================================================
-- PART 4: UPDATE RLS POLICIES
-- ============================================================================

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new RLS policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (
        auth.uid() = id OR 
        auth.uid() = user_id
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR 
        auth.uid() = user_id
    );

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        auth.uid() = user_id
    );

-- ============================================================================
-- PART 5: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get user profile with access status
CREATE OR REPLACE FUNCTION get_user_profile_with_access(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
    id UUID,
    user_id UUID,
    email TEXT,
    full_name TEXT,
    company_name TEXT,
    email_confirmed BOOLEAN,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    has_access BOOLEAN,
    is_trial_active BOOLEAN,
    is_subscription_active BOOLEAN,
    subscription_status TEXT,
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
        p.id,
        p.user_id,
        p.email,
        p.full_name,
        p.company_name,
        p.email_confirmed,
        p.trial_start,
        p.trial_end,
        access.has_access,
        access.is_trial_active,
        access.is_subscription_active,
        access.subscription_status,
        p.created_at,
        p.updated_at
    FROM profiles p
    CROSS JOIN LATERAL check_user_access(p.id) as access
    WHERE p.id = user_uuid OR p.user_id = user_uuid;
END;
$$;

-- Function to validate company name
CREATE OR REPLACE FUNCTION validate_company_name(company_name_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if company name is not null, not empty, and has reasonable length
    RETURN company_name_input IS NOT NULL 
           AND TRIM(company_name_input) != '' 
           AND LENGTH(TRIM(company_name_input)) >= 2 
           AND LENGTH(TRIM(company_name_input)) <= 100;
END;
$$;

-- ============================================================================
-- PART 6: GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user_custom() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_email_confirmation_custom() TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_with_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_company_name(TEXT) TO authenticated;

-- ============================================================================
-- PART 7: UPDATE EXISTING PROFILES
-- ============================================================================

-- Update existing profiles to set email_confirmed based on auth.users.email_confirmed_at
UPDATE profiles 
SET email_confirmed = (auth_users.email_confirmed_at IS NOT NULL)
FROM auth.users auth_users
WHERE profiles.id = auth_users.id 
   OR profiles.user_id = auth_users.id;

-- Set default company_name for existing profiles that don't have it
UPDATE profiles 
SET company_name = 'Individual User'
WHERE company_name IS NULL OR company_name = '';

-- ============================================================================
-- PART 8: VERIFICATION AND LOGGING
-- ============================================================================

-- Log the migration completion
DO $$
DECLARE
    profile_count INTEGER;
    confirmed_count INTEGER;
    company_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO confirmed_count FROM profiles WHERE email_confirmed = TRUE;
    SELECT COUNT(*) INTO company_count FROM profiles WHERE company_name IS NOT NULL AND company_name != '';
    
    RAISE NOTICE 'Custom auth system migration completed successfully!';
    RAISE NOTICE 'Total profiles: %', profile_count;
    RAISE NOTICE 'Confirmed profiles: %', confirmed_count;
    RAISE NOTICE 'Profiles with company names: %', company_count;
    RAISE NOTICE 'Auth triggers created: on_auth_user_created, on_auth_user_email_confirmed';
    RAISE NOTICE 'Company name is now required for all new signups';
END $$;

-- Final status message
SELECT 'Custom authentication system with company_name requirement created successfully!' as status;