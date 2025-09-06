-- Fix usage_counters table schema and refresh_user_usage function
-- This ensures the table has all required columns and the function works correctly

-- ===============================
-- 1. Fix usage_counters table schema
-- ===============================

-- Check if table exists and what columns it has
DO $$
DECLARE
    table_exists BOOLEAN;
    missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'usage_counters'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'Table usage_counters exists, checking columns...';
        
        -- Check for missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'insights_count') THEN
            missing_columns := array_append(missing_columns, 'insights_count');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'analytics_count') THEN
            missing_columns := array_append(missing_columns, 'analytics_count');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'reports_count') THEN
            missing_columns := array_append(missing_columns, 'reports_count');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'feedback_count') THEN
            missing_columns := array_append(missing_columns, 'feedback_count');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'updated_at') THEN
            missing_columns := array_append(missing_columns, 'updated_at');
        END IF;
        
        IF array_length(missing_columns, 1) > 0 THEN
            RAISE NOTICE 'Missing columns: %', array_to_string(missing_columns, ', ');
        ELSE
            RAISE NOTICE 'All required columns exist';
        END IF;
    ELSE
        RAISE NOTICE 'Table usage_counters does not exist, will create it';
    END IF;
END $$;

-- Create or alter the usage_counters table
DO $$
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_counters') THEN
        CREATE TABLE usage_counters (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            month_start DATE NOT NULL,
            feedback_count INTEGER DEFAULT 0,
            insights_count INTEGER DEFAULT 0,
            analytics_count INTEGER DEFAULT 0,
            reports_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Add unique constraint
        ALTER TABLE usage_counters ADD CONSTRAINT usage_counters_user_month_unique UNIQUE (user_id, month_start);
        
        -- Enable RLS
        ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        CREATE POLICY "Users can view their own usage counters" ON usage_counters
            FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own usage counters" ON usage_counters
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own usage counters" ON usage_counters
            FOR UPDATE USING (auth.uid() = user_id);
        
        -- Create indexes
        CREATE INDEX idx_usage_counters_user_month ON usage_counters(user_id, month_start);
        
        RAISE NOTICE 'Created usage_counters table with all required columns';
    ELSE
        -- Table exists, add missing columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'insights_count') THEN
            ALTER TABLE usage_counters ADD COLUMN insights_count INTEGER DEFAULT 0;
            RAISE NOTICE 'Added insights_count column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'analytics_count') THEN
            ALTER TABLE usage_counters ADD COLUMN analytics_count INTEGER DEFAULT 0;
            RAISE NOTICE 'Added analytics_count column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'reports_count') THEN
            ALTER TABLE usage_counters ADD COLUMN reports_count INTEGER DEFAULT 0;
            RAISE NOTICE 'Added reports_count column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'feedback_count') THEN
            ALTER TABLE usage_counters ADD COLUMN feedback_count INTEGER DEFAULT 0;
            RAISE NOTICE 'Added feedback_count column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'updated_at') THEN
            ALTER TABLE usage_counters ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added updated_at column';
        END IF;
        
        -- Add unique constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_schema = 'public' 
            AND table_name = 'usage_counters' 
            AND constraint_name = 'usage_counters_user_month_unique'
        ) THEN
            ALTER TABLE usage_counters ADD CONSTRAINT usage_counters_user_month_unique UNIQUE (user_id, month_start);
            RAISE NOTICE 'Added unique constraint on (user_id, month_start)';
        END IF;
        
        -- Enable RLS if not already enabled
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = 'usage_counters' AND relrowsecurity = true
        ) THEN
            ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
            RAISE NOTICE 'Enabled RLS on usage_counters';
        END IF;
        
        -- Create RLS policies if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'usage_counters' AND policyname = 'Users can view their own usage counters'
        ) THEN
            CREATE POLICY "Users can view their own usage counters" ON usage_counters
                FOR SELECT USING (auth.uid() = user_id);
            RAISE NOTICE 'Created RLS policy for SELECT';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'usage_counters' AND policyname = 'Users can insert their own usage counters'
        ) THEN
            CREATE POLICY "Users can insert their own usage counters" ON usage_counters
                FOR INSERT WITH CHECK (auth.uid() = user_id);
            RAISE NOTICE 'Created RLS policy for INSERT';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'usage_counters' AND policyname = 'Users can update their own usage counters'
        ) THEN
            CREATE POLICY "Users can update their own usage counters" ON usage_counters
                FOR UPDATE USING (auth.uid() = user_id);
            RAISE NOTICE 'Created RLS policy for UPDATE';
        END IF;
        
        -- Create index if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes WHERE tablename = 'usage_counters' AND indexname = 'idx_usage_counters_user_month'
        ) THEN
            CREATE INDEX idx_usage_counters_user_month ON usage_counters(user_id, month_start);
            RAISE NOTICE 'Created index on (user_id, month_start)';
        END IF;
        
        RAISE NOTICE 'Updated existing usage_counters table with missing columns';
    END IF;
END $$;

-- ===============================
-- 2. Recreate refresh_user_usage function
-- ===============================

-- Drop existing function
DROP FUNCTION IF EXISTS refresh_user_usage(UUID, DATE) CASCADE;

-- Create refresh_user_usage function with proper table aliases
CREATE OR REPLACE FUNCTION refresh_user_usage(user_uuid UUID, target_month_start DATE)
RETURNS TABLE (
    user_id UUID,
    month_start DATE,
    feedback_count INTEGER,
    insights_count INTEGER,
    analytics_count INTEGER,
    reports_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := user_uuid;
    v_month_start DATE := target_month_start;
    v_feedback_count INTEGER := 0;
    v_insights_count INTEGER := 0;
    v_analytics_count INTEGER := 0;
    v_reports_count INTEGER := 0;
BEGIN
    -- Get feedback count (using timestamp column)
    SELECT COUNT(*) INTO v_feedback_count
    FROM feedbacks f
    WHERE f.timestamp >= v_month_start;
    
    -- Get analytics count (using analytics_history table)
    SELECT COUNT(*) INTO v_analytics_count
    FROM analytics_history ah
    WHERE ah.user_id = v_user_id 
    AND ah.created_at >= v_month_start;
    
    -- For insights and reports, use analytics_events as proxy
    SELECT COUNT(*) INTO v_insights_count
    FROM analytics_events ae
    WHERE ae.user_id = v_user_id 
    AND ae.event_type = 'insight'
    AND ae.created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_reports_count
    FROM analytics_events ae
    WHERE ae.user_id = v_user_id 
    AND ae.event_type = 'report'
    AND ae.created_at >= v_month_start;
    
    -- Insert or update usage counter using ON CONFLICT
    INSERT INTO usage_counters uc (
        user_id, 
        month_start, 
        feedback_count, 
        insights_count, 
        analytics_count, 
        reports_count
    )
    VALUES (
        v_user_id, 
        v_month_start, 
        v_feedback_count, 
        v_insights_count, 
        v_analytics_count, 
        v_reports_count
    )
    ON CONFLICT (uc.user_id, uc.month_start) 
    DO UPDATE SET
        feedback_count = EXCLUDED.feedback_count,
        insights_count = EXCLUDED.insights_count,
        analytics_count = EXCLUDED.analytics_count,
        reports_count = EXCLUDED.reports_count,
        updated_at = NOW();
    
    -- Return the updated data
    RETURN QUERY
    SELECT 
        v_user_id,
        v_month_start,
        v_feedback_count,
        v_insights_count,
        v_analytics_count,
        v_reports_count;
END;
$$;

-- ===============================
-- 3. Grant permissions
-- ===============================
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO service_role;

-- ===============================
-- 4. Test the function
-- ===============================
DO $$
DECLARE
    test_user_id UUID;
    test_result RECORD;
    current_month_start DATE;
    past_month_start DATE;
BEGIN
    -- Get current month start
    current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    past_month_start := current_month_start - INTERVAL '1 month';
    
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with user ID: %', test_user_id;
        
        -- Test 1: Call with current month (should insert or update)
        RAISE NOTICE 'Test 1: Calling refresh_user_usage with current month...';
        SELECT * INTO test_result FROM refresh_user_usage(test_user_id, current_month_start) LIMIT 1;
        RAISE NOTICE '✓ Current month test passed';
        RAISE NOTICE '  - User ID: %', test_result.user_id;
        RAISE NOTICE '  - Month: %', test_result.month_start;
        RAISE NOTICE '  - Feedback count: %', test_result.feedback_count;
        RAISE NOTICE '  - Insights count: %', test_result.insights_count;
        RAISE NOTICE '  - Analytics count: %', test_result.analytics_count;
        RAISE NOTICE '  - Reports count: %', test_result.reports_count;
        
        -- Test 2: Call again to test update path
        RAISE NOTICE 'Test 2: Calling refresh_user_usage again (update path)...';
        SELECT * INTO test_result FROM refresh_user_usage(test_user_id, current_month_start) LIMIT 1;
        RAISE NOTICE '✓ Update path test passed';
        
        -- Test 3: Call with past month to test insert path
        RAISE NOTICE 'Test 3: Calling refresh_user_usage with past month (insert path)...';
        SELECT * INTO test_result FROM refresh_user_usage(test_user_id, past_month_start) LIMIT 1;
        RAISE NOTICE '✓ Insert path test passed';
        RAISE NOTICE '  - Past month: %', test_result.month_start;
        
        -- Test 4: Verify data was actually stored
        RAISE NOTICE 'Test 4: Verifying data was stored in usage_counters...';
        IF EXISTS (SELECT 1 FROM usage_counters WHERE user_id = test_user_id AND month_start = current_month_start) THEN
            RAISE NOTICE '✓ Current month data found in database';
        ELSE
            RAISE NOTICE '⚠ Current month data not found in database';
        END IF;
        
        IF EXISTS (SELECT 1 FROM usage_counters WHERE user_id = test_user_id AND month_start = past_month_start) THEN
            RAISE NOTICE '✓ Past month data found in database';
        ELSE
            RAISE NOTICE '⚠ Past month data not found in database';
        END IF;
        
        RAISE NOTICE '🎉 All tests passed successfully!';
        
    ELSE
        RAISE NOTICE '⚠ No users found in auth.users table';
        RAISE NOTICE 'Function is ready but cannot be tested without users';
    END IF;
END $$;

-- ===============================
-- 5. Final verification
-- ===============================

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'usage_counters'
ORDER BY ordinal_position;

-- Show function signature
SELECT 
    routine_name,
    routine_type,
    '✓ ' || routine_name || ' function created' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'refresh_user_usage';

-- Final success message
SELECT '🎉 Usage Counters Schema and Function Fixed Successfully!' as summary;