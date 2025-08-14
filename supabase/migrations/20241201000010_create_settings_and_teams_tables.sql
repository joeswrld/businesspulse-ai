-- NoteX Settings and Teams Tables - Lovable Ready
-- Run this in your Supabase SQL Editor

-- 1. Create widget_settings table for widget customization
CREATE TABLE IF NOT EXISTS widget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_primary_color TEXT NOT NULL DEFAULT '#0066FF',
  brand_secondary_color TEXT NOT NULL DEFAULT '#007BFF',
  logo_url TEXT,
  greeting_text TEXT NOT NULL DEFAULT 'How can I help you today?',
  widget_position TEXT NOT NULL CHECK (widget_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left')) DEFAULT 'bottom-right',
  widget_size TEXT NOT NULL CHECK (widget_size IN ('small', 'medium', 'large')) DEFAULT 'medium',
  auto_open BOOLEAN DEFAULT FALSE,
  show_avatar BOOLEAN DEFAULT TRUE,
  show_branding BOOLEAN DEFAULT TRUE,
  enable_sound BOOLEAN DEFAULT TRUE,
  enable_animations BOOLEAN DEFAULT TRUE,
  custom_css TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create user_preferences table for user settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL CHECK (theme IN ('light', 'dark', 'system')) DEFAULT 'light',
  language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
  time_format TEXT NOT NULL CHECK (time_format IN ('12h', '24h')) DEFAULT '12h',
  notifications_email BOOLEAN DEFAULT TRUE,
  notifications_push BOOLEAN DEFAULT TRUE,
  notifications_sms BOOLEAN DEFAULT FALSE,
  email_frequency TEXT NOT NULL CHECK (email_frequency IN ('immediate', 'hourly', 'daily', 'weekly')) DEFAULT 'daily',
  data_retention_days INTEGER NOT NULL DEFAULT 365,
  auto_backup BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Create feature_flags table for feature management
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_widget_settings_user_id ON widget_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_user_id ON feature_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(feature_name);

-- 5. Enable Row Level Security
ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for security
-- Widget settings: users can only see and manage their own
CREATE POLICY "widget_settings_owner_all" ON widget_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User preferences: users can only see and manage their own
CREATE POLICY "user_preferences_owner_all" ON user_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feature flags: users can only see and manage their own
CREATE POLICY "feature_flags_owner_all" ON feature_flags
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE widget_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE feature_flags;

-- 8. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create triggers for updated_at
CREATE TRIGGER trigger_update_widget_settings_updated_at
  BEFORE UPDATE ON widget_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 10. Insert default feature flags for new users
INSERT INTO feature_flags (user_id, feature_name, is_enabled) VALUES
  (auth.uid(), 'ai_insights', true),
  (auth.uid(), 'advanced_reports', false),
  (auth.uid(), 'custom_branding', false),
  (auth.uid(), 'api_access', false),
  (auth.uid(), 'webhook_integrations', false)
ON CONFLICT (user_id, feature_name) DO NOTHING;

-- Success message
SELECT 'NoteX Settings and Teams tables created successfully!' as status;