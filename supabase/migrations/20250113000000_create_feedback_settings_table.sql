-- Create feedback_settings table for NoteX platform
-- This table stores user-specific feedback widget settings

CREATE TABLE IF NOT EXISTS public.feedback_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT,
  project_id_locked BOOLEAN DEFAULT false,
  title TEXT DEFAULT 'Share your thoughts with us',
  show_name BOOLEAN DEFAULT true,
  show_email BOOLEAN DEFAULT true,
  button_text TEXT DEFAULT 'Send Feedback',
  redirect_url TEXT,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  brand_color TEXT DEFAULT '#2563eb',
  notify_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT feedback_settings_project_id_locked_check 
    CHECK (NOT project_id_locked OR (project_id IS NOT NULL AND project_id != '')),
  CONSTRAINT feedback_settings_user_id_unique UNIQUE (user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON public.feedback_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_id ON public.feedback_settings(project_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.feedback_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own feedback settings" ON public.feedback_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback settings" ON public.feedback_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback settings" ON public.feedback_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback settings" ON public.feedback_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for widget logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('widget-logos', 'widget-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for widget-logos bucket
CREATE POLICY "Users can upload their own logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'widget-logos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own logos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'widget-logos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'widget-logos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'widget-logos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add comment for documentation
COMMENT ON TABLE public.feedback_settings IS 'Stores user-specific feedback widget settings including branding, form fields, and configuration options';