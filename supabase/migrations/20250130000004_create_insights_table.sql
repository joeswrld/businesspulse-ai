-- Create insights table for AI-generated insights from feedback
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_ids UUID[] NOT NULL DEFAULT '{}',
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at);
CREATE INDEX IF NOT EXISTS idx_insights_feedback_ids ON insights USING GIN(feedback_ids);

-- Enable RLS
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own insights" ON insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights" ON insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" ON insights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights" ON insights
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
ALTER TABLE insights REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE insights;

-- Add comments
COMMENT ON TABLE insights IS 'AI-generated insights from feedback analysis';
COMMENT ON COLUMN insights.feedback_ids IS 'Array of feedback IDs that were analyzed to generate this insight';
COMMENT ON COLUMN insights.summary IS 'AI-generated summary of insights from the selected feedback';