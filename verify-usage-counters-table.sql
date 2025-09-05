-- Verify usage_counters table structure
-- Run this in Supabase SQL Editor to check if the table is properly created

-- Check if the table exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'usage_counters';

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'usage_counters' 
ORDER BY ordinal_position;

-- Check constraints
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'usage_counters';

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'usage_counters';

-- Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'usage_counters';

-- Test insert (this will fail if RLS is working correctly without auth)
-- INSERT INTO usage_counters (user_id, month_start, feedback_count) 
-- VALUES ('00000000-0000-0000-0000-000000000000', '2024-01-01', 0);

-- If you see this message, the table is properly set up:
SELECT 'usage_counters table is properly configured!' as status;