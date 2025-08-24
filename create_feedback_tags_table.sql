-- Create feedback_tags table for storing tags associated with feedback
CREATE TABLE IF NOT EXISTS feedback_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_tags_feedback_id ON feedback_tags(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_tags_tag ON feedback_tags(tag);
CREATE INDEX IF NOT EXISTS idx_feedback_tags_created_at ON feedback_tags(created_at);

-- Create unique constraint to prevent duplicate tags per feedback
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_tags_unique ON feedback_tags(feedback_id, tag);

-- Enable Row Level Security (RLS)
ALTER TABLE feedback_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see tags for feedbacks in their projects
CREATE POLICY "Users can view tags for their project feedbacks" ON feedback_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feedbacks f
      JOIN feedback_settings fs ON f.project_id = fs.project_id
      WHERE f.id = feedback_tags.feedback_id
      AND fs.user_id = auth.uid()
    )
  );

-- Users can insert tags for feedbacks in their projects
CREATE POLICY "Users can insert tags for their project feedbacks" ON feedback_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM feedbacks f
      JOIN feedback_settings fs ON f.project_id = fs.project_id
      WHERE f.id = feedback_tags.feedback_id
      AND fs.user_id = auth.uid()
    )
  );

-- Users can update tags for feedbacks in their projects
CREATE POLICY "Users can update tags for their project feedbacks" ON feedback_tags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM feedbacks f
      JOIN feedback_settings fs ON f.project_id = fs.project_id
      WHERE f.id = feedback_tags.feedback_id
      AND fs.user_id = auth.uid()
    )
  );

-- Users can delete tags for feedbacks in their projects
CREATE POLICY "Users can delete tags for their project feedbacks" ON feedback_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM feedbacks f
      JOIN feedback_settings fs ON f.project_id = fs.project_id
      WHERE f.id = feedback_tags.feedback_id
      AND fs.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedback_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_feedback_tags_updated_at
  BEFORE UPDATE ON feedback_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_tags_updated_at();

-- Add some sample tags for testing (optional)
-- INSERT INTO feedback_tags (feedback_id, tag) VALUES 
--   ('existing-feedback-id-1', 'bug'),
--   ('existing-feedback-id-1', 'ui'),
--   ('existing-feedback-id-2', 'feature-request'),
--   ('existing-feedback-id-2', 'enhancement');