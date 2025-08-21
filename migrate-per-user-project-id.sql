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

-- Note: We're not recreating the foreign key constraint because it would require
-- project_id to be globally unique, which conflicts with per-user uniqueness.
-- The feedback system will work fine without this constraint as the relationship
-- is maintained through application logic.

-- If you need referential integrity, you can add it later by creating a composite
-- foreign key or by changing the design to use a different approach.

-- Add a comment to document the change
COMMENT ON INDEX idx_feedback_settings_project_id_user_unique IS 
'Ensures Project IDs are unique per user, allowing multiple users to use the same Project ID';

-- Verify the change by showing the new index
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname = 'idx_feedback_settings_project_id_user_unique';