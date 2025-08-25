-- Add unique constraint on project_id to ensure one project ID per user
-- This migration ensures that project_id is unique across all users

-- First, drop the constraint if it exists (to avoid errors)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'feedback_settings_project_id_unique'
  ) THEN
    DROP INDEX feedback_settings_project_id_unique;
  END IF;
END $$;

-- Add the unique constraint (excluding empty/null values)
CREATE UNIQUE INDEX feedback_settings_project_id_unique 
ON feedback_settings (project_id) 
WHERE project_id IS NOT NULL AND project_id != '';

-- Add a comment to document the constraint
COMMENT ON INDEX feedback_settings_project_id_unique IS 'Ensures project_id uniqueness across all users (excluding empty values)';