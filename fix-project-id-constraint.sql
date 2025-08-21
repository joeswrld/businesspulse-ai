-- Fix Project ID Constraint Migration
-- This script allows project_id to be empty initially and adds proper constraints

-- First, drop the existing unique constraint on project_id
ALTER TABLE feedback_settings DROP CONSTRAINT IF EXISTS feedback_settings_project_id_key;

-- Add a new unique constraint that only applies to non-empty project_ids
ALTER TABLE feedback_settings ADD CONSTRAINT feedback_settings_project_id_unique 
CHECK (project_id IS NULL OR project_id = '' OR NOT EXISTS (
  SELECT 1 FROM feedback_settings fs2 
  WHERE fs2.project_id = feedback_settings.project_id 
  AND fs2.project_id != '' 
  AND fs2.id != feedback_settings.id
));

-- Create a unique index on project_id that excludes empty values
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_settings_project_id_unique 
ON feedback_settings (project_id) 
WHERE project_id IS NOT NULL AND project_id != '';

-- Add a check constraint to ensure project_id is not empty when locked
ALTER TABLE feedback_settings ADD CONSTRAINT feedback_settings_project_id_locked_check 
CHECK (NOT project_id_locked OR (project_id IS NOT NULL AND project_id != ''));

-- Update any existing empty project_ids to have a default value if they're locked
UPDATE feedback_settings 
SET project_id = 'project-' || id::text 
WHERE project_id_locked = true AND (project_id IS NULL OR project_id = '');