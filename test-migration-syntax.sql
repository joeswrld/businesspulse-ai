-- Test script to verify SQL syntax
-- This script tests the trigger function creation without actually creating tables

-- Test the trigger function creation
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Test that the function was created successfully
SELECT proname, prosrc FROM pg_proc WHERE proname = 'update_updated_at_column';

-- Clean up the test function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- If we get here without errors, the syntax is correct
SELECT 'SQL syntax test passed!' as result;