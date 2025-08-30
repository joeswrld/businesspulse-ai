-- Improved project ID validation functions
-- This migration adds better validation for project ID uniqueness

-- Function to check if a project ID is available for a specific user
CREATE OR REPLACE FUNCTION check_project_id_availability(
  project_id_param TEXT, 
  current_user_id UUID
)
RETURNS TABLE(
  is_available BOOLEAN,
  taken_by_user_id UUID,
  taken_by_email TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_record RECORD;
BEGIN
  -- Check if the project ID is already used by any other user
  SELECT fs.user_id, u.email
  INTO existing_record
  FROM feedback_settings fs
  LEFT JOIN auth.users u ON fs.user_id = u.id
  WHERE fs.project_id = project_id_param
  AND fs.user_id != current_user_id
  AND fs.project_id IS NOT NULL
  AND fs.project_id != ''
  LIMIT 1;

  -- Return the result
  RETURN QUERY
  SELECT 
    CASE 
      WHEN existing_record.user_id IS NULL THEN TRUE 
      ELSE FALSE 
    END as is_available,
    existing_record.user_id as taken_by_user_id,
    existing_record.email as taken_by_email,
    CASE 
      WHEN existing_record.user_id IS NULL THEN 'Project ID is available'
      ELSE 'Project ID is already taken by another user'
    END as message;
END;
$$;

-- Function to validate project ID format and availability
CREATE OR REPLACE FUNCTION validate_project_id(
  project_id_param TEXT, 
  current_user_id UUID
)
RETURNS TABLE(
  is_valid BOOLEAN,
  is_available BOOLEAN,
  error_message TEXT,
  taken_by_user_id UUID,
  taken_by_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_result RECORD;
BEGIN
  -- Check if project ID is empty or too short
  IF project_id_param IS NULL OR project_id_param = '' THEN
    RETURN QUERY
    SELECT 
      FALSE as is_valid,
      FALSE as is_available,
      'Project ID cannot be empty' as error_message,
      NULL::UUID as taken_by_user_id,
      NULL::TEXT as taken_by_email;
    RETURN;
  END IF;

  -- Check if project ID is too short
  IF length(trim(project_id_param)) < 3 THEN
    RETURN QUERY
    SELECT 
      FALSE as is_valid,
      FALSE as is_available,
      'Project ID must be at least 3 characters long' as error_message,
      NULL::UUID as taken_by_user_id,
      NULL::TEXT as taken_by_email;
    RETURN;
  END IF;

  -- Check if project ID contains invalid characters (only alphanumeric, hyphens, and underscores allowed)
  IF project_id_param !~ '^[a-zA-Z0-9_-]+$' THEN
    RETURN QUERY
    SELECT 
      FALSE as is_valid,
      FALSE as is_available,
      'Project ID can only contain letters, numbers, hyphens, and underscores' as error_message,
      NULL::UUID as taken_by_user_id,
      NULL::TEXT as taken_by_email;
    RETURN;
  END IF;

  -- Check availability
  SELECT * INTO validation_result
  FROM check_project_id_availability(project_id_param, current_user_id);

  RETURN QUERY
  SELECT 
    TRUE as is_valid,
    validation_result.is_available,
    validation_result.message as error_message,
    validation_result.taken_by_user_id,
    validation_result.taken_by_email;
END;
$$;

-- Function to get all project IDs for debugging/admin purposes
CREATE OR REPLACE FUNCTION get_all_project_ids()
RETURNS TABLE(
  user_id UUID,
  user_email TEXT,
  project_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fs.user_id,
    u.email,
    fs.project_id,
    fs.created_at
  FROM feedback_settings fs
  LEFT JOIN auth.users u ON fs.user_id = u.id
  WHERE fs.project_id IS NOT NULL
  AND fs.project_id != ''
  ORDER BY fs.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_project_id_availability(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_project_id(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_project_ids() TO authenticated;

-- Add comments
COMMENT ON FUNCTION check_project_id_availability(TEXT, UUID) IS 'Check if a project ID is available for a specific user';
COMMENT ON FUNCTION validate_project_id(TEXT, UUID) IS 'Validate project ID format and availability';
COMMENT ON FUNCTION get_all_project_ids() IS 'Get all project IDs for debugging/admin purposes';