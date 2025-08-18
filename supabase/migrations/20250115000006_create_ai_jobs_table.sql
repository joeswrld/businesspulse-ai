-- Create ai_jobs table for tracking AI processing jobs
CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('insight_generation', 'report_generation', 'data_processing', 'sentiment_analysis', 'theme_extraction')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id ON ai_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_data_source_id ON ai_jobs(data_source_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_job_type ON ai_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at ON ai_jobs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_jobs
CREATE POLICY "Users can view their own ai jobs" ON ai_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ai jobs" ON ai_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai jobs" ON ai_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai jobs" ON ai_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_jobs_updated_at
  BEFORE UPDATE ON ai_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for ai_jobs table
ALTER TABLE ai_jobs REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE ai_jobs;