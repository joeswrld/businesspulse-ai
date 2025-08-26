-- Test function to check project ID uniqueness
-- This function helps verify that the uniqueness check is working correctly

CREATE OR REPLACE FUNCTION test_project_id_uniqueness(test_project_id TEXT, current_user_id UUID)
RETURNS TABLE(
  is_available BOOLEAN,
  existing_users JSONB,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the project ID is already used by any other user
  RETURN QUERY
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN TRUE 
      ELSE FALSE 
    END as is_available,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'user_id', fs.user_id,
          'project_id', fs.project_id,
          'created_at', fs.created_at
        )
      ) FILTER (WHERE fs.user_id IS NOT NULL),
      '[]'::jsonb
    ) as existing_users,
    CASE 
      WHEN COUNT(*) = 0 THEN 'Project ID is available'
      ELSE 'Project ID is already taken by ' || COUNT(*) || ' other user(s)'
    END as message
  FROM feedback_settings fs
  WHERE fs.project_id = test_project_id
  AND fs.user_id != current_user_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION test_project_id_uniqueness(TEXT, UUID) TO authenticated;

-- Add a comment
COMMENT ON FUNCTION test_project_id_uniqueness(TEXT, UUID) IS 'Test function to check project ID uniqueness across all users';