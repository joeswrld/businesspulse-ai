-- Phase 3: Session Tracking Schema Updates
-- Add session_id column to feedback table
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS session_id text;

-- Create session_records table to store session metadata
CREATE TABLE IF NOT EXISTS session_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  project_id text NOT NULL REFERENCES feedback_settings(project_id) ON DELETE CASCADE,
  user_agent text,
  url text,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer,
  events_count integer DEFAULT 0,
  storage_url text, -- URL to compressed session data in Supabase Storage
  created_at timestamptz DEFAULT now()
);

-- Create behavior_analysis table for AI-powered behavior sentiment
CREATE TABLE IF NOT EXISTS behavior_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES session_records(session_id) ON DELETE CASCADE,
  feedback_id uuid REFERENCES feedback(id) ON DELETE CASCADE,
  rage_clicks integer DEFAULT 0,
  scroll_behavior_score numeric(3,2), -- 0.00 to 1.00
  time_on_page_seconds integer,
  behavior_sentiment text CHECK (behavior_sentiment IN ('positive', 'negative', 'neutral', 'frustrated')),
  ai_analysis text, -- JSON string with detailed AI analysis
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE session_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for session_records
CREATE POLICY "Users can view session records for their project" ON session_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feedback_settings 
      WHERE feedback_settings.project_id = session_records.project_id 
      AND feedback_settings.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert session records" ON session_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update session records for their project" ON session_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM feedback_settings 
      WHERE feedback_settings.project_id = session_records.project_id 
      AND feedback_settings.user_id = auth.uid()
    )
  );

-- RLS Policies for behavior_analysis
CREATE POLICY "Users can view behavior analysis for their project" ON behavior_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feedback_settings fs
      JOIN session_records sr ON sr.project_id = fs.project_id
      WHERE sr.session_id = behavior_analysis.session_id
      AND fs.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert behavior analysis" ON behavior_analysis
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_session_id ON feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_session_records_session_id ON session_records(session_id);
CREATE INDEX IF NOT EXISTS idx_session_records_project_id ON session_records(project_id);
CREATE INDEX IF NOT EXISTS idx_behavior_analysis_session_id ON behavior_analysis(session_id);
CREATE INDEX IF NOT EXISTS idx_behavior_analysis_feedback_id ON behavior_analysis(feedback_id);

-- Function to generate session UUID
CREATE OR REPLACE FUNCTION generate_session_id()
RETURNS text AS $$
DECLARE
  new_id text;
  exists boolean;
BEGIN
  LOOP
    -- Generate a random 16-character alphanumeric string
    new_id := substring(md5(random()::text || clock_timestamp()::text) from 1 for 16);
    
    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM session_records WHERE session_id = new_id) INTO exists;
    
    -- If it doesn't exist, return it
    IF NOT exists THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create session record
CREATE OR REPLACE FUNCTION create_session_record(
  p_session_id text,
  p_project_id text,
  p_user_agent text DEFAULT NULL,
  p_url text DEFAULT NULL
)
RETURNS session_records AS $$
DECLARE
  session_record session_records;
BEGIN
  INSERT INTO session_records (session_id, project_id, user_agent, url)
  VALUES (p_session_id, p_project_id, p_user_agent, p_url)
  RETURNING * INTO session_record;
  
  RETURN session_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session record with end time and storage URL
CREATE OR REPLACE FUNCTION update_session_record(
  p_session_id text,
  p_duration_seconds integer DEFAULT NULL,
  p_events_count integer DEFAULT NULL,
  p_storage_url text DEFAULT NULL
)
RETURNS session_records AS $$
DECLARE
  session_record session_records;
BEGIN
  UPDATE session_records 
  SET 
    end_time = now(),
    duration_seconds = COALESCE(p_duration_seconds, duration_seconds),
    events_count = COALESCE(p_events_count, events_count),
    storage_url = COALESCE(p_storage_url, storage_url)
  WHERE session_id = p_session_id
  RETURNING * INTO session_record;
  
  RETURN session_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;