-- Fix data_sources type ENUM constraint and add insights table
-- This migration addresses the "data_sources_type_check" constraint error

-- First, let's check if the data_sources table exists and create it if not
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_size INTEGER,
  file_url TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the insights table if it doesn't exist
CREATE TABLE IF NOT EXISTS insights (
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_data_sources_user_id ON data_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);
CREATE INDEX IF NOT EXISTS idx_data_sources_status ON data_sources(status);
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_source_id ON insights(source_id);
CREATE INDEX IF NOT EXISTS idx_insights_priority ON insights(priority);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at DESC);

-- Enable Row Level Security
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for data_sources
CREATE POLICY "Users can view their own data sources" ON data_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data sources" ON data_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data sources" ON data_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own data sources" ON data_sources
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for insights
CREATE POLICY "Users can view their own insights" ON insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights" ON insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" ON insights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights" ON insights
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for both tables
ALTER TABLE data_sources REPLICA IDENTITY FULL;
ALTER TABLE insights REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE data_sources;
ALTER PUBLICATION supabase_realtime ADD TABLE insights;