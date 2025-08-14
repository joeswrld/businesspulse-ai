-- NoteX Reports System - Lovable Ready
-- Run this in your Supabase SQL Editor

-- 1. Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('PDF', 'CSV', 'XLSX')),
  status TEXT NOT NULL CHECK (status IN ('processing', 'done', 'failed')) DEFAULT 'processing',
  file_url TEXT,
  file_size BIGINT,
  processing_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create report_stats table for aggregated metrics
CREATE TABLE IF NOT EXISTS report_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_reports INTEGER DEFAULT 0,
  avg_processing_time DECIMAL(10,2) DEFAULT 0,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_report_stats_user_id ON report_stats(user_id);

-- 4. Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_stats ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for security
CREATE POLICY "reports_owner_all" ON reports
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "report_stats_owner_all" ON report_stats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
ALTER PUBLICATION supabase_realtime ADD TABLE report_stats;

-- 7. Create function to update report_stats
CREATE OR REPLACE FUNCTION update_report_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert report_stats for the user
  INSERT INTO report_stats (user_id, total_reports, avg_processing_time, last_generated_at, updated_at)
  VALUES (
    NEW.user_id,
    (SELECT COUNT(*) FROM reports WHERE user_id = NEW.user_id),
    (SELECT COALESCE(AVG(processing_time_seconds), 0) FROM reports WHERE user_id = NEW.user_id AND status = 'done'),
    CASE WHEN NEW.status = 'done' THEN NEW.updated_at ELSE (SELECT last_generated_at FROM report_stats WHERE user_id = NEW.user_id) END,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_reports = EXCLUDED.total_reports,
    avg_processing_time = EXCLUDED.avg_processing_time,
    last_generated_at = EXCLUDED.last_generated_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to automatically update report_stats
CREATE TRIGGER trigger_update_report_stats
  AFTER INSERT OR UPDATE OR DELETE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_report_stats();

-- 9. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers for updated_at
CREATE TRIGGER trigger_update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_report_stats_updated_at
  BEFORE UPDATE ON report_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Insert initial report_stats for existing users (if any)
INSERT INTO report_stats (user_id, total_reports, avg_processing_time, last_generated_at)
SELECT 
  id as user_id,
  0 as total_reports,
  0 as avg_processing_time,
  NULL as last_generated_at
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Success message
SELECT 'NoteX Reports system created successfully!' as status;