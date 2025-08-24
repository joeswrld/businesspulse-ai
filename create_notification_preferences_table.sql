-- Create notification_preferences table for storing user notification settings
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_alerts BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT true,
  system_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_created_at ON notification_preferences(created_at);

-- Create unique constraint to ensure one row per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_unique_user ON notification_preferences(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own notification preferences
CREATE POLICY "Users can view their own notification preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own notification preferences
CREATE POLICY "Users can insert their own notification preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own notification preferences
CREATE POLICY "Users can update their own notification preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notification preferences
CREATE POLICY "Users can delete their own notification preferences" ON notification_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Insert default notification preferences for existing users (optional)
-- This will create default preferences for users who already have profiles
INSERT INTO notification_preferences (user_id, feedback_alerts, weekly_reports, system_updates)
SELECT 
  p.user_id,
  true,  -- feedback_alerts
  true,  -- weekly_reports
  true   -- system_updates
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM notification_preferences np WHERE np.user_id = p.user_id
)
ON CONFLICT (user_id) DO NOTHING;