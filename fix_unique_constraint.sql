-- Fix: Add unique constraint to user_profiles.user_id
-- This script fixes the ON CONFLICT issue

-- ===============================
-- 1. Add unique constraint if it doesn't exist
-- ===============================

-- Check if unique constraint exists, if not add it
DO $$
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%user_id%'
    ) THEN
        -- Add unique constraint
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id);
        RAISE NOTICE '✓ Added unique constraint to user_profiles.user_id';
    ELSE
        RAISE NOTICE '✓ Unique constraint already exists on user_profiles.user_id';
    END IF;
END $$;

-- ===============================
-- 2. Verify the constraint exists
-- ===============================

-- Show constraints on user_profiles table
SELECT 
    constraint_name,
    constraint_type,
    column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_profiles'
AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name;

-- Success message
SELECT '✅ Unique constraint added successfully!' as status;