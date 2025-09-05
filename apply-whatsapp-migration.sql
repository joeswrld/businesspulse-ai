-- Apply WhatsApp Links Migration
-- This script creates the whatsapp_links table and policies

-- Create whatsapp_links table for WhatsApp feedback links
CREATE TABLE IF NOT EXISTS whatsapp_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  link TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_links_project_id ON whatsapp_links(project_id);

-- Enable RLS
ALTER TABLE whatsapp_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own whatsapp links" ON whatsapp_links;
DROP POLICY IF EXISTS "Users can insert their own whatsapp links" ON whatsapp_links;
DROP POLICY IF EXISTS "Users can update their own whatsapp links" ON whatsapp_links;
DROP POLICY IF EXISTS "Users can delete their own whatsapp links" ON whatsapp_links;

-- Create RLS policies for whatsapp_links
CREATE POLICY "Users can view their own whatsapp links" ON whatsapp_links
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own whatsapp links" ON whatsapp_links
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own whatsapp links" ON whatsapp_links
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own whatsapp links" ON whatsapp_links
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM feedback_settings WHERE user_id = auth.uid()
    )
  );