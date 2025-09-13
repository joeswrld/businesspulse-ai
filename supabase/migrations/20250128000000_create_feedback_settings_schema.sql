-- Create feedback_settings table with the exact schema requested
-- This table stores user-specific feedback widget settings

CREATE TABLE IF NOT EXISTS public.feedback_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT UNIQUE, -- unique per user (enforced by unique constraint)
  widget_title TEXT DEFAULT 'Share your feedback with us!',
  widget_color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON public.feedback_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_id ON public.feedback_settings(project_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.feedback_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy to allow authenticated users to select only their own rows
CREATE POLICY "Users can select their own feedback settings" ON public.feedback_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow authenticated users to insert only their own rows
CREATE POLICY "Users can insert their own feedback settings" ON public.feedback_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow authenticated users to update only their own rows
CREATE POLICY "Users can update their own feedback settings" ON public.feedback_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow authenticated users to delete only their own rows
CREATE POLICY "Users can delete their own feedback settings" ON public.feedback_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE public.feedback_settings IS 'Stores user-specific feedback widget settings including widget title and color';