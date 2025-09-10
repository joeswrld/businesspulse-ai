-- Fix profiles table structure and authentication triggers for email confirmation
-- This migration addresses the "relation 'profiles' does not exist" error and email confirmation issues

-- ============================================================================
-- PART 1: FIX PROFILES TABLE STRUCTURE
-- ============================================================================

-- First, let's ensure the profiles table has the correct structure
-- We need to add missing columns and handle the existing data safely

DO $$
DECLARE
    has_user_id_col BOOLEAN;
    has_email_confirmed_col BOOLEAN;
    has_trial_start_col BOOLEAN;
    has_trial_end_col BOOLEAN;
    primary_key_col TEXT;
BEGIN
    -- Check which columns exist in the profiles table
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) INTO has_user_id_col;
    
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
    
    -- Determine the primary key column
    SELECT column_name INTO primary_key_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'profiles' 
        AND tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
    LIMIT 1;
    
    RAISE NOTICE 'Profiles table analysis: user_id_col=%, email_confirmed_col=%, trial_start_col=%, trial_end_col=%, primary_key=%', 
        has_user_id_col, has_email_confirmed_col, has_trial_start_col, has_trial_end_col, primary_key_col;
    
    -- Add missing columns
    IF NOT has_user_id_col THEN
        ALTER TABLE profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column to profiles table';
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
    
    -- If the primary key is 'id' and we have 'user_id', we need to populate user_id
    IF primary_key_col = 'id' AND has_user_id_col THEN
        UPDATE profiles SET user_id = id WHERE user_id IS NULL;
        RAISE NOTICE 'Populated user_id column with id values';
    END IF;
    
    -- Add unique constraint on user_id if it doesn't exist
    IF has_user_id_col THEN
        BEGIN
            ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
            RAISE NOTICE 'Added unique constraint on user_id';
        EXCEPTION WHEN duplicate_object THEN
            RAISE NOTICE 'Unique constraint on user_id already exists';
        END;
    END IF;
    
    -- Add unique constraint on email if it doesn't exist
    BEGIN
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
        RAISE NOTICE 'Added unique constraint on email';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Unique constraint on email already exists';
    END;
    
END $$;

-- ============================================================================
-- PART 2: UPDATE EXISTING PROFILES WITH EMAIL CONFIRMATION STATUS
-- ============================================================================

-- Update existing profiles to set email_confirmed based on auth.users.email_confirmed_at
UPDATE profiles 
SET email_confirmed = (auth_users.email_confirmed_at IS NOT NULL)
FROM auth.users auth_users
WHERE profiles.id = auth_users.id 
   OR profiles.user_id = auth_users.id;

-- ============================================================================
-- PART 3: CREATE AUTH USER CREATION TRIGGER
-- ============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert a new profile for the user
    INSERT INTO profiles (
        id,
        user_id,
        email,
        email_confirmed,
        trial_start,
        trial_end,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.id,
        NEW.email,
        (NEW.email_confirmed_at IS NOT NULL),
        NOW(),
        NOW() + INTERVAL '8 days',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        email_confirmed = EXCLUDED.email_confirmed,
        updated_at = NOW()
    ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        email_confirmed = EXCLUDED.email_confirmed,
        updated_at = NOW();
    
    RAISE NOTICE 'Created profile for new user: %', NEW.id;
    RETURN NEW;
END;
$$;

-- Create the trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- PART 4: CREATE EMAIL CONFIRMATION TRIGGER
-- ============================================================================

-- Function to handle email confirmation updates
CREATE OR REPLACE FUNCTION handle_email_confirmation()
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
        WHERE profiles.id = NEW.id 
           OR profiles.user_id = NEW.id;
        
        RAISE NOTICE 'Updated email_confirmed status for user: % (confirmed: %)', 
            NEW.id, (NEW.email_confirmed_at IS NOT NULL);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger for email confirmation updates
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_email_confirmation();

-- ============================================================================
-- PART 5: ENSURE RLS POLICIES ARE CORRECT
-- ============================================================================

-- Enable RLS on profiles table (should already be enabled, but let's be sure)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with correct logic
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create RLS policies that work with both id and user_id columns
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
-- PART 6: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to safely get user profile
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
        p.id,
        p.user_id,
        p.email,
        p.email_confirmed,
        p.trial_start,
        p.trial_end,
        p.full_name,
        p.avatar_url,
        p.company,
        p.role,
        p.preferences,
        p.created_at,
        p.updated_at
    FROM profiles p
    WHERE p.id = user_uuid OR p.user_id = user_uuid;
END;
$$;

-- Function to check if user email is confirmed
CREATE OR REPLACE FUNCTION is_user_email_confirmed(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    confirmed BOOLEAN;
BEGIN
    SELECT email_confirmed INTO confirmed
    FROM profiles
    WHERE id = user_uuid OR user_id = user_uuid;
    
    RETURN COALESCE(confirmed, FALSE);
END;
$$;

-- ============================================================================
-- PART 7: GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_email_confirmation() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_email_confirmed(UUID) TO authenticated;

-- ============================================================================
-- PART 8: VERIFICATION AND LOGGING
-- ============================================================================

-- Log the migration completion
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
    RAISE NOTICE 'Auth triggers created: on_auth_user_created, on_auth_user_email_confirmed';
END $$;

-- Final status message
SELECT 'Profiles table structure and auth triggers fixed successfully!' as status;