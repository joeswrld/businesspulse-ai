-- ============================================================================
-- FIX FEEDBACK SETTINGS SCHEMA TO MATCH HOOK EXPECTATIONS
-- Update the feedback_settings table to have the correct structure
-- ============================================================================

-- Drop existing feedback_settings table and recreate with correct schema
DROP TABLE IF EXISTS public.feedback_settings CASCADE;

-- Create the correct feedback_settings table structure
CREATE TABLE public.feedback_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid UNIQUE DEFAULT gen_random_uuid(),
  customer_survey_url text,
  product_feedback_url text,
  widget_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own feedback settings" ON public.feedback_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own feedback settings" ON public.feedback_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own feedback settings" ON public.feedback_settings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own feedback settings" ON public.feedback_settings
  FOR DELETE USING (user_id = auth.uid());

-- Create function to get or create feedback settings for a user
CREATE OR REPLACE FUNCTION get_or_create_feedback_settings(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  project_id uuid,
  customer_survey_url text,
  product_feedback_url text,
  widget_code text,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_record feedback_settings%ROWTYPE;
  base_url text := 'https://notex.com.ng';
  new_project_id uuid;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings_record
  FROM feedback_settings
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- If no settings exist, create them
  IF NOT FOUND THEN
    new_project_id := gen_random_uuid();
    
    INSERT INTO feedback_settings (user_id, project_id, customer_survey_url, product_feedback_url, widget_code)
    VALUES (
      p_user_id,
      new_project_id,
      base_url || '/survey/' || new_project_id,
      base_url || '/feedback/' || new_project_id,
      '<script src="' || base_url || '/widget.js" data-project-id="' || new_project_id || '"></script>'
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
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings_record feedback_settings%ROWTYPE;
BEGIN
  -- Get or create settings first
  SELECT * INTO settings_record
  FROM get_or_create_feedback_settings(p_user_id)
  LIMIT 1;
  
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON public.feedback_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_id ON public.feedback_settings(project_id);

SELECT 'Feedback settings schema fixed successfully!' AS status;