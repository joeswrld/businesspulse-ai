-- Migrate to Global Project ID Uniqueness
-- This script ensures that each project_id can only be used by one user globally

-- First, drop the existing per-user unique constraint
DROP INDEX IF EXISTS idx_feedback_settings_project_id_user_unique;

-- Create a global unique constraint on project_id (excluding empty values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_settings_project_id_global_unique 
ON feedback_settings (project_id) 
WHERE project_id IS NOT NULL AND project_id != '';

-- Add a check constraint to ensure project_id is not empty when locked
ALTER TABLE feedback_settings DROP CONSTRAINT IF EXISTS feedback_settings_project_id_locked_check;
ALTER TABLE feedback_settings ADD CONSTRAINT feedback_settings_project_id_locked_check 
CHECK (NOT project_id_locked OR (project_id IS NOT NULL AND project_id != ''));

-- Add a check constraint to ensure project_id is not empty
ALTER TABLE feedback_settings ADD CONSTRAINT feedback_settings_project_id_not_empty 
CHECK (project_id IS NOT NULL AND project_id != '');

-- Update any existing empty project_ids to have a default value
UPDATE feedback_settings 
SET project_id = 'project-' || id::text 
WHERE (project_id IS NULL OR project_id = '') AND project_id_locked = true;

-- Add comment explaining the new constraint
COMMENT ON INDEX idx_feedback_settings_project_id_global_unique IS
'Ensures each project_id is globally unique across all users';

-- Verify the constraint
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname = 'idx_feedback_settings_project_id_global_unique';