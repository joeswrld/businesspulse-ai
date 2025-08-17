-- Create ai_insights table for storing AI-generated insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  findings TEXT[],
  recommendations TEXT[],
  projected_impact TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_source_id ON ai_insights(source_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority);
CREATE INDEX IF NOT EXISTS idx_ai_insights_category ON ai_insights(category);

-- Enable Row Level Security
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own insights
CREATE POLICY "Users can view their own insights" ON ai_insights
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own insights
CREATE POLICY "Users can insert their own insights" ON ai_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own insights
CREATE POLICY "Users can update their own insights" ON ai_insights
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own insights
CREATE POLICY "Users can delete their own insights" ON ai_insights
  FOR DELETE USING (auth.uid() = user_id);

-- Enable real-time subscriptions
ALTER TABLE ai_insights REPLICA IDENTITY FULL;

-- Add to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_insights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_ai_insights_updated_at
  BEFORE UPDATE ON ai_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_insights_updated_at();

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'ai_insights' AND column_name = 'updated_at') THEN
    ALTER TABLE ai_insights ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON ai_insights TO authenticated;
GRANT USAGE ON SEQUENCE ai_insights_id_seq TO authenticated;

-- Insert sample data for testing (optional)
-- INSERT INTO ai_insights (user_id, title, category, priority, confidence, findings, recommendations, projected_impact)
-- VALUES 
--   ('your-user-id-here', 'Customer Satisfaction Analysis', 'business_opportunity', 'high', 0.92, 
--    ARRAY['Customer satisfaction increased by 15%', 'Support response time improved'], 
--    ARRAY['Continue current support practices', 'Expand customer feedback collection'], 
--    'Potential 20% increase in customer retention');

SELECT 'ai_insights table created successfully with RLS policies and real-time enabled' as status;