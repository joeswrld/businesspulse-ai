-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create usage_counters table
CREATE TABLE IF NOT EXISTS usage_counters (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_count INT DEFAULT 0,
  insights_count INT DEFAULT 0,
  analytics_count INT DEFAULT 0,
  reports_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plans table for plan definitions
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  limits JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans with limits
INSERT INTO plans (code, name, limits) VALUES
  ('free', 'Free Trial', '{"feedback": 50, "insights": 5, "analytics": 5, "reports": 2}'),
  ('pro', 'Pro Plan', '{"feedback": 300, "insights": 50, "analytics": 100, "reports": 20}'),
  ('business', 'Business Plan', '{"feedback": -1, "insights": -1, "analytics": -1, "reports": -1}')
ON CONFLICT (code) DO UPDATE SET
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- Create function to refresh counters from source tables
CREATE OR REPLACE FUNCTION refresh_usage_for_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE usage_counters
  SET feedback_count = (
        SELECT COUNT(*) 
        FROM feedbacks f 
        JOIN feedback_settings fs ON f.project_id = fs.project_id 
        WHERE fs.user_id = p_user_id
      ),
      insights_count = (
        SELECT COUNT(*) 
        FROM ai_insights i 
        WHERE i.user_id = p_user_id
      ),
      analytics_count = (
        SELECT COUNT(*) 
        FROM analytics_history a 
        WHERE a.user_id = p_user_id
      ),
      reports_count = (
        SELECT COUNT(*) 
        FROM reports r 
        WHERE r.user_id = p_user_id
      ),
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO usage_counters (user_id, feedback_count, insights_count, analytics_count, reports_count)
    VALUES (
      p_user_id,
      (SELECT COUNT(*) FROM feedbacks f 
       JOIN feedback_settings fs ON f.project_id = fs.project_id 
       WHERE fs.user_id = p_user_id),
      (SELECT COUNT(*) FROM ai_insights i WHERE i.user_id = p_user_id),
      (SELECT COUNT(*) FROM analytics_history a WHERE a.user_id = p_user_id),
      (SELECT COUNT(*) FROM reports r WHERE r.user_id = p_user_id)
    );
  END IF;
END;
$$;

-- Create function to check and enforce usage limits
CREATE OR REPLACE FUNCTION check_and_consume_usage(p_user_id UUID, p_kind TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan_code TEXT;
  plan_limits JSONB;
  used_val INT;
  limit_val INT;
BEGIN
  -- Get user's current plan
  SELECT s.plan_code, p.limits
  INTO plan_code, plan_limits
  FROM user_subscriptions s
  JOIN plans p ON p.code = s.plan_code
  WHERE s.user_id = p_user_id AND s.status = 'active'
  ORDER BY s.updated_at DESC LIMIT 1;

  -- If no active subscription found, use free plan
  IF plan_code IS NULL THEN
    SELECT limits INTO plan_limits FROM plans WHERE code = 'free';
    plan_code := 'free';
  END IF;

  -- Refresh usage counters
  PERFORM refresh_usage_for_user(p_user_id);

  -- Check limits
  IF p_kind = 'feedback' THEN
    SELECT feedback_count INTO used_val FROM usage_counters WHERE user_id = p_user_id;
    limit_val := (plan_limits->>'feedback')::INT;
    RETURN (limit_val = -1 OR used_val < limit_val);

  ELSIF p_kind = 'insights' THEN
    SELECT insights_count INTO used_val FROM usage_counters WHERE user_id = p_user_id;
    limit_val := (plan_limits->>'insights')::INT;
    RETURN (limit_val = -1 OR used_val < limit_val);

  ELSIF p_kind = 'analytics' THEN
    SELECT analytics_count INTO used_val FROM usage_counters WHERE user_id = p_user_id;
    limit_val := (plan_limits->>'analytics')::INT;
    RETURN (limit_val = -1 OR used_val < limit_val);

  ELSIF p_kind = 'reports' THEN
    SELECT reports_count INTO used_val FROM usage_counters WHERE user_id = p_user_id;
    limit_val := (plan_limits->>'reports')::INT;
    RETURN (limit_val = -1 OR used_val < limit_val);

  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Create function to get usage summary
CREATE OR REPLACE FUNCTION get_user_usage_summary(p_user_id UUID)
RETURNS TABLE (
  plan_code TEXT,
  plan_name TEXT,
  feedback_count INT,
  insights_count INT,
  analytics_count INT,
  reports_count INT,
  feedback_limit INT,
  insights_limit INT,
  analytics_limit INT,
  reports_limit INT,
  feedback_remaining INT,
  insights_remaining INT,
  analytics_remaining INT,
  reports_remaining INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_plan_code TEXT;
  user_plan_limits JSONB;
BEGIN
  -- Get user's current plan
  SELECT s.plan_code, p.limits
  INTO user_plan_code, user_plan_limits
  FROM user_subscriptions s
  JOIN plans p ON p.code = s.plan_code
  WHERE s.user_id = p_user_id AND s.status = 'active'
  ORDER BY s.updated_at DESC LIMIT 1;

  -- If no active subscription found, use free plan
  IF user_plan_code IS NULL THEN
    SELECT code, limits INTO user_plan_code, user_plan_limits FROM plans WHERE code = 'free';
  END IF;

  -- Refresh usage counters
  PERFORM refresh_usage_for_user(p_user_id);

  -- Return usage summary
  RETURN QUERY
  SELECT 
    user_plan_code,
    p.name,
    uc.feedback_count,
    uc.insights_count,
    uc.analytics_count,
    uc.reports_count,
    (user_plan_limits->>'feedback')::INT,
    (user_plan_limits->>'insights')::INT,
    (user_plan_limits->>'analytics')::INT,
    (user_plan_limits->>'reports')::INT,
    CASE 
      WHEN (user_plan_limits->>'feedback')::INT = -1 THEN -1
      ELSE GREATEST(0, (user_plan_limits->>'feedback')::INT - uc.feedback_count)
    END,
    CASE 
      WHEN (user_plan_limits->>'insights')::INT = -1 THEN -1
      ELSE GREATEST(0, (user_plan_limits->>'insights')::INT - uc.insights_count)
    END,
    CASE 
      WHEN (user_plan_limits->>'analytics')::INT = -1 THEN -1
      ELSE GREATEST(0, (user_plan_limits->>'analytics')::INT - uc.analytics_count)
    END,
    CASE 
      WHEN (user_plan_limits->>'reports')::INT = -1 THEN -1
      ELSE GREATEST(0, (user_plan_limits->>'reports')::INT - uc.reports_count)
    END
  FROM usage_counters uc
  CROSS JOIN plans p
  WHERE uc.user_id = p_user_id AND p.code = user_plan_code;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id ON usage_counters(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(code);

-- RLS
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their usage"
ON usage_counters
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their usage"
ON usage_counters
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their usage"
ON usage_counters
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Everyone can read plans"
ON plans
FOR SELECT
USING (true);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_usage_counters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usage_counters_updated_at
  BEFORE UPDATE ON usage_counters
  FOR EACH ROW EXECUTE FUNCTION update_usage_counters_updated_at();

CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_plans_updated_at();

-- Insert initial usage counters for existing users
INSERT INTO usage_counters (user_id, feedback_count, insights_count, analytics_count, reports_count)
SELECT 
  u.id,
  COALESCE((SELECT COUNT(*) FROM feedbacks f 
            JOIN feedback_settings fs ON f.project_id = fs.project_id 
            WHERE fs.user_id = u.id), 0),
  COALESCE((SELECT COUNT(*) FROM ai_insights i WHERE i.user_id = u.id), 0),
  COALESCE((SELECT COUNT(*) FROM analytics_history a WHERE a.user_id = u.id), 0),
  COALESCE((SELECT COUNT(*) FROM reports r WHERE r.user_id = u.id), 0)
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- Create function to create user billing profile
CREATE OR REPLACE FUNCTION create_user_billing_profile(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if billing profile already exists
  IF EXISTS (SELECT 1 FROM billing_profiles WHERE id = user_uuid) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Billing profile already exists');
  END IF;

  -- Create billing profile with trial plan
  INSERT INTO billing_profiles (
    id, 
    plan, 
    trial_ends_at, 
    subscription_status
  ) VALUES (
    user_uuid,
    'trial',
    NOW() + INTERVAL '8 days',
    'trial'
  );

  -- Create usage counter entry
  INSERT INTO usage_counters (user_id) VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'Billing profile created successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Create whatsapp_links table for WhatsApp feedback links
CREATE TABLE IF NOT EXISTS whatsapp_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_links_project_id ON whatsapp_links(project_id);

-- Enable RLS
ALTER TABLE whatsapp_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own whatsapp links" ON whatsapp_links;
DROP POLICY IF EXISTS "Users can insert their own whatsapp links" ON whatsapp_links;
DROP POLICY IF EXISTS "Users can update their own whatsapp links" ON whatsapp_links;
DROP POLICY IF EXISTS "Users can delete their own whatsapp links" ON whatsapp_links;

-- Create RLS policies for whatsapp_links
CREATE POLICY "Users can view their own whatsapp links" ON whatsapp_links
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own whatsapp links" ON whatsapp_links
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own whatsapp links" ON whatsapp_links
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own whatsapp links" ON whatsapp_links
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );
