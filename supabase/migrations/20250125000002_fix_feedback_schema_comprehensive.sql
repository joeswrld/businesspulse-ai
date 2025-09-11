-- ============================================================================
-- COMPREHENSIVE FEEDBACK SCHEMA FIX
-- Unified feedback table for widget, QR code, and email signature feedback
-- ============================================================================
-- 1. Create feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('widget','qr','email_signature')),
  name TEXT,
  email TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns if they don't exist
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Fix null values and enforce NOT NULL constraints
UPDATE feedback SET project_id='default' WHERE project_id IS NULL;
ALTER TABLE feedback ALTER COLUMN project_id SET NOT NULL;

UPDATE feedback SET channel='widget' WHERE channel IS NULL;
ALTER TABLE feedback ALTER COLUMN channel SET NOT NULL;

UPDATE feedback SET message='No message provided' WHERE message IS NULL;
ALTER TABLE feedback ALTER COLUMN message SET NOT NULL;

-- 4. Ensure channel CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_name = 'feedback_channel_check'
  ) THEN
    ALTER TABLE feedback ADD CONSTRAINT feedback_channel_check
    CHECK (channel IN ('widget','qr','email_signature'));
  END IF;
END $$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_channel ON feedback(channel);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_name ON feedback(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_email ON feedback(email) WHERE email IS NOT NULL;

-- 6. Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- 7. Drop old conflicting policies
DROP POLICY IF EXISTS "Allow authenticated users to read feedback" ON feedback;
DROP POLICY IF EXISTS "Allow anyone to insert feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view feedbacks for their projects" ON feedback;

-- 8. Create robust RLS policies
-- Allow authenticated users to read their project's feedback
CREATE POLICY "Users can read feedback for their projects" ON feedback
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_settings fs
      WHERE fs.project_id = feedback.project_id
        AND fs.user_id = auth.uid()
    )
  );

-- Allow anyone (anonymous included) to insert feedback
CREATE POLICY "Anyone can insert feedback" ON feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Allow authenticated users to update feedback for their projects
CREATE POLICY "Users can update feedback for their projects" ON feedback
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_settings fs
      WHERE fs.project_id = feedback.project_id
        AND fs.user_id = auth.uid()
    )
  );

-- Allow service_role full access for server-side operations
CREATE POLICY "Service role can insert feedback" ON feedback
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read all feedback" ON feedback
  FOR SELECT TO service_role
  USING (true);

-- 9. Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON feedback TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 10. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;

-- 11. Safe insert function
CREATE OR REPLACE FUNCTION insert_feedback_safe(
  p_project_id TEXT,
  p_channel TEXT,
  p_message TEXT,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  feedback_id UUID;
BEGIN
  IF p_project_id IS NULL OR p_project_id='' THEN
    RAISE EXCEPTION 'project_id is required';
  END IF;

  IF p_channel IS NULL OR p_channel='' THEN
    RAISE EXCEPTION 'channel is required';
  END IF;

  IF p_message IS NULL OR p_message='' THEN
    RAISE EXCEPTION 'message is required';
  END IF;

  IF p_channel NOT IN ('widget','qr','email_signature') THEN
    RAISE EXCEPTION 'Invalid channel';
  END IF;

  INSERT INTO feedback (project_id, channel, name, email, message)
  VALUES (p_project_id, p_channel, p_name, p_email, p_message)
  RETURNING id INTO feedback_id;

  RETURN feedback_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_feedback_safe(TEXT,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated, service_role;

-- 12. Trigger to auto-set created_at
CREATE OR REPLACE FUNCTION set_feedback_created_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_feedback_created_at ON feedback;
CREATE TRIGGER trigger_set_feedback_created_at
BEFORE INSERT ON feedback
FOR EACH ROW EXECUTE FUNCTION set_feedback_created_at();
