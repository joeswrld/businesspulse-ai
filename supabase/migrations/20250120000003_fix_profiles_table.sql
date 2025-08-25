-- Fix profiles table structure to match expected schema
-- This migration safely handles existing profiles table and adds missing columns

-- First, let's check what columns exist in the profiles table
DO $$
DECLARE
    column_record RECORD;
    has_email BOOLEAN := FALSE;
    has_full_name BOOLEAN := FALSE;
    has_avatar_url BOOLEAN := FALSE;
    has_company BOOLEAN := FALSE;
    has_role BOOLEAN := FALSE;
    has_preferences BOOLEAN := FALSE;
    has_created_at BOOLEAN := FALSE;
    has_updated_at BOOLEAN := FALSE;
BEGIN
    -- Check which columns exist
    FOR column_record IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND table_schema = 'public'
    LOOP
        CASE column_record.column_name
            WHEN 'email' THEN has_email := TRUE;
            WHEN 'full_name' THEN has_full_name := TRUE;
            WHEN 'avatar_url' THEN has_avatar_url := TRUE;
            WHEN 'company' THEN has_company := TRUE;
            WHEN 'role' THEN has_role := TRUE;
            WHEN 'preferences' THEN has_preferences := TRUE;
            WHEN 'created_at' THEN has_created_at := TRUE;
            WHEN 'updated_at' THEN has_updated_at := TRUE;
        END CASE;
    END LOOP;

    -- Add missing columns
    IF NOT has_email THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
    END IF;

    IF NOT has_full_name THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
    END IF;

    IF NOT has_avatar_url THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;

    IF NOT has_company THEN
        ALTER TABLE profiles ADD COLUMN company TEXT;
    END IF;

    IF NOT has_role THEN
        ALTER TABLE profiles ADD COLUMN role TEXT;
    END IF;

    IF NOT has_preferences THEN
        ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{}';
    END IF;

    IF NOT has_created_at THEN
        ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    IF NOT has_updated_at THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    RAISE NOTICE 'Profiles table structure updated successfully';
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
    -- Check if policies exist and create them if they don't
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile" ON profiles
          FOR SELECT USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile" ON profiles
          FOR UPDATE USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
        CREATE POLICY "Users can insert their own profile" ON profiles
          FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Update existing profiles with missing data from auth.users
UPDATE profiles 
SET 
    email = COALESCE(profiles.email, auth_users.email),
    full_name = COALESCE(profiles.full_name, auth_users.raw_user_meta_data->>'full_name')
FROM auth.users auth_users
WHERE profiles.id = auth_users.id
AND (profiles.email IS NULL OR profiles.full_name IS NULL);

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();