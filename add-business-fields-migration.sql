-- Add business name and logo fields to feedback_settings table
-- This migration adds business branding fields to the feedback_settings table

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