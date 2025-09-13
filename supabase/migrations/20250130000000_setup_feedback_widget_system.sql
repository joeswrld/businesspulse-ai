-- ============================================================================
-- COMPLETE FEEDBACK WIDGET SYSTEM SETUP
-- ============================================================================
-- This script sets up the complete feedback widget system as requested:
-- 1. feedback_settings table with proper schema
-- 2. feedback table for storing submissions
-- 3. RLS policies for security
-- 4. Proper indexes for performance
-- ============================================================================

-- ============================================================================
-- 1. CREATE FEEDBACK_SETTINGS TABLE
-- ============================================================================

-- Drop existing feedback_settings table if it exists
DROP TABLE IF EXISTS public.feedback_settings CASCADE;

CREATE TABLE public.feedback_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID DEFAULT gen_random_uuid() UNIQUE,
  widget_title TEXT DEFAULT 'Share your feedback with us!',
  widget_color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE FEEDBACK TABLE
-- ============================================================================

-- Drop existing feedback table if it exists
DROP TABLE IF EXISTS public.feedback CASCADE;

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
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for feedback_settings
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON public.feedback_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_id ON public.feedback_settings(project_id);

-- Indexes for feedback
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON public.feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.feedback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CREATE RLS POLICIES
-- ============================================================================

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
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get or create feedback settings for a user
CREATE OR REPLACE FUNCTION get_or_create_feedback_settings(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  project_id UUID,
  widget_title TEXT,
  widget_color TEXT,
  created_at TIMESTAMPTZ
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
    fs.created_at
  FROM public.feedback_settings fs
  WHERE fs.user_id = p_user_id;
  
  -- If no settings exist, create them
  IF NOT FOUND THEN
    INSERT INTO public.feedback_settings (user_id, project_id, widget_title, widget_color)
    VALUES (p_user_id, gen_random_uuid(), 'Share your feedback with us!', '#3B82F6')
    RETURNING 
      feedback_settings.id,
      feedback_settings.user_id,
      feedback_settings.project_id,
      feedback_settings.widget_title,
      feedback_settings.widget_color,
      feedback_settings.created_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.feedback_settings IS 'Stores user-specific feedback widget settings including widget title and color';
COMMENT ON TABLE public.feedback IS 'Stores feedback submissions from external websites via the widget';
COMMENT ON COLUMN public.feedback_settings.project_id IS 'Unique project identifier used in the embed script';
COMMENT ON COLUMN public.feedback.project_id IS 'References the project_id from feedback_settings';