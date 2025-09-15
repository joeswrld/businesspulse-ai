-- Phase 5 Monetization Schema Updates for NoteX
-- This script adds the required fields and tables for usage-based billing

-- 1. Add plan and usage_count fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_usage_reset_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS paystack_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS paystack_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- 2. Create plan_tiers table for defining plan limits
CREATE TABLE IF NOT EXISTS plan_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  price_monthly INTEGER NOT NULL DEFAULT 0, -- Price in kobo (smallest currency unit)
  price_yearly INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'NGN',
  feedback_limit INTEGER NOT NULL DEFAULT 0, -- -1 for unlimited
  ai_insights_limit INTEGER NOT NULL DEFAULT 0, -- -1 for unlimited
  reports_limit INTEGER NOT NULL DEFAULT 0, -- -1 for unlimited
  team_members_limit INTEGER NOT NULL DEFAULT 1,
  features JSONB DEFAULT '[]'::jsonb,
  paystack_plan_code VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create usage_tracking table for detailed usage monitoring
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_type VARCHAR(50) NOT NULL, -- 'feedback', 'ai_insights', 'reports', 'team_members'
  usage_count INTEGER NOT NULL DEFAULT 0,
  month_year VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, feature_type, month_year)
);

-- 4. Create subscription_history table for tracking subscription changes
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier_id UUID REFERENCES plan_tiers(id),
  action VARCHAR(50) NOT NULL, -- 'upgrade', 'downgrade', 'cancel', 'trial_start', 'trial_end'
  previous_plan VARCHAR(50),
  new_plan VARCHAR(50),
  paystack_transaction_id VARCHAR(255),
  amount_paid INTEGER, -- Amount in kobo
  currency VARCHAR(3) DEFAULT 'NGN',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create billing_notifications table for usage alerts
CREATE TABLE IF NOT EXISTS billing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'usage_warning', 'limit_reached', 'trial_ending', 'payment_failed'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Insert default plan tiers
INSERT INTO plan_tiers (name, display_name, price_monthly, price_yearly, feedback_limit, ai_insights_limit, reports_limit, team_members_limit, features, paystack_plan_code) VALUES
('free', 'Free Trial', 0, 0, 50, 5, 2, 1, '["Basic feedback collection", "5 AI insights", "2 reports", "Email support"]'::jsonb, NULL),
('business', 'Business', 3500000, 35000000, 300, 50, 20, 5, '["Unlimited feedback", "50 AI insights/month", "20 reports/month", "Priority support", "Team collaboration", "Advanced analytics"]'::jsonb, 'PLN_4z2wpgmw41w2k7r'),
('scale', 'Scale', 5300000, 53000000, -1, -1, -1, -1, '["Unlimited everything", "Dedicated support", "Custom integrations", "API access", "Advanced team management", "Enterprise analytics"]'::jsonb, 'PLN_esryg99ztsy9xc8')
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  feedback_limit = EXCLUDED.feedback_limit,
  ai_insights_limit = EXCLUDED.ai_insights_limit,
  reports_limit = EXCLUDED.reports_limit,
  team_members_limit = EXCLUDED.team_members_limit,
  features = EXCLUDED.features,
  paystack_plan_code = EXCLUDED.paystack_plan_code,
  updated_at = CURRENT_TIMESTAMP;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_month ON usage_tracking(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_feature ON usage_tracking(feature_type);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_user ON billing_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_notifications_unread ON billing_notifications(user_id, is_read) WHERE is_read = false;

-- 8. Create RLS policies
ALTER TABLE plan_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_notifications ENABLE ROW LEVEL SECURITY;

-- Plan tiers are readable by everyone
CREATE POLICY "Plan tiers are viewable by everyone" ON plan_tiers FOR SELECT USING (true);

-- Users can only see their own usage tracking
CREATE POLICY "Users can view own usage tracking" ON usage_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage tracking" ON usage_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage tracking" ON usage_tracking FOR UPDATE USING (auth.uid() = user_id);

-- Users can only see their own subscription history
CREATE POLICY "Users can view own subscription history" ON subscription_history FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own billing notifications
CREATE POLICY "Users can view own billing notifications" ON billing_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own billing notifications" ON billing_notifications FOR UPDATE USING (auth.uid() = user_id);

-- 9. Create function to get user's current plan limits
CREATE OR REPLACE FUNCTION get_user_plan_limits(user_uuid UUID)
RETURNS TABLE (
  plan_name VARCHAR(50),
  feedback_limit INTEGER,
  ai_insights_limit INTEGER,
  reports_limit INTEGER,
  team_members_limit INTEGER,
  features JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.name,
    pt.feedback_limit,
    pt.ai_insights_limit,
    pt.reports_limit,
    pt.team_members_limit,
    pt.features
  FROM profiles p
  JOIN plan_tiers pt ON p.plan = pt.name
  WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to get user's current usage
CREATE OR REPLACE FUNCTION get_user_current_usage(user_uuid UUID)
RETURNS TABLE (
  feature_type VARCHAR(50),
  usage_count INTEGER,
  month_year VARCHAR(7)
) AS $$
DECLARE
  current_month VARCHAR(7) := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
BEGIN
  RETURN QUERY
  SELECT 
    ut.feature_type,
    ut.usage_count,
    ut.month_year
  FROM usage_tracking ut
  WHERE ut.user_id = user_uuid 
    AND ut.month_year = current_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to check if user can perform action
CREATE OR REPLACE FUNCTION can_perform_action(
  user_uuid UUID,
  feature_name VARCHAR(50),
  required_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER := 0;
  plan_limit INTEGER;
  user_plan VARCHAR(50);
BEGIN
  -- Get user's current plan
  SELECT plan INTO user_plan FROM profiles WHERE id = user_uuid;
  
  -- Get current usage for this month
  SELECT COALESCE(usage_count, 0) INTO current_usage
  FROM usage_tracking 
  WHERE user_id = user_uuid 
    AND feature_type = feature_name 
    AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  -- Get plan limit
  SELECT 
    CASE feature_name
      WHEN 'feedback' THEN feedback_limit
      WHEN 'ai_insights' THEN ai_insights_limit
      WHEN 'reports' THEN reports_limit
      WHEN 'team_members' THEN team_members_limit
      ELSE 0
    END INTO plan_limit
  FROM plan_tiers WHERE name = user_plan;
  
  -- Check if unlimited (-1) or within limit
  RETURN plan_limit = -1 OR (current_usage + required_amount) <= plan_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  user_uuid UUID,
  feature_name VARCHAR(50,
  amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_month VARCHAR(7) := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  can_perform BOOLEAN;
BEGIN
  -- Check if user can perform this action
  SELECT can_perform_action(user_uuid, feature_name, amount) INTO can_perform;
  
  IF NOT can_perform THEN
    RETURN FALSE;
  END IF;
  
  -- Insert or update usage tracking
  INSERT INTO usage_tracking (user_id, feature_type, usage_count, month_year)
  VALUES (user_uuid, feature_name, amount, current_month)
  ON CONFLICT (user_id, feature_type, month_year)
  DO UPDATE SET 
    usage_count = usage_tracking.usage_count + amount,
    updated_at = CURRENT_TIMESTAMP;
  
  -- Update profiles usage_count
  UPDATE profiles 
  SET usage_count = usage_count + amount,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = user_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create function to reset monthly usage (for cron job)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID AS $$
DECLARE
  current_month VARCHAR(7) := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
BEGIN
  -- Reset usage_count in profiles table
  UPDATE profiles 
  SET usage_count = 0,
      monthly_usage_reset_date = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP;
  
  -- Archive current month's usage data (optional - for historical tracking)
  -- This could be moved to a separate archive table if needed
  
  RAISE NOTICE 'Monthly usage reset completed for %', current_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plan_tiers_updated_at BEFORE UPDATE ON plan_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at BEFORE UPDATE ON usage_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. Create function to send usage warning notifications
CREATE OR REPLACE FUNCTION send_usage_warning_notification(
  user_uuid UUID,
  feature_name VARCHAR(50),
  current_usage INTEGER,
  limit_amount INTEGER
)
RETURNS VOID AS $$
DECLARE
  usage_percentage INTEGER;
  notification_title VARCHAR(255);
  notification_message TEXT;
BEGIN
  -- Calculate usage percentage
  usage_percentage := (current_usage * 100) / limit_amount;
  
  -- Only send warning if usage is above 80%
  IF usage_percentage >= 80 THEN
    notification_title := 'Usage Warning: ' || INITCAP(REPLACE(feature_name, '_', ' '));
    
    notification_message := 'You have used ' || current_usage || ' of ' || limit_amount || ' ' || 
                          REPLACE(feature_name, '_', ' ') || ' this month (' || usage_percentage || '%). ' ||
                          CASE 
                            WHEN usage_percentage >= 100 THEN 'You have reached your limit. Please upgrade your plan to continue.'
                            ELSE 'Consider upgrading your plan to avoid hitting your limit.'
                          END;
    
    -- Insert notification
    INSERT INTO billing_notifications (user_id, notification_type, title, message, metadata)
    VALUES (
      user_uuid,
      'usage_warning',
      notification_title,
      notification_message,
      jsonb_build_object(
        'feature_type', feature_name,
        'current_usage', current_usage,
        'limit_amount', limit_amount,
        'usage_percentage', usage_percentage
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON plan_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON usage_tracking TO authenticated;
GRANT SELECT ON subscription_history TO authenticated;
GRANT SELECT, UPDATE ON billing_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_plan_limits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_current_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_perform_action(UUID, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage(UUID, VARCHAR, INTEGER) TO authenticated;

-- 17. Create view for user billing dashboard
CREATE OR REPLACE VIEW user_billing_dashboard AS
SELECT 
  p.id as user_id,
  p.email,
  p.plan,
  pt.display_name as plan_display_name,
  pt.price_monthly,
  pt.feedback_limit,
  pt.ai_insights_limit,
  pt.reports_limit,
  pt.team_members_limit,
  pt.features,
  COALESCE(ut_feedback.usage_count, 0) as current_feedback_usage,
  COALESCE(ut_insights.usage_count, 0) as current_ai_insights_usage,
  COALESCE(ut_reports.usage_count, 0) as current_reports_usage,
  p.subscription_status,
  p.trial_end_date,
  p.subscription_end_date,
  p.monthly_usage_reset_date
FROM profiles p
JOIN plan_tiers pt ON p.plan = pt.name
LEFT JOIN usage_tracking ut_feedback ON p.id = ut_feedback.user_id 
  AND ut_feedback.feature_type = 'feedback' 
  AND ut_feedback.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
LEFT JOIN usage_tracking ut_insights ON p.id = ut_insights.user_id 
  AND ut_insights.feature_type = 'ai_insights' 
  AND ut_insights.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
LEFT JOIN usage_tracking ut_reports ON p.id = ut_reports.user_id 
  AND ut_reports.feature_type = 'reports' 
  AND ut_reports.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- Grant access to the view
GRANT SELECT ON user_billing_dashboard TO authenticated;

-- 18. Create RLS policy for the view
CREATE POLICY "Users can view own billing dashboard" ON user_billing_dashboard FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE plan_tiers IS 'Defines the available subscription plan tiers and their limits';
COMMENT ON TABLE usage_tracking IS 'Tracks monthly usage of different features per user';
COMMENT ON TABLE subscription_history IS 'Historical record of subscription changes and payments';
COMMENT ON TABLE billing_notifications IS 'Notifications related to billing, usage, and subscription status';
COMMENT ON FUNCTION get_user_plan_limits(UUID) IS 'Returns the plan limits for a specific user';
COMMENT ON FUNCTION get_user_current_usage(UUID) IS 'Returns current month usage for a specific user';
COMMENT ON FUNCTION can_perform_action(UUID, VARCHAR, INTEGER) IS 'Checks if a user can perform a specific action based on their plan limits';
COMMENT ON FUNCTION increment_usage(UUID, VARCHAR, INTEGER) IS 'Increments usage for a specific user and feature';
COMMENT ON FUNCTION reset_monthly_usage() IS 'Resets monthly usage counters (to be run by cron job)';
COMMENT ON FUNCTION send_usage_warning_notification(UUID, VARCHAR, INTEGER, INTEGER) IS 'Sends usage warning notifications when limits are approached';