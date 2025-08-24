-- Create widget_settings table for storing widget configuration
CREATE TABLE IF NOT EXISTS widget_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_color TEXT DEFAULT '#2563eb',
  greeting_text TEXT DEFAULT 'We''d love to hear your feedback!',
  anonymous_feedback BOOLEAN DEFAULT false,
  email_notifications BOOLEAN DEFAULT true,
  ai_auto_tagging BOOLEAN DEFAULT true,
  auto_resolve_after_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_widget_settings_user_id ON widget_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_settings_created_at ON widget_settings(created_at);

-- Create unique constraint to ensure one row per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_widget_settings_unique_user ON widget_settings(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own widget settings
CREATE POLICY "Users can view their own widget settings" ON widget_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own widget settings
CREATE POLICY "Users can insert their own widget settings" ON widget_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own widget settings
CREATE POLICY "Users can update their own widget settings" ON widget_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own widget settings
CREATE POLICY "Users can delete their own widget settings" ON widget_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_widget_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_widget_settings_updated_at
  BEFORE UPDATE ON widget_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_widget_settings_updated_at();

-- Insert default widget settings for existing users (optional)
-- This will create default settings for users who already have feedback_settings
INSERT INTO widget_settings (user_id, brand_color, greeting_text, anonymous_feedback, email_notifications, ai_auto_tagging, auto_resolve_after_reply)
SELECT 
  fs.user_id,
  COALESCE(fs.brand_color, '#2563eb'),
  'We''d love to hear your feedback!',
  false,
  true,
  true,
  false
FROM feedback_settings fs
WHERE NOT EXISTS (
  SELECT 1 FROM widget_settings ws WHERE ws.user_id = fs.user_id
)
ON CONFLICT (user_id) DO NOTHING;