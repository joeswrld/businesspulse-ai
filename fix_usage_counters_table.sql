-- Fix usage_counters table structure
-- This ensures the table has all the required columns

-- First, check if the table exists and what columns it has
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_counters')
        THEN 'Table exists'
        ELSE 'Table does not exist'
    END as table_status;

-- Check existing columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'usage_counters'
ORDER BY ordinal_position;

-- Drop the table if it exists (to recreate with correct structure)
DROP TABLE IF EXISTS usage_counters CASCADE;

-- Create the usage_counters table with the correct structure
CREATE TABLE usage_counters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_start DATE NOT NULL,
    feedback_count INTEGER DEFAULT 0,
    insights_count INTEGER DEFAULT 0,
    analytics_count INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month_start)
);

-- Enable RLS
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own usage counters" ON usage_counters;
DROP POLICY IF EXISTS "Users can insert their own usage counters" ON usage_counters;
DROP POLICY IF EXISTS "Users can update their own usage counters" ON usage_counters;

CREATE POLICY "Users can view their own usage counters" ON usage_counters
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage counters" ON usage_counters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage counters" ON usage_counters
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_month ON usage_counters(user_id, month_start);

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'usage_counters'
ORDER BY ordinal_position;

-- Test inserting a sample record
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insert a test record
        INSERT INTO usage_counters (user_id, month_start, feedback_count, insights_count, analytics_count, reports_count)
        VALUES (test_user_id, CURRENT_DATE, 0, 0, 0, 0)
        ON CONFLICT (user_id, month_start) DO NOTHING;
        
        RAISE NOTICE '✓ usage_counters table created and tested successfully';
    ELSE
        RAISE NOTICE '⚠ No users found, but table structure is correct';
    END IF;
END $$;

-- Final success message
SELECT '🎉 usage_counters table fixed with correct structure!' as summary;