-- Create ai_insights table for storing AI-generated insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('Customer Experience', 'Revenue', 'Operations', 'Growth', 'business_opportunity', 'risk_alert', 'trend_analysis', 'operational_insight', 'customer_feedback', 'performance_metric')),
  priority TEXT CHECK (priority IN ('High', 'Medium', 'Low', 'high', 'medium', 'low')),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  summary TEXT,
  key_findings TEXT[],
  recommendations TEXT[],
  projected_impact TEXT,
  tags TEXT[],
  source TEXT,
  insight_type TEXT,
  content JSONB DEFAULT '{}',
  findings TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_data_source_id ON ai_insights(data_source_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_category ON ai_insights(category);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_insights
CREATE POLICY "Users can view their own ai insights" ON ai_insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ai insights" ON ai_insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai insights" ON ai_insights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai insights" ON ai_insights
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_insights_updated_at
  BEFORE UPDATE ON ai_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for ai_insights table
ALTER TABLE ai_insights REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;