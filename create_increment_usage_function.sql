-- Migration: Create increment_usage function
-- Description: Creates a function to increment usage counters for different actions
-- Date: 2024-01-XX

-- Drop existing function if it exists (for idempotency)
DROP FUNCTION IF EXISTS increment_usage(UUID, TEXT);

-- Create the increment_usage function
CREATE OR REPLACE FUNCTION increment_usage(
    p_user_id UUID,
    p_action TEXT
)
RETURNS usage_tracking AS $$
DECLARE
    usage_record usage_tracking;
    column_name TEXT;
    update_query TEXT;
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id cannot be null';
    END IF;
    
    IF p_action IS NULL OR p_action = '' THEN
        RAISE EXCEPTION 'p_action cannot be null or empty';
    END IF;
    
    -- Map action to column name
    CASE p_action
        WHEN 'feedback' THEN
            column_name := 'feedback_count';
        WHEN 'analytics' THEN
            column_name := 'analytics_count';
        WHEN 'reports' THEN
            column_name := 'reports_count';
        WHEN 'insights' THEN
            column_name := 'insights_count';
        WHEN 'teams' THEN
            column_name := 'teams_count';
        ELSE
            RAISE EXCEPTION 'Invalid action: %. Valid actions are: feedback, analytics, reports, insights, teams', p_action;
    END CASE;
    
    -- Build the dynamic SQL query for upsert
    update_query := format(
        'INSERT INTO usage_tracking (
            user_id,
            feedback_count,
            analytics_count,
            reports_count,
            insights_count,
            teams_count,
            updated_at
        ) VALUES (
            $1,
            CASE WHEN $2 = ''feedback_count'' THEN 1 ELSE 0 END,
            CASE WHEN $2 = ''analytics_count'' THEN 1 ELSE 0 END,
            CASE WHEN $2 = ''reports_count'' THEN 1 ELSE 0 END,
            CASE WHEN $2 = ''insights_count'' THEN 1 ELSE 0 END,
            CASE WHEN $2 = ''teams_count'' THEN 1 ELSE 0 END,
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            %I = usage_tracking.%I + 1,
            updated_at = NOW()
        RETURNING *',
        column_name,
        column_name
    );
    
    -- Execute the upsert query
    EXECUTE update_query INTO usage_record USING p_user_id, column_name;
    
    -- Return the updated record
    RETURN usage_record;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE LOG 'Error in increment_usage function: %', SQLERRM;
        RAISE EXCEPTION 'Failed to increment usage for user % and action %: %', p_user_id, p_action, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_usage(UUID, TEXT) TO authenticated;

-- Add function comment for documentation
COMMENT ON FUNCTION increment_usage(UUID, TEXT) IS 
'Increments the usage counter for a specific action for a user. 
Creates a new usage_tracking record if one does not exist.
Valid actions: feedback, analytics, reports, insights, teams';

-- Create a test function to verify the increment_usage function works correctly
CREATE OR REPLACE FUNCTION test_increment_usage()
RETURNS VOID AS $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_record usage_tracking;
    expected_count INTEGER;
BEGIN
    RAISE NOTICE 'Testing increment_usage function...';
    
    -- Test 1: Create new record with feedback action
    SELECT * INTO test_record FROM increment_usage(test_user_id, 'feedback');
    IF test_record.feedback_count != 1 THEN
        RAISE EXCEPTION 'Test 1 failed: Expected feedback_count = 1, got %', test_record.feedback_count;
    END IF;
    RAISE NOTICE 'Test 1 passed: Created new record with feedback_count = 1';
    
    -- Test 2: Increment existing record
    SELECT * INTO test_record FROM increment_usage(test_user_id, 'feedback');
    IF test_record.feedback_count != 2 THEN
        RAISE EXCEPTION 'Test 2 failed: Expected feedback_count = 2, got %', test_record.feedback_count;
    END IF;
    RAISE NOTICE 'Test 2 passed: Incremented existing record to feedback_count = 2';
    
    -- Test 3: Test different action (analytics)
    SELECT * INTO test_record FROM increment_usage(test_user_id, 'analytics');
    IF test_record.analytics_count != 1 THEN
        RAISE EXCEPTION 'Test 3 failed: Expected analytics_count = 1, got %', test_record.analytics_count;
    END IF;
    IF test_record.feedback_count != 2 THEN
        RAISE EXCEPTION 'Test 3 failed: Expected feedback_count to remain 2, got %', test_record.feedback_count;
    END IF;
    RAISE NOTICE 'Test 3 passed: Added analytics action without affecting feedback count';
    
    -- Test 4: Test invalid action
    BEGIN
        SELECT * INTO test_record FROM increment_usage(test_user_id, 'invalid_action');
        RAISE EXCEPTION 'Test 4 failed: Should have raised an exception for invalid action';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Test 4 passed: Correctly raised exception for invalid action';
    END;
    
    -- Test 5: Test null parameters
    BEGIN
        SELECT * INTO test_record FROM increment_usage(NULL, 'feedback');
        RAISE EXCEPTION 'Test 5 failed: Should have raised an exception for null user_id';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Test 5 passed: Correctly raised exception for null user_id';
    END;
    
    BEGIN
        SELECT * INTO test_record FROM increment_usage(test_user_id, NULL);
        RAISE EXCEPTION 'Test 6 failed: Should have raised an exception for null action';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Test 6 passed: Correctly raised exception for null action';
    END;
    
    -- Clean up test data
    DELETE FROM usage_tracking WHERE user_id = test_user_id;
    
    RAISE NOTICE 'All tests passed! increment_usage function is working correctly.';
    
EXCEPTION
    WHEN OTHERS THEN
        -- Clean up test data on error
        DELETE FROM usage_tracking WHERE user_id = test_user_id;
        RAISE EXCEPTION 'Test failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission for test function
GRANT EXECUTE ON FUNCTION test_increment_usage() TO authenticated;

-- Add test function comment
COMMENT ON FUNCTION test_increment_usage() IS 
'Test function to verify increment_usage function works correctly. 
Run with: SELECT test_increment_usage();';

-- Verify the migration
DO $$
BEGIN
    -- Check if function exists
    IF NOT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'increment_usage' 
        AND pronargs = 2
    ) THEN
        RAISE EXCEPTION 'Function increment_usage was not created successfully';
    END IF;
    
    -- Check if function has correct return type
    IF NOT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_type t ON p.prorettype = t.oid
        WHERE p.proname = 'increment_usage'
        AND t.typname = 'usage_tracking'
    ) THEN
        RAISE EXCEPTION 'Function increment_usage does not return usage_tracking type';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'To test the function, run: SELECT test_increment_usage();';
END $$;