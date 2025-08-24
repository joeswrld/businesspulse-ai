-- Migrate Widget Position and Location
-- This script adds new fields for controlling widget positioning and location

-- Add new columns to widget_settings table
ALTER TABLE widget_settings 
ADD COLUMN IF NOT EXISTS widget_position TEXT DEFAULT 'bottom-right' CHECK (widget_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'));

ALTER TABLE widget_settings 
ADD COLUMN IF NOT EXISTS widget_location TEXT DEFAULT 'fixed' CHECK (widget_location IN ('fixed', 'inline'));

-- Update existing records with default values
UPDATE widget_settings 
SET 
  widget_position = 'bottom-right',
  widget_location = 'fixed'
WHERE widget_position IS NULL OR widget_location IS NULL;

-- Add comments to explain the new fields
COMMENT ON COLUMN widget_settings.widget_position IS 'Controls where the widget appears on the website (bottom-right, bottom-left, top-right, top-left, center)';
COMMENT ON COLUMN widget_settings.widget_location IS 'Controls how the widget is positioned (fixed for scroll-independent, inline for content-flow)';

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'widget_settings' 
  AND column_name IN ('widget_position', 'widget_location')
ORDER BY column_name;