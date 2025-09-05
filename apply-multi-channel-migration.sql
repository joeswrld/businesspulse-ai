-- Apply Multi-Channel Feedback Migration
-- This script creates the qr_links and email_links tables

-- Create qr_links table for QR code feedback links
CREATE TABLE IF NOT EXISTS qr_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_qr_links_project_id ON qr_links(project_id);

-- Enable RLS
ALTER TABLE qr_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own qr links" ON qr_links;
DROP POLICY IF EXISTS "Users can insert their own qr links" ON qr_links;
DROP POLICY IF EXISTS "Users can update their own qr links" ON qr_links;
DROP POLICY IF EXISTS "Users can delete their own qr links" ON qr_links;

-- Create RLS policies for qr_links
CREATE POLICY "Users can view their own qr links" ON qr_links
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own qr links" ON qr_links
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own qr links" ON qr_links
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own qr links" ON qr_links
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

-- Create email_links table for email signature feedback links
CREATE TABLE IF NOT EXISTS email_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_email_links_project_id ON email_links(project_id);

-- Enable RLS
ALTER TABLE email_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own email links" ON email_links;
DROP POLICY IF EXISTS "Users can insert their own email links" ON email_links;
DROP POLICY IF EXISTS "Users can update their own email links" ON email_links;
DROP POLICY IF EXISTS "Users can delete their own email links" ON email_links;

-- Create RLS policies for email_links
CREATE POLICY "Users can view their own email links" ON email_links
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own email links" ON email_links
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own email links" ON email_links
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own email links" ON email_links
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );