-- NoteX AI Insights System Setup
-- Run this in your Supabase SQL Editor

-- 1. Create insights table for AI-generated insights
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  category TEXT NOT NULL,
  confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 100),
  summary TEXT NOT NULL,
  key_findings JSONB,
  recommendations JSONB,
  projected_impact TEXT,
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create bookmarks table for user bookmarking
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES insights(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, insight_id) -- Prevent duplicate bookmarks
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at);
CREATE INDEX IF NOT EXISTS idx_insights_priority ON insights(priority);
CREATE INDEX IF NOT EXISTS idx_insights_category ON insights(category);
CREATE INDEX IF NOT EXISTS idx_insights_tags ON insights USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_insight_id ON bookmarks(insight_id);

-- 4. Enable Row Level Security
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for security
-- Insights: Users can only access their own insights
CREATE POLICY "insights_owner_all" ON insights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bookmarks: Users can only access their own bookmarks
CREATE POLICY "bookmarks_owner_all" ON bookmarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE insights;
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;

-- 7. Insert sample categories for consistency
INSERT INTO insights (user_id, title, priority, category, confidence, summary, key_findings, recommendations, projected_impact, source, tags) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Sample Customer Behavior Insight', 'high', 'Customer Analytics', 87.5, 'Customer engagement patterns show significant correlation with seasonal trends.', 
   '["Peak engagement during Q4 holiday season", "Mobile usage increased 23% year-over-year", "Customer retention highest among premium subscribers"]',
   '["Launch targeted Q4 marketing campaigns", "Optimize mobile experience for premium users", "Develop retention program for standard subscribers"]',
   'High - Potential 15-20% revenue increase during peak seasons', 'Customer Data Analysis', ARRAY['customer-behavior', 'seasonal-trends', 'mobile-optimization'])
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'NoteX AI Insights System setup completed successfully!' as status;