-- Create feedback table
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('widget', 'qr', 'email_signature')),
  name TEXT,
  email TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX idx_feedback_project_id ON feedback(project_id);
CREATE INDEX idx_feedback_channel ON feedback(channel);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read all feedback
CREATE POLICY "Allow authenticated users to read feedback" ON feedback
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policy: Allow anyone to insert feedback (for public forms)
CREATE POLICY "Allow anyone to insert feedback" ON feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policy: Allow authenticated users to update feedback (for admin actions)
CREATE POLICY "Allow authenticated users to update feedback" ON feedback
  FOR UPDATE
  TO authenticated
  USING (true);

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;