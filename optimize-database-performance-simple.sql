-- Simple Database Performance Optimization Script
-- This script adds basic indexes to improve loading times
-- Compatible with all PostgreSQL versions

-- 1. Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id_created_at 
ON feedback_settings(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id_timestamp 
ON feedbacks(project_id, timestamp DESC);

-- 2. Add partial index for active settings
CREATE INDEX IF NOT EXISTS idx_feedback_settings_active 
ON feedback_settings(user_id, created_at DESC) 
WHERE project_id IS NOT NULL AND project_id != '';

-- 3. Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_feedbacks_status_timestamp 
ON feedbacks(status, timestamp DESC);

-- 4. Update statistics for better query planning
ANALYZE feedback_settings;
ANALYZE feedbacks;

-- 5. Show the created indexes
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes 
WHERE tablename IN ('feedback_settings', 'feedbacks')
ORDER BY tablename, indexname;

-- 6. Show table statistics
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('feedback_settings', 'feedbacks')
ORDER BY tablename;