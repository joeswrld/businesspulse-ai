-- Comprehensive Feedback Schema Fix
-- This migration ensures the feedback table has all required columns and proper structure
-- for the multi-channel feedback system (widget, QR, email signature)

-- First, let's check what tables exist and their current structure
DO $$
DECLARE
    feedback_table_exists BOOLEAN;
    feedbacks_table_exists BOOLEAN;
BEGIN
    -- Check if 'feedback' table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'feedback'
    ) INTO feedback_table_exists;
    
    -- Check if 'feedbacks' table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'feedbacks'
    ) INTO feedbacks_table_exists;
    
    RAISE NOTICE 'feedback table exists: %', feedback_table_exists;
    RAISE NOTICE 'feedbacks table exists: %', feedbacks_table_exists;
END $$;

-- Create the unified feedback table if it doesn't exist
-- This will be the single source of truth for all feedback
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('widget', 'qr', 'email_signature')),
  name TEXT,
  email TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing feedback table if they don't exist
DO $$
BEGIN
    -- Add project_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'project_id') THEN
        ALTER TABLE feedback ADD COLUMN project_id TEXT;
        RAISE NOTICE 'Added project_id column to feedback table';
    END IF;
    
    -- Add channel column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'channel') THEN
        ALTER TABLE feedback ADD COLUMN channel TEXT;
        RAISE NOTICE 'Added channel column to feedback table';
    END IF;
    
    -- Add name column if it doesn't exist (rename client_name to name if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'name') THEN
        -- Check if client_name exists and rename it
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'client_name') THEN
            ALTER TABLE feedback RENAME COLUMN client_name TO name;
            RAISE NOTICE 'Renamed client_name column to name in feedback table';
        ELSE
            ALTER TABLE feedback ADD COLUMN name TEXT;
            RAISE NOTICE 'Added name column to feedback table';
        END IF;
    END IF;
    
    -- Ensure email column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'email') THEN
        ALTER TABLE feedback ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column to feedback table';
    END IF;
    
    -- Ensure message column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'message') THEN
        ALTER TABLE feedback ADD COLUMN message TEXT;
        RAISE NOTICE 'Added message column to feedback table';
    END IF;
    
    -- Ensure created_at column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'created_at') THEN
        ALTER TABLE feedback ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to feedback table';
    END IF;
END $$;

-- Add constraints to ensure data integrity
DO $$
BEGIN
    -- Add NOT NULL constraint to project_id if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'feedback' AND column_name = 'project_id' AND is_nullable = 'YES') THEN
        -- First, update any NULL values to a default
        UPDATE feedback SET project_id = 'default' WHERE project_id IS NULL;
        ALTER TABLE feedback ALTER COLUMN project_id SET NOT NULL;
        RAISE NOTICE 'Added NOT NULL constraint to project_id column';
    END IF;
    
    -- Add NOT NULL constraint to channel if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'feedback' AND column_name = 'channel' AND is_nullable = 'YES') THEN
        -- First, update any NULL values to a default
        UPDATE feedback SET channel = 'widget' WHERE channel IS NULL;
        ALTER TABLE feedback ALTER COLUMN channel SET NOT NULL;
        RAISE NOTICE 'Added NOT NULL constraint to channel column';
    END IF;
    
    -- Add NOT NULL constraint to message if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'feedback' AND column_name = 'message' AND is_nullable = 'YES') THEN
        ALTER TABLE feedback ALTER COLUMN message SET NOT NULL;
        RAISE NOTICE 'Added NOT NULL constraint to message column';
    END IF;
END $$;

-- Add CHECK constraint for channel values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'feedback_channel_check') THEN
        ALTER TABLE feedback ADD CONSTRAINT feedback_channel_check 
        CHECK (channel IN ('widget', 'qr', 'email_signature'));
        RAISE NOTICE 'Added channel CHECK constraint';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_channel ON feedback(channel);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_name ON feedback(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_email ON feedback(email) WHERE email IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to read feedback" ON feedback;
DROP POLICY IF EXISTS "Allow anyone to insert feedback" ON feedback;
DROP POLICY IF EXISTS "Allow authenticated users to update feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can view feedbacks for their projects" ON feedback;
DROP POLICY IF EXISTS "Anyone can insert feedbacks" ON feedback;
DROP POLICY IF EXISTS "Users can update feedbacks for their projects" ON feedback;

-- Create comprehensive RLS policies
-- Policy 1: Allow authenticated users to read feedback for their projects
CREATE POLICY "Users can read feedback for their projects" ON feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_settings 
      WHERE feedback_settings.project_id = feedback.project_id 
      AND feedback_settings.user_id = auth.uid()
    )
  );

-- Policy 2: Allow anyone (including anonymous users) to insert feedback
-- This is essential for public forms (widget, QR, email signature)
CREATE POLICY "Anyone can insert feedback" ON feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy 3: Allow authenticated users to update feedback for their projects
CREATE POLICY "Users can update feedback for their projects" ON feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM feedback_settings 
      WHERE feedback_settings.project_id = feedback.project_id 
      AND feedback_settings.user_id = auth.uid()
    )
  );

-- Policy 4: Allow service_role to insert feedback (for server-side operations)
CREATE POLICY "Service role can insert feedback" ON feedback
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy 5: Allow service_role to read all feedback
CREATE POLICY "Service role can read all feedback" ON feedback
  FOR SELECT
  TO service_role
  USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON feedback TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Enable realtime for the feedback table
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;

-- Create a function to safely insert feedback with proper validation
CREATE OR REPLACE FUNCTION insert_feedback_safe(
  p_project_id TEXT,
  p_channel TEXT,
  p_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_message TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  feedback_id UUID;
BEGIN
  -- Validate required parameters
  IF p_project_id IS NULL OR p_project_id = '' THEN
    RAISE EXCEPTION 'project_id is required';
  END IF;
  
  IF p_channel IS NULL OR p_channel = '' THEN
    RAISE EXCEPTION 'channel is required';
  END IF;
  
  IF p_message IS NULL OR p_message = '' THEN
    RAISE EXCEPTION 'message is required';
  END IF;
  
  -- Validate channel value
  IF p_channel NOT IN ('widget', 'qr', 'email_signature') THEN
    RAISE EXCEPTION 'Invalid channel. Must be one of: widget, qr, email_signature';
  END IF;
  
  -- Insert the feedback
  INSERT INTO feedback (project_id, channel, name, email, message)
  VALUES (p_project_id, p_channel, p_name, p_email, p_message)
  RETURNING id INTO feedback_id;
  
  RETURN feedback_id;
END;
$$;

-- Grant execute permission to all roles
GRANT EXECUTE ON FUNCTION insert_feedback_safe(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- Create a function to get feedback for a project with proper filtering
CREATE OR REPLACE FUNCTION get_feedback_for_project(p_project_id TEXT)
RETURNS TABLE (
  id UUID,
  project_id TEXT,
  channel TEXT,
  name TEXT,
  email TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has access to this project
  IF NOT EXISTS (
    SELECT 1 FROM feedback_settings 
    WHERE feedback_settings.project_id = p_project_id 
    AND feedback_settings.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to project %', p_project_id;
  END IF;
  
  -- Return feedback for the project
  RETURN QUERY
  SELECT 
    f.id,
    f.project_id,
    f.channel,
    f.name,
    f.email,
    f.message,
    f.created_at
  FROM feedback f
  WHERE f.project_id = p_project_id
  ORDER BY f.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_feedback_for_project(TEXT) TO authenticated;

-- Create a trigger to automatically set created_at if not provided
CREATE OR REPLACE FUNCTION set_feedback_created_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_feedback_created_at ON feedback;
CREATE TRIGGER trigger_set_feedback_created_at
  BEFORE INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION set_feedback_created_at();

-- Migrate data from old 'feedbacks' table if it exists
DO $$
DECLARE
    feedbacks_count INTEGER;
BEGIN
    -- Check if feedbacks table exists and has data
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedbacks') THEN
        SELECT COUNT(*) INTO feedbacks_count FROM feedbacks;
        
        IF feedbacks_count > 0 THEN
            RAISE NOTICE 'Found % records in feedbacks table, migrating to feedback table', feedbacks_count;
            
            -- Migrate data from feedbacks to feedback
            INSERT INTO feedback (project_id, channel, name, email, message, created_at)
            SELECT 
                project_id,
                'widget' as channel, -- Default channel for migrated data
                name,
                email,
                message,
                COALESCE(timestamp, NOW()) as created_at
            FROM feedbacks
            WHERE NOT EXISTS (
                SELECT 1 FROM feedback f 
                WHERE f.project_id = feedbacks.project_id 
                AND f.message = feedbacks.message 
                AND f.created_at = COALESCE(feedbacks.timestamp, NOW())
            );
            
            RAISE NOTICE 'Migration completed';
        END IF;
    END IF;
END $$;

-- Create a view for easy querying of feedback with project information
CREATE OR REPLACE VIEW feedback_with_project AS
SELECT 
  f.id,
  f.project_id,
  f.channel,
  f.name,
  f.email,
  f.message,
  f.created_at,
  fs.user_id as project_owner_id,
  fs.title as project_title,
  fs.business_name
FROM feedback f
LEFT JOIN feedback_settings fs ON f.project_id = fs.project_id;

-- Grant access to the view
GRANT SELECT ON feedback_with_project TO authenticated, service_role;

-- Add a comment to document the table structure
COMMENT ON TABLE feedback IS 'Unified feedback table for all channels (widget, QR, email signature)';
COMMENT ON COLUMN feedback.project_id IS 'Project identifier linking feedback to user settings';
COMMENT ON COLUMN feedback.channel IS 'Source channel: widget, qr, or email_signature';
COMMENT ON COLUMN feedback.name IS 'User name (optional)';
COMMENT ON COLUMN feedback.email IS 'User email (optional)';
COMMENT ON COLUMN feedback.message IS 'Feedback message (required)';

-- Final verification
DO $$
DECLARE
    table_comment TEXT;
    column_count INTEGER;
BEGIN
    -- Get table comment
    SELECT obj_description('feedback'::regclass) INTO table_comment;
    
    -- Count columns
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'feedback';
    
    RAISE NOTICE 'Feedback table setup complete. Columns: %, Comment: %', column_count, table_comment;
    
    -- List all columns
    RAISE NOTICE 'Columns in feedback table:';
    FOR column_count IN 
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'feedback' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  - %', column_count;
    END LOOP;
END $$;