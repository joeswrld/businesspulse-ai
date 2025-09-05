-- Apply business fields migration to feedback_settings table
-- This script adds business branding fields to the feedback_settings table

-- Add business_name column
ALTER TABLE feedback_settings 
ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Add business_logo column (URL to uploaded logo)
ALTER TABLE feedback_settings 
ADD COLUMN IF NOT EXISTS business_logo TEXT;

-- Add advanced form fields
ALTER TABLE feedback_settings 
ADD COLUMN IF NOT EXISTS show_rating BOOLEAN DEFAULT true;

ALTER TABLE feedback_settings 
ADD COLUMN IF NOT EXISTS show_contact_info BOOLEAN DEFAULT true;

ALTER TABLE feedback_settings 
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]';

-- Update existing records to have default business name
UPDATE feedback_settings 
SET business_name = COALESCE(title, 'Our Business')
WHERE business_name IS NULL;

-- Update existing records to have default values for new fields
UPDATE feedback_settings 
SET show_rating = true
WHERE show_rating IS NULL;

UPDATE feedback_settings 
SET show_contact_info = true
WHERE show_contact_info IS NULL;

UPDATE feedback_settings 
SET custom_fields = '[]'
WHERE custom_fields IS NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'feedback_settings' 
  AND column_name IN ('business_name', 'business_logo', 'show_rating', 'show_contact_info', 'custom_fields')
ORDER BY column_name;