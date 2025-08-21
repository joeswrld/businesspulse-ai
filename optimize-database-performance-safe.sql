-- Safe Database Performance Optimization Script
-- This script adds indexes and optimizations to improve loading times
-- WITHOUT causing column errors

-- 1. Add indexes for faster queries (safe)
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id_created_at 
ON feedback_settings(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id_timestamp 
ON feedbacks(project_id, timestamp DESC);

-- 2. Add partial indexes for better performance (safe)
CREATE INDEX IF NOT EXISTS idx_feedback_settings_active 
ON feedback_settings(user_id, created_at DESC) 
WHERE project_id IS NOT NULL AND project_id != '';

-- 3. Create a view for faster settings retrieval (safe)
CREATE OR REPLACE VIEW active_feedback_settings AS
SELECT DISTINCT ON (user_id) 
  id,
  user_id,
  project_id,
  project_id_locked,
  title,
  show_name,
  show_email,
  button_text,
  redirect_url,
  theme,
  brand_color,
  notify_email,
  created_at,
  updated_at
FROM feedback_settings 
WHERE project_id IS NOT NULL 
  AND project_id != '' 
  AND project_id_locked = true
ORDER BY user_id, created_at DESC;

-- 4. Add statistics for better query planning
ANALYZE feedback_settings;
ANALYZE feedbacks;

-- 5. Create a function for optimized settings retrieval (safe)
CREATE OR REPLACE FUNCTION get_user_feedback_settings(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  project_id TEXT,
  project_id_locked BOOLEAN,
  title TEXT,
  show_name BOOLEAN,
  show_email BOOLEAN,
  button_text TEXT,
  redirect_url TEXT,
  theme TEXT,
  brand_color TEXT,
  notify_email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fs.id,
    fs.user_id,
    fs.project_id,
    fs.project_id_locked,
    fs.title,
    fs.show_name,
    fs.show_email,
    fs.button_text,
    fs.redirect_url,
    fs.theme,
    fs.brand_color,
    fs.notify_email,
    fs.created_at,
    fs.updated_at
  FROM feedback_settings fs
  WHERE fs.user_id = user_uuid
  ORDER BY fs.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Grant necessary permissions
GRANT SELECT ON active_feedback_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_feedback_settings(UUID) TO authenticated;

-- 7. Add RLS policies for the view
ALTER VIEW active_feedback_settings SET (security_invoker = true);

-- 8. Create a materialized view for frequently accessed data (safe)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_feedback_summary AS
SELECT 
  fs.user_id,
  COUNT(f.id) as total_feedbacks,
  COUNT(f.id) FILTER (WHERE f.status = 'new') as new_feedbacks,
  COUNT(f.id) FILTER (WHERE f.status = 'reviewed') as reviewed_feedbacks,
  COUNT(f.id) FILTER (WHERE f.status = 'resolved') as resolved_feedbacks,
  MAX(f.timestamp) as latest_feedback
FROM feedback_settings fs
LEFT JOIN feedbacks f ON fs.project_id = f.project_id
WHERE fs.project_id IS NOT NULL AND fs.project_id != ''
GROUP BY fs.user_id;

-- 9. Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_user_feedback_summary_user_id 
ON user_feedback_summary(user_id);

-- 10. Grant permissions for the materialized view
GRANT SELECT ON user_feedback_summary TO authenticated;

-- 11. Add RLS policy for the materialized view
ALTER MATERIALIZED VIEW user_feedback_summary SET (security_invoker = true);

-- 12. Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_feedback_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_feedback_summary;
END;
$$ LANGUAGE plpgsql;

-- 13. Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_feedback_summary() TO authenticated;

-- 14. Show the created indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('feedback_settings', 'feedbacks')
ORDER BY tablename, indexname;

-- 15. Verify the view was created
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE viewname = 'active_feedback_settings';

-- 16. Verify the materialized view was created
SELECT 
  schemaname,
  matviewname,
  definition
FROM pg_matviews 
WHERE matviewname = 'user_feedback_summary';