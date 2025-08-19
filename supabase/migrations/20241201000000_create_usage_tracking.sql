-- Create usage tracking tables for real-time monitoring
-- This migration sets up the infrastructure for tracking user usage across the platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'free_trial',
  plan_type TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 days'),
  trial_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_limits table
CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_name TEXT NOT NULL UNIQUE,
  ai_insights_limit INTEGER NOT NULL,
  data_sources_limit INTEGER NOT NULL,
  team_members_limit INTEGER NOT NULL,
  ai_reports_limit INTEGER NOT NULL,
  business_analytics_limit INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_usage table for real-time tracking
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ai_insights_used INTEGER NOT NULL DEFAULT 0,
  data_sources_used INTEGER NOT NULL DEFAULT 0,
  team_members_used INTEGER NOT NULL DEFAULT 1,
  ai_reports_used INTEGER NOT NULL DEFAULT 0,
  business_analytics_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

-- Create usage_events table for detailed tracking
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  usage_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default usage limits for each plan
INSERT INTO usage_limits (plan_name, ai_insights_limit, data_sources_limit, team_members_limit, ai_reports_limit, business_analytics_limit) VALUES
  ('free_trial', 20, 1, 1, 2, 1),
  ('pro', 500, 5, 5, 20, 5),
  ('business', -1, -1, -1, -1, -1) -- -1 means unlimited
ON CONFLICT (plan_name) DO UPDATE SET
  ai_insights_limit = EXCLUDED.ai_insights_limit,
  data_sources_limit = EXCLUDED.data_sources_limit,
  team_members_limit = EXCLUDED.team_members_limit,
  ai_reports_limit = EXCLUDED.ai_reports_limit,
  business_analytics_limit = EXCLUDED.business_analytics_limit,
  updated_at = NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id_date ON user_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at);

-- Create RLS policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- User subscriptions policy
CREATE POLICY "Users can view own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- User usage policy
CREATE POLICY "Users can view own usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON user_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Usage events policy
CREATE POLICY "Users can view own usage events" ON usage_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage events" ON usage_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to get current user usage
CREATE OR REPLACE FUNCTION get_user_usage(user_uuid UUID)
RETURNS TABLE (
  ai_insights_used INTEGER,
  data_sources_used INTEGER,
  team_members_used INTEGER,
  ai_reports_used INTEGER,
  business_analytics_used INTEGER,
  usage_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uu.ai_insights_used,
    uu.data_sources_used,
    uu.team_members_used,
    uu.ai_reports_used,
    uu.business_analytics_used,
    uu.usage_date
  FROM user_usage uu
  WHERE uu.user_id = user_uuid
  AND uu.usage_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  user_uuid UUID,
  resource_type TEXT,
  count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage RECORD;
  plan_limits RECORD;
  new_count INTEGER;
BEGIN
  -- Get current usage for today
  SELECT * INTO current_usage
  FROM user_usage
  WHERE user_id = user_uuid AND usage_date = CURRENT_DATE;
  
  -- If no usage record for today, create one
  IF current_usage IS NULL THEN
    INSERT INTO user_usage (user_id, usage_date, ai_insights_used, data_sources_used, team_members_used, ai_reports_used, business_analytics_used)
    VALUES (user_uuid, CURRENT_DATE, 0, 0, 1, 0, 0);
    current_usage.ai_insights_used := 0;
    current_usage.data_sources_used := 0;
    current_usage.team_members_used := 1;
    current_usage.ai_reports_used := 0;
    current_usage.business_analytics_used := 0;
  END IF;
  
  -- Get user's plan limits
  SELECT ul.* INTO plan_limits
  FROM usage_limits ul
  JOIN user_subscriptions us ON us.plan_name = ul.plan_name
  WHERE us.user_id = user_uuid
  AND us.status IN ('active', 'trialing');
  
  -- If no plan found, use free trial limits
  IF plan_limits IS NULL THEN
    SELECT * INTO plan_limits FROM usage_limits WHERE plan_name = 'free_trial';
  END IF;
  
  -- Check if increment would exceed limits (skip check for unlimited -1)
  CASE resource_type
    WHEN 'ai_insights' THEN
      IF plan_limits.ai_insights_limit != -1 AND (current_usage.ai_insights_used + count) > plan_limits.ai_insights_limit THEN
        RETURN FALSE;
      END IF;
      new_count := current_usage.ai_insights_used + count;
      UPDATE user_usage SET ai_insights_used = new_count, updated_at = NOW() WHERE user_id = user_uuid AND usage_date = CURRENT_DATE;
      
    WHEN 'data_sources' THEN
      IF plan_limits.data_sources_limit != -1 AND (current_usage.data_sources_used + count) > plan_limits.data_sources_limit THEN
        RETURN FALSE;
      END IF;
      new_count := current_usage.data_sources_used + count;
      UPDATE user_usage SET data_sources_used = new_count, updated_at = NOW() WHERE user_id = user_uuid AND usage_date = CURRENT_DATE;
      
    WHEN 'team_members' THEN
      IF plan_limits.team_members_limit != -1 AND (current_usage.team_members_used + count) > plan_limits.team_members_limit THEN
        RETURN FALSE;
      END IF;
      new_count := current_usage.team_members_used + count;
      UPDATE user_usage SET team_members_used = new_count, updated_at = NOW() WHERE user_id = user_uuid AND usage_date = CURRENT_DATE;
      
    WHEN 'ai_reports' THEN
      IF plan_limits.ai_reports_limit != -1 AND (current_usage.ai_reports_used + count) > plan_limits.ai_reports_limit THEN
        RETURN FALSE;
      END IF;
      new_count := current_usage.ai_reports_used + count;
      UPDATE user_usage SET ai_reports_used = new_count, updated_at = NOW() WHERE user_id = user_uuid AND usage_date = CURRENT_DATE;
      
    WHEN 'business_analytics' THEN
      IF plan_limits.business_analytics_limit != -1 AND (current_usage.business_analytics_used + count) > plan_limits.business_analytics_limit THEN
        RETURN FALSE;
      END IF;
      new_count := current_usage.business_analytics_used + count;
      UPDATE user_usage SET business_analytics_used = new_count, updated_at = NOW() WHERE user_id = user_uuid AND usage_date = CURRENT_DATE;
      
    ELSE
      RETURN FALSE;
  END CASE;
  
  -- Log the usage event
  INSERT INTO usage_events (user_id, event_type, resource_type, usage_count)
  VALUES (user_uuid, 'increment', resource_type, count);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can perform action
CREATE OR REPLACE FUNCTION can_perform_action(
  user_uuid UUID,
  resource_type TEXT,
  required_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage RECORD;
  plan_limits RECORD;
BEGIN
  -- Get current usage for today
  SELECT * INTO current_usage
  FROM user_usage
  WHERE user_id = user_uuid AND usage_date = CURRENT_DATE;
  
  -- If no usage record for today, user can perform action
  IF current_usage IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's plan limits
  SELECT ul.* INTO plan_limits
  FROM usage_limits ul
  JOIN user_subscriptions us ON us.plan_name = ul.plan_name
  WHERE us.user_id = user_uuid
  AND us.status IN ('active', 'trialing');
  
  -- If no plan found, use free trial limits
  IF plan_limits IS NULL THEN
    SELECT * INTO plan_limits FROM usage_limits WHERE plan_name = 'free_trial';
  END IF;
  
  -- Check if action would exceed limits
  CASE resource_type
    WHEN 'ai_insights' THEN
      RETURN plan_limits.ai_insights_limit = -1 OR (current_usage.ai_insights_used + required_count) <= plan_limits.ai_insights_limit;
    WHEN 'data_sources' THEN
      RETURN plan_limits.data_sources_limit = -1 OR (current_usage.data_sources_used + required_count) <= plan_limits.data_sources_limit;
    WHEN 'team_members' THEN
      RETURN plan_limits.team_members_limit = -1 OR (current_usage.team_members_used + required_count) <= plan_limits.team_members_limit;
    WHEN 'ai_reports' THEN
      RETURN plan_limits.ai_reports_limit = -1 OR (current_usage.ai_reports_used + required_count) <= plan_limits.ai_reports_limit;
    WHEN 'business_analytics' THEN
      RETURN plan_limits.business_analytics_limit = -1 OR (current_usage.business_analytics_used + required_count) <= plan_limits.business_analytics_limit;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_usage_updated_at
  BEFORE UPDATE ON user_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_limits_updated_at
  BEFORE UPDATE ON usage_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();