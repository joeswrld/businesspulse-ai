-- NoteX Settings System - Lovable Ready
-- Run this in your Supabase SQL Editor

-- 1. Create widget_settings table for customization
CREATE TABLE IF NOT EXISTS widget_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_primary_color TEXT DEFAULT '#0066FF',
  brand_secondary_color TEXT DEFAULT '#007BFF',
  logo_url TEXT,
  greeting_text TEXT DEFAULT 'How can I help you today?',
  widget_position TEXT DEFAULT 'bottom-right' CHECK (widget_position IN ('bottom-right', 'bottom-left', 'top-right', 'top-left')),
  widget_size TEXT DEFAULT 'medium' CHECK (widget_size IN ('small', 'medium', 'large')),
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

-- 2. Create user_preferences table for app settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  time_format TEXT DEFAULT '12h',
  notifications_email BOOLEAN DEFAULT TRUE,
  notifications_push BOOLEAN DEFAULT TRUE,
  notifications_sms BOOLEAN DEFAULT FALSE,
  email_frequency TEXT DEFAULT 'daily' CHECK (email_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  data_retention_days INTEGER DEFAULT 365,
  auto_backup BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Create feature_flags table for enabling/disabling features
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

-- 4. Create api_keys table for external integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  last_used TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create webhook_endpoints table for integrations
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_delivery TIMESTAMPTZ,
  last_delivery_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_widget_settings_user_id ON widget_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_user_id ON feature_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(feature_name);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user_id ON webhook_endpoints(user_id);

-- 7. Enable Row Level Security
ALTER TABLE widget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for security
CREATE POLICY "widget_settings_owner_all" ON widget_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_owner_all" ON user_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feature_flags_owner_all" ON feature_flags
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "api_keys_owner_all" ON api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "webhook_endpoints_owner_all" ON webhook_endpoints
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE widget_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE user_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE feature_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE api_keys;
ALTER PUBLICATION supabase_realtime ADD TABLE webhook_endpoints;

-- 10. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create triggers for updated_at
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

CREATE TRIGGER trigger_update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_webhook_endpoints_updated_at
  BEFORE UPDATE ON webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 12. Insert default widget settings for existing users
INSERT INTO widget_settings (user_id, brand_primary_color, brand_secondary_color, greeting_text)
SELECT 
  id as user_id,
  '#0066FF' as brand_primary_color,
  '#007BFF' as brand_secondary_color,
  'How can I help you today?' as greeting_text
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 13. Insert default user preferences for existing users
INSERT INTO user_preferences (user_id, theme, language, timezone)
SELECT 
  id as user_id,
  'light' as theme,
  'en' as language,
  'UTC' as timezone
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 14. Insert default feature flags for existing users
INSERT INTO feature_flags (user_id, feature_name, is_enabled) VALUES
  ((SELECT id FROM auth.users LIMIT 1), 'ai_insights', true),
  ((SELECT id FROM auth.users LIMIT 1), 'advanced_reports', true),
  ((SELECT id FROM auth.users LIMIT 1), 'custom_branding', true),
  ((SELECT id FROM auth.users LIMIT 1), 'api_access', false),
  ((SELECT id FROM auth.users LIMIT 1), 'webhook_integrations', false)
ON CONFLICT (user_id, feature_name) DO NOTHING;

-- Success message
SELECT 'NoteX Settings system created successfully!' as status;