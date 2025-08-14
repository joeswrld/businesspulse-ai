-- NoteX AI Insights Table - Lovable Ready
-- Run this in your Supabase SQL Editor

-- 1. Create ai_insights table with the exact structure needed
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  description TEXT NOT NULL,
  key_findings TEXT[] NOT NULL DEFAULT '{}',
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  projected_impact TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  bookmarked BOOLEAN DEFAULT FALSE
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority);
CREATE INDEX IF NOT EXISTS idx_ai_insights_category ON ai_insights(category);
CREATE INDEX IF NOT EXISTS idx_ai_insights_bookmarked ON ai_insights(bookmarked);
CREATE INDEX IF NOT EXISTS idx_ai_insights_tags ON ai_insights USING GIN(tags);

-- 3. Enable Row Level Security
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for security
CREATE POLICY "ai_insights_owner_all" ON ai_insights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;

-- 6. Insert sample data for testing (optional - remove in production)
INSERT INTO ai_insights (
  user_id, 
  title, 
  category, 
  priority, 
  confidence, 
  description, 
  key_findings, 
  recommendations, 
  projected_impact, 
  tags, 
  source
) VALUES 
  (
    (SELECT id FROM auth.users LIMIT 1), -- Replace with actual user ID for testing
    'Customer Retention Analysis',
    'Customer Analytics',
    'high',
    87,
    'Analysis shows 23% of customers are at risk of churning within 30 days based on engagement patterns and support interactions.',
    ARRAY[
      'Customer engagement dropped 45% in Q4',
      'Support ticket resolution time increased by 2.3 days',
      'Product usage frequency decreased by 31%'
    ],
    ARRAY[
      'Launch proactive customer outreach program',
      'Reduce support response time by 50%',
      'Implement re-engagement email campaign'
    ],
    'High - Potential 15% revenue increase from improved retention',
    ARRAY['retention', 'churn', 'customer-success'],
    'Customer Data Analysis'
  ),
  (
    (SELECT id FROM auth.users LIMIT 1), -- Replace with actual user ID for testing
    'Revenue Growth Opportunity',
    'Revenue Analytics',
    'high',
    89,
    'Current customers show high potential for premium feature adoption based on usage patterns and feature requests.',
    ARRAY[
      '67% of users request features available in premium tier',
      'Average session time increased 40% for engaged users',
      'Premium conversion rate opportunity of 28%'
    ],
    ARRAY[
      'Create targeted upsell campaign for high-usage customers',
      'Offer limited-time premium trial',
      'Implement in-app premium feature showcases'
    ],
    'High - Potential $47,000 additional monthly recurring revenue',
    ARRAY['revenue', 'upsell', 'premium'],
    'Product Usage Analytics'
  );

-- Success message
SELECT 'NoteX AI Insights table created successfully!' as status;