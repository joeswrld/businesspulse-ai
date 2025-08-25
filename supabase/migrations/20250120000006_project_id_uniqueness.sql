-- Add unique constraint on project_id to ensure one project ID per user
-- This migration ensures that project_id is unique across all users

-- First, let's check if there are any duplicate project_ids and clean them up
-- (This is a safety measure in case there are existing duplicates)

-- Create a temporary table to identify duplicates
CREATE TEMP TABLE duplicate_project_ids AS
SELECT project_id, COUNT(*) as count
FROM feedback_settings 
WHERE project_id IS NOT NULL AND project_id != ''
GROUP BY project_id 
HAVING COUNT(*) > 1;

-- If there are duplicates, keep only the first one for each project_id
-- and update the others to have empty project_id
UPDATE feedback_settings 
SET project_id = '', project_id_locked = false
WHERE id IN (
  SELECT fs.id 
  FROM feedback_settings fs
  INNER JOIN duplicate_project_ids dpi ON fs.project_id = dpi.project_id
  WHERE fs.id NOT IN (
    SELECT MIN(id) 
    FROM feedback_settings 
    WHERE project_id = dpi.project_id
    GROUP BY project_id
  )
);

-- Drop the temporary table
DROP TABLE duplicate_project_ids;

-- Now add the unique constraint
-- First, drop the constraint if it exists (to avoid errors)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'feedback_settings_project_id_unique'
  ) THEN
    ALTER TABLE feedback_settings DROP CONSTRAINT feedback_settings_project_id_unique;
  END IF;
END $$;

-- Add the unique constraint (excluding empty/null values)
CREATE UNIQUE INDEX feedback_settings_project_id_unique 
ON feedback_settings (project_id) 
WHERE project_id IS NOT NULL AND project_id != '';

-- Add a comment to document the constraint
COMMENT ON INDEX feedback_settings_project_id_unique IS 'Ensures project_id uniqueness across all users (excluding empty values)';