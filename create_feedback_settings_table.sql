-- Create or update feedback_settings table for NoteX Feedback Settings page
-- This table stores user feedback configuration with project IDs and URLs

-- Drop existing table if it exists (be careful in production!)
DROP TABLE IF EXISTS feedback_settings CASCADE;

-- Create the new feedback_settings table
CREATE TABLE feedback_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid UNIQUE DEFAULT gen_random_uuid(),
  customer_survey_url text,
  product_feedback_url text,
  widget_code text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create RLS policies
ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own feedback settings
CREATE POLICY "Users can view own feedback settings" ON feedback_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own feedback settings
CREATE POLICY "Users can insert own feedback settings" ON feedback_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own feedback settings
CREATE POLICY "Users can update own feedback settings" ON feedback_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own feedback settings
CREATE POLICY "Users can delete own feedback settings" ON feedback_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to get or create feedback settings for a user
CREATE OR REPLACE FUNCTION get_or_create_feedback_settings(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  project_id uuid,
  customer_survey_url text,
  product_feedback_url text,
  widget_code text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_record feedback_settings%ROWTYPE;
  base_url text := 'https://notex.com.ng';
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings_record
  FROM feedback_settings
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- If no settings exist, create them
  IF NOT FOUND THEN
    INSERT INTO feedback_settings (user_id, project_id, customer_survey_url, product_feedback_url, widget_code)
    VALUES (
      p_user_id,
      gen_random_uuid(),
      base_url || '/survey/' || gen_random_uuid(),
      base_url || '/feedback/' || gen_random_uuid(),
      '<script src="' || base_url || '/widget.js" data-project-id="' || gen_random_uuid() || '"></script>'
    )
    RETURNING * INTO settings_record;
  END IF;
  
  -- Return the settings
  RETURN QUERY SELECT 
    settings_record.id,
    settings_record.user_id,
    settings_record.project_id,
    settings_record.customer_survey_url,
    settings_record.product_feedback_url,
    settings_record.widget_code,
    settings_record.created_at,
    settings_record.updated_at;
END;
$$;

-- Create function to update feedback settings
CREATE OR REPLACE FUNCTION update_feedback_settings(
  p_user_id uuid,
  p_customer_survey_url text DEFAULT NULL,
  p_product_feedback_url text DEFAULT NULL,
  p_widget_code text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  project_id uuid,
  customer_survey_url text,
  product_feedback_url text,
  widget_code text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_record feedback_settings%ROWTYPE;
  base_url text := 'https://notex.com.ng';
  project_uuid uuid;
BEGIN
  -- Get or create settings first
  SELECT * INTO settings_record
  FROM get_or_create_feedback_settings(p_user_id)
  LIMIT 1;
  
  project_uuid := settings_record.project_id;
  
  -- Update the settings
  UPDATE feedback_settings
  SET 
    customer_survey_url = COALESCE(p_customer_survey_url, customer_survey_url),
    product_feedback_url = COALESCE(p_product_feedback_url, product_feedback_url),
    widget_code = COALESCE(p_widget_code, widget_code),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO settings_record;
  
  -- Return the updated settings
  RETURN QUERY SELECT 
    settings_record.id,
    settings_record.user_id,
    settings_record.project_id,
    settings_record.customer_survey_url,
    settings_record.product_feedback_url,
    settings_record.widget_code,
    settings_record.created_at,
    settings_record.updated_at;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON feedback_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_feedback_settings(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_feedback_settings(uuid, text, text, text) TO authenticated;