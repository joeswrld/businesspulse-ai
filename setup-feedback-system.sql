-- Feedback System Database Setup
-- Run this script in your Supabase SQL Editor

-- Create feedback_settings table
CREATE TABLE IF NOT EXISTS feedback_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id TEXT UNIQUE NOT NULL,
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT REFERENCES feedback_settings(project_id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON feedback_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_id ON feedback_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id ON feedbacks(project_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_timestamp ON feedbacks(timestamp);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);

-- Enable Row Level Security
ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for feedback_settings
CREATE POLICY "Users can view their own feedback settings" ON feedback_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback settings" ON feedback_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback settings" ON feedback_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for feedbacks
CREATE POLICY "Users can view feedbacks for their projects" ON feedbacks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feedback_settings 
      WHERE feedback_settings.project_id = feedbacks.project_id 
      AND feedback_settings.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert feedbacks" ON feedbacks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update feedbacks for their projects" ON feedbacks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM feedback_settings 
      WHERE feedback_settings.project_id = feedbacks.project_id 
      AND feedback_settings.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_feedback_settings_updated_at BEFORE UPDATE ON feedback_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;