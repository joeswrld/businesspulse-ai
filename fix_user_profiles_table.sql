-- Fix: Create user_profiles table and add trial tracking columns
-- This script handles the case where user_profiles table doesn't exist

-- ===============================
-- 1. Create user_profiles table if it doesn't exist
-- ===============================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    plan VARCHAR(20) DEFAULT 'free_trial',
    is_active BOOLEAN DEFAULT FALSE,
    trial_expired BOOLEAN DEFAULT FALSE
);

-- ===============================
-- 2. Add missing columns if they don't exist
-- ===============================

-- Add trial_start column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'trial_start') THEN
        ALTER TABLE user_profiles ADD COLUMN trial_start TIMESTAMPTZ;
    END IF;
END $$;

-- Add trial_end column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'trial_end') THEN
        ALTER TABLE user_profiles ADD COLUMN trial_end TIMESTAMPTZ;
    END IF;
END $$;

-- Add plan column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'plan') THEN
        ALTER TABLE user_profiles ADD COLUMN plan VARCHAR(20) DEFAULT 'free_trial';
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'is_active') THEN
        ALTER TABLE user_profiles ADD COLUMN is_active BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add trial_expired column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'trial_expired') THEN
        ALTER TABLE user_profiles ADD COLUMN trial_expired BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ===============================
-- 3. Add indexes for performance
-- ===============================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan ON user_profiles(plan);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_end ON user_profiles(trial_end);

-- ===============================
-- 4. Enable RLS
-- ===============================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ===============================
-- 5. Create RLS policies
-- ===============================

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: System can insert profiles
DROP POLICY IF EXISTS "System can insert profiles" ON user_profiles;
CREATE POLICY "System can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (true);

-- ===============================
-- 6. Test the table creation
-- ===============================

-- Verify table exists and has correct structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Success message
SELECT '✅ user_profiles table created successfully with trial tracking columns!' as status;