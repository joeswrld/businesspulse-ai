-- Create analytics_history table
CREATE TABLE IF NOT EXISTS analytics_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analytics_data JSONB NOT NULL,
  analysis_type TEXT NOT NULL DEFAULT 'comprehensive',
  time_range TEXT NOT NULL DEFAULT 'all',
  insights_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_history_user_id ON analytics_history(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_history_created_at ON analytics_history(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_history_analysis_type ON analytics_history(analysis_type);

-- Enable Row Level Security
ALTER TABLE analytics_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own analytics history" ON analytics_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics history" ON analytics_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics history" ON analytics_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analytics history" ON analytics_history
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_analytics_history_updated_at
  BEFORE UPDATE ON analytics_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();