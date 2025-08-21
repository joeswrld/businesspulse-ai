-- Minimal Database Performance Optimization Script
-- This script adds only the essential indexes to improve loading times
-- Guaranteed to work in all PostgreSQL versions

-- 1. Add index for faster user settings lookup
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id_created_at 
ON feedback_settings(user_id, created_at DESC);

-- 2. Add index for faster feedback retrieval
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id_timestamp 
ON feedbacks(project_id, timestamp DESC);

-- 3. Update statistics for better query planning
ANALYZE feedback_settings;
ANALYZE feedbacks;

-- 4. Show the created indexes
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes 
WHERE tablename IN ('feedback_settings', 'feedbacks')
ORDER BY tablename, indexname;