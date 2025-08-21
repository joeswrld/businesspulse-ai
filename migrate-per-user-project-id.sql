-- Migration Script: Change Project ID from Global to Per-User Uniqueness
-- Run this script in your Supabase SQL Editor to update existing databases

-- Drop the foreign key constraint first
ALTER TABLE feedbacks DROP CONSTRAINT IF EXISTS feedbacks_project_id_fkey;

-- Drop the old global unique constraint if it exists
ALTER TABLE feedback_settings DROP CONSTRAINT IF EXISTS feedback_settings_project_id_key;

-- Drop the old global unique index if it exists
DROP INDEX IF EXISTS idx_feedback_settings_project_id_unique;

-- Create the new per-user unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_settings_project_id_user_unique 
ON feedback_settings (user_id, project_id) 
WHERE project_id IS NOT NULL AND project_id != '';

-- Recreate the foreign key constraint with CASCADE options
ALTER TABLE feedbacks ADD CONSTRAINT feedbacks_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES feedback_settings(project_id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Add a comment to document the change
COMMENT ON INDEX idx_feedback_settings_project_id_user_unique IS 
'Ensures Project IDs are unique per user, allowing multiple users to use the same Project ID';

-- Verify the change by showing the new index
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname = 'idx_feedback_settings_project_id_user_unique';