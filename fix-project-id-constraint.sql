-- Fix Project ID Constraint Migration
-- This script allows project_id to be empty initially and adds proper constraints

-- First, drop the foreign key constraint that depends on the unique constraint
ALTER TABLE feedbacks DROP CONSTRAINT IF EXISTS feedbacks_project_id_fkey;

-- Drop the existing unique constraint on project_id
ALTER TABLE feedback_settings DROP CONSTRAINT IF EXISTS feedback_settings_project_id_key;

-- Drop the old unique index if it exists
DROP INDEX IF EXISTS idx_feedback_settings_project_id_unique;

-- Create a unique index on project_id per user that excludes empty values
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_settings_project_id_user_unique 
ON feedback_settings (user_id, project_id) 
WHERE project_id IS NOT NULL AND project_id != '';

-- Add a check constraint to ensure project_id is not empty when locked
ALTER TABLE feedback_settings ADD CONSTRAINT feedback_settings_project_id_locked_check 
CHECK (NOT project_id_locked OR (project_id IS NOT NULL AND project_id != ''));

-- Note: We're not recreating the foreign key constraint because it would require
-- project_id to be globally unique, which conflicts with per-user uniqueness.
-- The feedback system will work fine without this constraint as the relationship
-- is maintained through application logic.

-- Update any existing empty project_ids to have a default value if they're locked
UPDATE feedback_settings 
SET project_id = 'project-' || id::text 
WHERE project_id_locked = true AND (project_id IS NULL OR project_id = '');