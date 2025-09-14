-- ============================================================================
-- COMPLETE FIX FOR FEEDBACK SETTINGS SYSTEM
-- ============================================================================
-- This script ensures the feedback_settings table has the correct schema
-- and the get_or_create_feedback_settings function works properly
-- ============================================================================

-- ============================================================================
-- 1. ENSURE CORRECT TABLE SCHEMA
-- ============================================================================

-- First, let's check if the table exists and what columns it has
-- If the table exists but has the wrong schema, we'll need to alter it

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add greeting_text column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_settings' 
    AND column_name = 'greeting_text'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.feedback_settings 
    ADD COLUMN greeting_text TEXT DEFAULT 'We''d love to hear from you!';
  END IF;

  -- Add allow_screenshots column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_settings' 
    AND column_name = 'allow_screenshots'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.feedback_settings 
    ADD COLUMN allow_screenshots BOOLEAN DEFAULT true;
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_settings' 
    AND column_name = 'updated_at'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.feedback_settings 
    ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Ensure project_id is UUID type if it's not
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback_settings' 
    AND column_name = 'project_id'
    AND data_type = 'text'
    AND table_schema = 'public'
  ) THEN
    -- Convert text project_id to UUID
    ALTER TABLE public.feedback_settings 
    ALTER COLUMN project_id TYPE UUID USING project_id::UUID;
  END IF;
END $$;

-- ============================================================================
-- 2. CREATE OR REPLACE THE FUNCTION
-- ============================================================================

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
      COALESCE(fs.greeting_text, 'We''d love to hear from you!') as greeting_text,
      COALESCE(fs.allow_screenshots, true) as allow_screenshots,
      fs.created_at,
      COALESCE(fs.updated_at, fs.created_at) as updated_at
    FROM public.feedback_settings fs
    WHERE fs.user_id = p_user_id;
  ELSE
    -- Create new settings and return them
    RETURN QUERY
    INSERT INTO public.feedback_settings (user_id, widget_title, widget_color, greeting_text, allow_screenshots)
    VALUES (p_user_id, 'Share your feedback with us!', '#3B82F6', 'We''d love to hear from you!', true)
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

-- ============================================================================
-- 3. GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_feedback_settings(UUID) TO authenticated;

-- ============================================================================
-- 4. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_feedback_settings_updated_at ON public.feedback_settings;

-- Create the trigger
CREATE TRIGGER update_feedback_settings_updated_at
  BEFORE UPDATE ON public.feedback_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. ENSURE RLS POLICIES EXIST
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can select their own feedback settings" ON public.feedback_settings;
DROP POLICY IF EXISTS "Users can insert their own feedback settings" ON public.feedback_settings;
DROP POLICY IF EXISTS "Users can update their own feedback settings" ON public.feedback_settings;
DROP POLICY IF EXISTS "Users can delete their own feedback settings" ON public.feedback_settings;

-- Create RLS policies
CREATE POLICY "Users can select their own feedback settings" ON public.feedback_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback settings" ON public.feedback_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback settings" ON public.feedback_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback settings" ON public.feedback_settings
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 6. ADD COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_or_create_feedback_settings(UUID) IS 'Gets or creates feedback settings for a user. Returns existing settings if they exist, otherwise creates new ones with default values.';

-- ============================================================================
-- 7. VERIFICATION
-- ============================================================================

-- Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'feedback_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if function exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_name = 'get_or_create_feedback_settings' 
AND routine_schema = 'public';