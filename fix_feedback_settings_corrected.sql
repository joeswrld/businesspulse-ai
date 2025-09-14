-- Fix the get_or_create_feedback_settings function
-- This script fixes the return type mismatch issue

CREATE OR REPLACE FUNCTION get_or_create_feedback_settings(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  project_id UUID,
  widget_title TEXT,
  widget_color TEXT,
  greeting_text TEXT,
  allow_screenshots BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  settings_exists BOOLEAN := FALSE;
BEGIN
  -- Check if settings exist
  SELECT EXISTS(
    SELECT 1 FROM public.feedback_settings WHERE user_id = p_user_id
  ) INTO settings_exists;
  
  -- If settings exist, return them
  IF settings_exists THEN
    RETURN QUERY
    SELECT 
      fs.id,
      fs.user_id,
      fs.project_id,
      fs.widget_title,
      fs.widget_color,
      fs.greeting_text,
      fs.allow_screenshots,
      fs.created_at,
      fs.updated_at
    FROM public.feedback_settings fs
    WHERE fs.user_id = p_user_id;
  ELSE
    -- Create new settings and return them
    RETURN QUERY
    INSERT INTO public.feedback_settings (user_id, widget_title, widget_color, greeting_text, allow_screenshots)
    VALUES (p_user_id, 'Share your feedback with us!', '#3B82F6', 'We\'d love to hear from you!', true)
    RETURNING 
      feedback_settings.id,
      feedback_settings.user_id,
      feedback_settings.project_id,
      feedback_settings.widget_title,
      feedback_settings.widget_color,
      feedback_settings.greeting_text,
      feedback_settings.allow_screenshots,
      feedback_settings.created_at,
      feedback_settings.updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_feedback_settings(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_or_create_feedback_settings(UUID) IS 'Gets or creates feedback settings for a user. Returns existing settings if they exist, otherwise creates new ones with default values.';