-- NoteX Data Upload System Setup
-- Run this in your Supabase SQL Editor

-- 1. Create uploads table for tracking file and text uploads
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('file', 'text')),
  filename TEXT,             -- for 'file' uploads
  mime_type TEXT,            -- for 'file' uploads
  size_bytes BIGINT,         -- for 'file' uploads
  storage_path TEXT,         -- e.g. uploads/{user_id}/{uuid}/{filename}
  text_content TEXT,         -- for 'text' uploads
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 2. Create insights table for AI-generated insights
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create system_status table for monitoring
CREATE TABLE IF NOT EXISTS system_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'healthy',
  message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_upload_id ON insights(upload_id);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at);

-- 5. Enable Row Level Security
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_status ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for security
-- Uploads: Users can only access their own uploads
CREATE POLICY "uploads_owner_all" ON uploads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Insights: Users can only access their own insights
CREATE POLICY "insights_owner_all" ON insights
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- System status: Read-only for authenticated users
CREATE POLICY "system_status_read" ON system_status
  FOR SELECT USING (auth.role() = 'authenticated');

-- 7. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create triggers for updated_at
CREATE TRIGGER update_system_status_updated_at BEFORE UPDATE ON system_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Insert initial system status
INSERT INTO system_status (component, status, message) VALUES
  ('ai_processing', 'healthy', 'AI processing system operational'),
  ('data_sync', 'healthy', 'Data synchronization active'),
  ('reports', 'available', 'Report generation available')
ON CONFLICT (component) DO UPDATE SET
  status = EXCLUDED.status,
  message = EXCLUDED.message,
  updated_at = NOW();

-- 10. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE uploads;
ALTER PUBLICATION supabase_realtime ADD TABLE insights;
ALTER PUBLICATION supabase_realtime ADD TABLE system_status;

-- Success message
SELECT 'NoteX Data Upload System setup completed successfully!' as status;