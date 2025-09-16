-- Create feedback_settings table
CREATE TABLE IF NOT EXISTS feedback_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id text UNIQUE NOT NULL,
  widget_title text DEFAULT 'Share your feedback with us!',
  widget_color text DEFAULT '#3B82F6',
  greeting_text text DEFAULT 'Welcome, tell us what''s on your mind',
  created_at timestamptz DEFAULT now()
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL REFERENCES feedback_settings(project_id) ON DELETE CASCADE,
  email text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policy for feedback_settings - users can only access their own settings
CREATE POLICY "Users can view their own feedback settings" ON feedback_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback settings" ON feedback_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback settings" ON feedback_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback settings" ON feedback_settings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policy for feedback - users can only access feedback for their project_id
CREATE POLICY "Users can view feedback for their project" ON feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feedback_settings 
      WHERE feedback_settings.project_id = feedback.project_id 
      AND feedback_settings.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON feedback_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_id ON feedback_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

-- Function to generate unique project_id
CREATE OR REPLACE FUNCTION generate_project_id()
RETURNS text AS $$
DECLARE
  new_id text;
  exists boolean;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric string
    new_id := substring(md5(random()::text) from 1 for 8);
    
    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM feedback_settings WHERE project_id = new_id) INTO exists;
    
    -- If it doesn't exist, return it
    IF NOT exists THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create feedback settings for a user
CREATE OR REPLACE FUNCTION get_or_create_feedback_settings(p_user_id uuid)
RETURNS feedback_settings AS $$
DECLARE
  settings feedback_settings;
  new_project_id text;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings 
  FROM feedback_settings 
  WHERE user_id = p_user_id 
  LIMIT 1;
  
  -- If no settings exist, create them
  IF NOT FOUND THEN
    new_project_id := generate_project_id();
    
    INSERT INTO feedback_settings (user_id, project_id)
    VALUES (p_user_id, new_project_id)
    RETURNING * INTO settings;
  END IF;
  
  RETURN settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;