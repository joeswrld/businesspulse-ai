-- ============================================================================
-- FIX FEEDBACK WIDGET SYSTEM SCHEMA
-- ============================================================================
-- This migration fixes the feedback system to match the requirements:
-- 1. Drop existing feedback_settings table and recreate with correct schema
-- 2. Create feedback table for storing submissions
-- 3. Add proper RLS policies
-- 4. Create helper functions
-- ============================================================================

-- ============================================================================
-- 1. DROP EXISTING TABLES
-- ============================================================================

DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.feedback_settings CASCADE;

-- ============================================================================
-- 2. CREATE FEEDBACK_SETTINGS TABLE WITH CORRECT SCHEMA
-- ============================================================================

CREATE TABLE public.feedback_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID DEFAULT gen_random_uuid() UNIQUE,
  widget_title TEXT DEFAULT 'Share your feedback with us!',
  widget_color TEXT DEFAULT '#3B82F6',
  greeting_text TEXT DEFAULT 'We\'d love to hear from you!',
  allow_screenshots BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. CREATE FEEDBACK TABLE
-- ============================================================================

CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  page_url TEXT,
  browser TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON public.feedback_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_id ON public.feedback_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON public.feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.feedback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can select their own feedback settings" ON public.feedback_settings;
DROP POLICY IF EXISTS "Users can insert their own feedback settings" ON public.feedback_settings;
DROP POLICY IF EXISTS "Users can update their own feedback settings" ON public.feedback_settings;
DROP POLICY IF EXISTS "Users can delete their own feedback settings" ON public.feedback_settings;
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view feedback for their projects" ON public.feedback;

-- feedback_settings policies
CREATE POLICY "Users can select their own feedback settings" ON public.feedback_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback settings" ON public.feedback_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback settings" ON public.feedback_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback settings" ON public.feedback_settings
  FOR DELETE USING (auth.uid() = user_id);

-- feedback policies
CREATE POLICY "Anyone can insert feedback" ON public.feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view feedback for their projects" ON public.feedback
  FOR SELECT USING (
    project_id IN (
      SELECT fs.project_id 
      FROM public.feedback_settings fs 
      WHERE fs.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get or create feedback settings for a user
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
BEGIN
  -- Try to get existing settings
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
  
  -- If no settings exist, create them
  IF NOT FOUND THEN
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_feedback_settings_updated_at
  BEFORE UPDATE ON public.feedback_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.feedback_settings IS 'Stores user-specific feedback widget settings including widget title, color, and other customization options';
COMMENT ON TABLE public.feedback IS 'Stores feedback submissions from external websites via the widget';
COMMENT ON COLUMN public.feedback_settings.project_id IS 'Unique project identifier used in the embed script';
COMMENT ON COLUMN public.feedback.project_id IS 'References the project_id from feedback_settings';
COMMENT ON COLUMN public.feedback_settings.widget_title IS 'Title displayed in the feedback widget modal';
COMMENT ON COLUMN public.feedback_settings.widget_color IS 'Primary color for the feedback widget button and UI elements';
COMMENT ON COLUMN public.feedback_settings.greeting_text IS 'Greeting text displayed in the feedback modal';
COMMENT ON COLUMN public.feedback_settings.allow_screenshots IS 'Whether users can attach screenshots with their feedback';

-- ============================================================================
-- 9. VERIFICATION QUERIES
-- ============================================================================

-- Check if tables were created successfully
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name IN ('feedback_settings', 'feedback')
ORDER BY table_name;

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('feedback_settings', 'feedback')
ORDER BY tablename;

-- Check if policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('feedback_settings', 'feedback')
ORDER BY tablename, policyname;