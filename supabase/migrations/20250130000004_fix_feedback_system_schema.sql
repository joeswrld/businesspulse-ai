-- ============================================================================
-- FIX FEEDBACK SYSTEM SCHEMA
-- Fix projects table and create proper feedback_settings table
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 1: FIX PROJECTS TABLE
-- ============================================================================

-- First, let's check if we need to migrate existing data
DO $$
DECLARE
    has_project_id_column boolean;
    has_logo_url_column boolean;
BEGIN
    -- Check if project_id column exists (old schema)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'project_id' 
        AND table_schema = 'public'
    ) INTO has_project_id_column;
    
    -- Check if logo_url column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'logo_url' 
        AND table_schema = 'public'
    ) INTO has_logo_url_column;
    
    -- If old schema exists, we need to migrate
    IF has_project_id_column THEN
        RAISE NOTICE 'Old projects schema detected, migrating data...';
        
        -- Add logo_url column if it doesn't exist
        IF NOT has_logo_url_column THEN
            ALTER TABLE public.projects ADD COLUMN logo_url text;
        END IF;
        
        -- The id column should already be UUID with gen_random_uuid() default
        -- Just ensure it's properly set
        ALTER TABLE public.projects ALTER COLUMN id SET DEFAULT gen_random_uuid();
        
        RAISE NOTICE 'Projects table migration completed';
    ELSE
        RAISE NOTICE 'Projects table already has correct schema';
    END IF;
END $$;

-- Ensure projects table has the correct structure
DO $$
BEGIN
    -- Add logo_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'logo_url' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN logo_url text;
    END IF;
    
    -- Ensure id column has proper default
    ALTER TABLE public.projects ALTER COLUMN id SET DEFAULT gen_random_uuid();
    
    -- Ensure name column is NOT NULL
    ALTER TABLE public.projects ALTER COLUMN name SET NOT NULL;
    
    -- Ensure user_id column is NOT NULL
    ALTER TABLE public.projects ALTER COLUMN user_id SET NOT NULL;
END $$;

-- ============================================================================
-- PART 2: CREATE FEEDBACK_SETTINGS TABLE
-- ============================================================================

-- Drop existing feedback_settings table if it exists (to start fresh)
DROP TABLE IF EXISTS public.feedback_settings CASCADE;

-- Create the feedback_settings table with proper structure
CREATE TABLE public.feedback_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  widget_title text NOT NULL DEFAULT 'We love your feedback!',
  widget_color text NOT NULL DEFAULT '#3B82F6',
  greeting_text text NOT NULL DEFAULT 'Help us improve by sharing your thoughts',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT feedback_settings_widget_title_check CHECK (widget_title IS NOT NULL AND TRIM(widget_title) <> ''),
  CONSTRAINT feedback_settings_greeting_text_check CHECK (greeting_text IS NOT NULL AND TRIM(greeting_text) <> ''),
  CONSTRAINT feedback_settings_color_format_check CHECK (widget_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT feedback_settings_project_user_unique UNIQUE (project_id, user_id)
);

-- ============================================================================
-- PART 3: CREATE FEEDBACK TABLE (if not exists)
-- ============================================================================

-- Create feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  form_type text NOT NULL CHECK (form_type IN ('customer_satisfaction', 'product_feedback')),
  message text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 5: CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

DROP POLICY IF EXISTS "Users can view own settings" ON public.feedback_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.feedback_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.feedback_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON public.feedback_settings;

DROP POLICY IF EXISTS "Users can view own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can delete own feedback" ON public.feedback;

-- Projects policies
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (user_id = auth.uid());

-- Feedback settings policies
CREATE POLICY "Users can view own feedback settings" ON public.feedback_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own feedback settings" ON public.feedback_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own feedback settings" ON public.feedback_settings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own feedback settings" ON public.feedback_settings
  FOR DELETE USING (user_id = auth.uid());

-- Feedback policies (project owners can see their feedback, anyone can insert)
CREATE POLICY "Users can view own project feedback" ON public.feedback
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own project feedback" ON public.feedback
  FOR UPDATE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own project feedback" ON public.feedback
  FOR DELETE USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- ============================================================================
-- PART 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- Feedback settings indexes
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON public.feedback_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_id ON public.feedback_settings(project_id);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON public.feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_form_type ON public.feedback(form_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- ============================================================================
-- PART 7: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to create a project with default feedback settings
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
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Project name is required';
  END IF;
  
  -- Create the project
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

-- Function to get user's projects with settings
CREATE OR REPLACE FUNCTION public.get_user_projects_with_settings(p_user_id uuid)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  project_logo_url text,
  project_created_at timestamptz,
  settings_id uuid,
  widget_title text,
  widget_color text,
  greeting_text text,
  settings_updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as project_id,
    p.name as project_name,
    p.logo_url as project_logo_url,
    p.created_at as project_created_at,
    fs.id as settings_id,
    fs.widget_title,
    fs.widget_color,
    fs.greeting_text,
    fs.updated_at as settings_updated_at
  FROM public.projects p
  LEFT JOIN public.feedback_settings fs ON p.id = fs.project_id AND fs.user_id = p.user_id
  WHERE p.user_id = p_user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_project_with_settings(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_projects_with_settings(uuid) TO authenticated;

-- ============================================================================
-- PART 8: CREATE STORAGE BUCKET FOR PROJECT LOGOS
-- ============================================================================

-- Create storage bucket for project logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-logos', 'project-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for project logos
CREATE POLICY "Users can upload their own project logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own project logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own project logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Project logos are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-logos');

-- ============================================================================
-- PART 9: VERIFICATION
-- ============================================================================

-- Verify table structure
SELECT 
  schemaname, 
  tablename, 
  rowsecurity,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'feedback_settings', 'feedback')
ORDER BY tablename;

-- Verify RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'feedback_settings', 'feedback')
ORDER BY tablename, policyname;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Feedback system schema fixed successfully!' AS status;