-- NoteX Analytics System - Lovable Ready
-- Run this in your Supabase SQL Editor

-- 1. Create feedback table for user feedback entries
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  message TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create usage_stats table for daily/weekly/monthly counts
CREATE TABLE IF NOT EXISTS usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  insights_generated INTEGER DEFAULT 0,
  reports_created INTEGER DEFAULT 0,
  data_uploads INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  active_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, period)
);

-- 3. Create revenue_stats table for MRR, ARR, churn, expansion
CREATE TABLE IF NOT EXISTS revenue_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mrr DECIMAL(10,2) DEFAULT 0,
  arr DECIMAL(10,2) DEFAULT 0,
  churn_rate DECIMAL(5,2) DEFAULT 0,
  expansion_rate DECIMAL(5,2) DEFAULT 0,
  customer_count INTEGER DEFAULT 0,
  trial_conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 4. Create analytics_summary table for aggregated KPIs
CREATE TABLE IF NOT EXISTS analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_feedback INTEGER DEFAULT 0,
  avg_sentiment_score DECIMAL(3,2) DEFAULT 0,
  nps_score INTEGER DEFAULT 0,
  daily_active_users INTEGER DEFAULT 0,
  weekly_active_users INTEGER DEFAULT 0,
  monthly_active_users INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  growth_rate DECIMAL(5,2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_revenue_stats_user_id ON revenue_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_revenue_stats_date ON revenue_stats(date);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_user_id ON analytics_summary(user_id);

-- 6. Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for security
CREATE POLICY "feedback_owner_all" ON feedback
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usage_stats_owner_all" ON usage_stats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "revenue_stats_owner_all" ON revenue_stats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "analytics_summary_owner_all" ON analytics_summary
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE usage_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE revenue_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE analytics_summary;

-- 9. Create function to update analytics_summary
CREATE OR REPLACE FUNCTION update_analytics_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- Update analytics_summary for the user
  INSERT INTO analytics_summary (
    user_id,
    total_feedback,
    avg_sentiment_score,
    nps_score,
    daily_active_users,
    weekly_active_users,
    monthly_active_users,
    total_revenue,
    growth_rate,
    last_updated
  )
  VALUES (
    NEW.user_id,
    (SELECT COUNT(*) FROM feedback WHERE user_id = NEW.user_id),
    (SELECT COALESCE(AVG(
      CASE 
        WHEN sentiment = 'positive' THEN 1.0
        WHEN sentiment = 'neutral' THEN 0.5
        WHEN sentiment = 'negative' THEN 0.0
      END
    ), 0) FROM feedback WHERE user_id = NEW.user_id),
    (SELECT COALESCE(
      (COUNT(*) FILTER (WHERE rating >= 9) - COUNT(*) FILTER (WHERE rating <= 6)) * 100.0 / NULLIF(COUNT(*), 0),
      0
    ) FROM feedback WHERE user_id = NEW.user_id),
    (SELECT COALESCE(SUM(active_minutes), 0) FROM usage_stats WHERE user_id = NEW.user_id AND period = 'daily'),
    (SELECT COALESCE(SUM(active_minutes), 0) FROM usage_stats WHERE user_id = NEW.user_id AND period = 'weekly'),
    (SELECT COALESCE(SUM(active_minutes), 0) FROM usage_stats WHERE user_id = NEW.user_id AND period = 'monthly'),
    (SELECT COALESCE(SUM(mrr), 0) FROM revenue_stats WHERE user_id = NEW.user_id),
    (SELECT COALESCE(
      (LAG(mrr) OVER (ORDER BY date) - mrr) * 100.0 / NULLIF(LAG(mrr) OVER (ORDER BY date), 0),
      0
    ) FROM revenue_stats WHERE user_id = NEW.user_id ORDER BY date DESC LIMIT 1),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_feedback = EXCLUDED.total_feedback,
    avg_sentiment_score = EXCLUDED.avg_sentiment_score,
    nps_score = EXCLUDED.nps_score,
    daily_active_users = EXCLUDED.daily_active_users,
    weekly_active_users = EXCLUDED.weekly_active_users,
    monthly_active_users = EXCLUDED.monthly_active_users,
    total_revenue = EXCLUDED.total_revenue,
    growth_rate = EXCLUDED.growth_rate,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers to automatically update analytics_summary
CREATE TRIGGER trigger_update_analytics_summary_feedback
  AFTER INSERT OR UPDATE OR DELETE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_summary();

CREATE TRIGGER trigger_update_analytics_summary_usage
  AFTER INSERT OR UPDATE OR DELETE ON usage_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_summary();

CREATE TRIGGER trigger_update_analytics_summary_revenue
  AFTER INSERT OR UPDATE OR DELETE ON revenue_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_analytics_summary();

-- 11. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create triggers for updated_at
CREATE TRIGGER trigger_update_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 13. Insert sample data for testing (optional - remove in production)
INSERT INTO feedback (user_id, category, sentiment, rating, message, tags) VALUES
  ((SELECT id FROM auth.users LIMIT 1), 'Product', 'positive', 9, 'The AI insights are incredibly accurate and actionable!', ARRAY['ai', 'insights', 'product']),
  ((SELECT id FROM auth.users LIMIT 1), 'Support', 'positive', 10, 'Customer support team was very helpful and responsive.', ARRAY['support', 'customer-service']),
  ((SELECT id FROM auth.users LIMIT 1), 'Feature', 'neutral', 7, 'The reporting feature works well but could use more customization options.', ARRAY['reports', 'customization']);

-- Success message
SELECT 'NoteX Analytics system created successfully!' as status;