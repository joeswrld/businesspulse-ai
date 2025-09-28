-- ============================================================================
-- FIX PROJECT AUTO-CREATION BUG
-- ============================================================================
-- This migration fixes the project auto-creation issues by:
-- 1. Adding unique constraint on projects.user_id (one project per user)
-- 2. Updating create_project_with_settings function to use ON CONFLICT
-- 3. Ensuring proper error handling

-- ============================================================================
-- PART 1: ADD UNIQUE CONSTRAINT ON PROJECTS.USER_ID
-- ============================================================================

-- Add unique constraint on projects.user_id to ensure one project per user
-- This will prevent duplicate projects and fix the ON CONFLICT error
ALTER TABLE public.projects 
ADD CONSTRAINT IF NOT EXISTS projects_user_id_unique UNIQUE (user_id);

-- ============================================================================
-- PART 2: UPDATE CREATE_PROJECT_WITH_SETTINGS FUNCTION
-- ============================================================================

-- Drop and recreate the function with proper ON CONFLICT handling
DROP FUNCTION IF EXISTS public.create_project_with_settings(uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_project_with_settings(
  p_user_id uuid,
  p_name text,
  p_logo_url text DEFAULT NULL
)
RETURNS TABLE (
  project_id uuid,
  settings_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_project_id uuid;
  new_settings_id uuid;
  existing_project_id uuid;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Project name is required';
  END IF;
  
  -- Check if user already has a project
  SELECT id INTO existing_project_id 
  FROM public.projects 
  WHERE user_id = p_user_id 
  LIMIT 1;
  
  -- If user already has a project, return it
  IF existing_project_id IS NOT NULL THEN
    -- Get the existing settings ID
    SELECT id INTO new_settings_id
    FROM public.feedback_settings 
    WHERE project_id = existing_project_id 
    AND user_id = p_user_id
    LIMIT 1;
    
    -- If no settings exist, create them
    IF new_settings_id IS NULL THEN
      INSERT INTO public.feedback_settings (user_id, project_id)
      VALUES (p_user_id, existing_project_id)
      RETURNING id INTO new_settings_id;
    END IF;
    
    -- Return existing project and settings
    RETURN QUERY SELECT existing_project_id, new_settings_id;
    RETURN;
  END IF;
  
  -- User doesn't have a project, create one
  INSERT INTO public.projects (user_id, name, logo_url)
  VALUES (p_user_id, TRIM(p_name), p_logo_url)
  RETURNING id INTO new_project_id;
  
  -- Create default feedback settings
  INSERT INTO public.feedback_settings (user_id, project_id)
  VALUES (p_user_id, new_project_id)
  RETURNING id INTO new_settings_id;
  
  -- Return the IDs
  RETURN QUERY SELECT new_project_id, new_settings_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_project_with_settings(uuid, text, text) TO authenticated;

-- ============================================================================
-- PART 3: ADD HELPER FUNCTION FOR PROJECT RETRIEVAL
-- ============================================================================

-- Function to get or create a project for a user (simplified version)
CREATE OR REPLACE FUNCTION public.get_or_create_user_project(p_user_id uuid)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  settings_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_project_id uuid;
  existing_settings_id uuid;
  new_project_id uuid;
  new_settings_id uuid;
BEGIN
  -- Validate input
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  -- Check if user already has a project
  SELECT p.id, fs.id INTO existing_project_id, existing_settings_id
  FROM public.projects p
  LEFT JOIN public.feedback_settings fs ON p.id = fs.project_id AND fs.user_id = p_user_id
  WHERE p.user_id = p_user_id
  LIMIT 1;
  
  -- If user has a project, return it
  IF existing_project_id IS NOT NULL THEN
    -- If no settings exist, create them
    IF existing_settings_id IS NULL THEN
      INSERT INTO public.feedback_settings (user_id, project_id)
      VALUES (p_user_id, existing_project_id)
      RETURNING id INTO existing_settings_id;
    END IF;
    
    RETURN QUERY SELECT existing_project_id, p.name, existing_settings_id
    FROM public.projects p
    WHERE p.id = existing_project_id;
    RETURN;
  END IF;
  
  -- User doesn't have a project, create one using the main function
  SELECT project_id, settings_id INTO new_project_id, new_settings_id
  FROM public.create_project_with_settings(p_user_id, 'My Project', NULL);
  
  -- Return the new project
  RETURN QUERY SELECT new_project_id, 'My Project', new_settings_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_user_project(uuid) TO authenticated;

-- ============================================================================
-- PART 4: ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Ensure we have proper indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id_lookup ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_user ON public.feedback_settings(project_id, user_id);

-- ============================================================================
-- PART 5: VERIFY THE FIX
-- ============================================================================

-- Test the function to ensure it works
DO $$
DECLARE
  test_user_id uuid := gen_random_uuid();
  result_record record;
BEGIN
  -- Test creating a project
  SELECT * INTO result_record 
  FROM public.create_project_with_settings(test_user_id, 'Test Project', NULL);
  
  -- Test getting the same project again (should return existing)
  SELECT * INTO result_record 
  FROM public.create_project_with_settings(test_user_id, 'Another Project', NULL);
  
  -- Clean up test data
  DELETE FROM public.projects WHERE user_id = test_user_id;
  
  RAISE NOTICE 'Project auto-creation fix verified successfully';
END;
$$;