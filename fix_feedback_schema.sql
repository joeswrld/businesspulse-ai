-- Fix feedback table schema to match the user's requirements
-- Based on user description: id, project_id, email, message, created_at, sentiment, session_id, metadata

-- First, let's check if we need to add missing columns
DO $$
BEGIN
    -- Add sentiment column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'sentiment') THEN
        ALTER TABLE feedback ADD COLUMN sentiment text;
    END IF;
    
    -- Add session_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'session_id') THEN
        ALTER TABLE feedback ADD COLUMN session_id text;
    END IF;
    
    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'metadata') THEN
        ALTER TABLE feedback ADD COLUMN metadata jsonb DEFAULT '{}';
    END IF;
    
    -- Rename email to user_email if needed (check if user_email doesn't exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'user_email') THEN
        -- Check if email column exists and rename it
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'email') THEN
            ALTER TABLE feedback RENAME COLUMN email TO user_email;
        ELSE
            -- Add user_email column if neither exists
            ALTER TABLE feedback ADD COLUMN user_email text;
        END IF;
    END IF;
    
    -- Rename message to content if needed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'content') THEN
        -- Check if message column exists and rename it
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'feedback' AND column_name = 'message') THEN
            ALTER TABLE feedback RENAME COLUMN message TO content;
        ELSE
            -- Add content column if neither exists
            ALTER TABLE feedback ADD COLUMN content text;
        END IF;
    END IF;
    
    -- Remove old columns that are not needed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'feedback' AND column_name = 'page_url') THEN
        ALTER TABLE feedback DROP COLUMN page_url;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'feedback' AND column_name = 'browser') THEN
        ALTER TABLE feedback DROP COLUMN browser;
    END IF;
END $$;

-- Update the foreign key constraint to reference projects table correctly
-- First, let's check if the foreign key exists and drop it if it does
DO $$
BEGIN
    -- Drop existing foreign key if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'feedback_project_id_fkey' 
        AND table_name = 'feedback'
    ) THEN
        ALTER TABLE feedback DROP CONSTRAINT feedback_project_id_fkey;
    END IF;
    
    -- Add the correct foreign key constraint
    -- Note: This assumes projects table exists with id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        ALTER TABLE feedback 
        ADD CONSTRAINT feedback_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES projects(id);
    END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);

-- Update RLS policies for feedback table
DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON feedback;

-- Create new RLS policies
CREATE POLICY "Users can view feedback for their projects" ON feedback
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert feedback" ON feedback
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update feedback for their projects" ON feedback
    FOR UPDATE USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- Ensure RLS is enabled
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;