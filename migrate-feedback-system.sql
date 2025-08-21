-- Feedback System Migration Script
-- Use this script if you want to preserve existing data
-- Run this script in your Supabase SQL Editor

-- Check if feedback_settings table exists and has required columns
DO $$
BEGIN
    -- Create feedback_settings table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback_settings') THEN
        CREATE TABLE feedback_settings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            project_id TEXT,
            project_id_locked BOOLEAN DEFAULT false,
            title TEXT DEFAULT 'Share your thoughts with us',
            show_name BOOLEAN DEFAULT true,
            show_email BOOLEAN DEFAULT true,
            button_text TEXT DEFAULT 'Send Feedback',
            redirect_url TEXT,
            theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
            brand_color TEXT DEFAULT '#2563eb',
            notify_email TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    ELSE
        -- Add missing columns if table exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'project_id') THEN
            ALTER TABLE feedback_settings ADD COLUMN project_id TEXT UNIQUE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'project_id_locked') THEN
            ALTER TABLE feedback_settings ADD COLUMN project_id_locked BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'title') THEN
            ALTER TABLE feedback_settings ADD COLUMN title TEXT DEFAULT 'Share your thoughts with us';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'show_name') THEN
            ALTER TABLE feedback_settings ADD COLUMN show_name BOOLEAN DEFAULT true;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'show_email') THEN
            ALTER TABLE feedback_settings ADD COLUMN show_email BOOLEAN DEFAULT true;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'button_text') THEN
            ALTER TABLE feedback_settings ADD COLUMN button_text TEXT DEFAULT 'Send Feedback';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'redirect_url') THEN
            ALTER TABLE feedback_settings ADD COLUMN redirect_url TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'theme') THEN
            ALTER TABLE feedback_settings ADD COLUMN theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark'));
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'brand_color') THEN
            ALTER TABLE feedback_settings ADD COLUMN brand_color TEXT DEFAULT '#2563eb';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'notify_email') THEN
            ALTER TABLE feedback_settings ADD COLUMN notify_email TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'created_at') THEN
            ALTER TABLE feedback_settings ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedback_settings' AND column_name = 'updated_at') THEN
            ALTER TABLE feedback_settings ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Add constraints for project_id if they don't exist
DO $$
BEGIN
    -- Add constraint to ensure project_id is not empty when locked
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'feedback_settings_project_id_locked_check'
    ) THEN
        ALTER TABLE feedback_settings ADD CONSTRAINT feedback_settings_project_id_locked_check 
        CHECK (NOT project_id_locked OR (project_id IS NOT NULL AND project_id != ''));
    END IF;
    
    -- Create unique index on project_id that excludes empty values
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_feedback_settings_project_id_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_feedback_settings_project_id_unique 
        ON feedback_settings (project_id) 
        WHERE project_id IS NOT NULL AND project_id != '';
    END IF;
END $$;

-- Check if feedbacks table exists and has required columns
DO $$
BEGIN
    -- Create feedbacks table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedbacks') THEN
        CREATE TABLE feedbacks (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            project_id TEXT REFERENCES feedback_settings(project_id) ON DELETE CASCADE,
            name TEXT,
            email TEXT,
            message TEXT NOT NULL,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved'))
        );
    ELSE
        -- Add missing columns if table exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'project_id') THEN
            ALTER TABLE feedbacks ADD COLUMN project_id TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'name') THEN
            ALTER TABLE feedbacks ADD COLUMN name TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'email') THEN
            ALTER TABLE feedbacks ADD COLUMN email TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'message') THEN
            ALTER TABLE feedbacks ADD COLUMN message TEXT NOT NULL DEFAULT '';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'timestamp') THEN
            ALTER TABLE feedbacks ADD COLUMN timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'status') THEN
            ALTER TABLE feedbacks ADD COLUMN status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved'));
        END IF;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'feedbacks_project_id_fkey'
    ) THEN
        ALTER TABLE feedbacks ADD CONSTRAINT feedbacks_project_id_fkey 
        FOREIGN KEY (project_id) REFERENCES feedback_settings(project_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON feedback_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_settings_project_id ON feedback_settings(project_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id ON feedbacks(project_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_timestamp ON feedbacks(timestamp);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);

-- Enable Row Level Security
ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own feedback settings" ON feedback_settings;
DROP POLICY IF EXISTS "Users can insert their own feedback settings" ON feedback_settings;
DROP POLICY IF EXISTS "Users can update their own feedback settings" ON feedback_settings;
DROP POLICY IF EXISTS "Users can view feedbacks for their projects" ON feedbacks;
DROP POLICY IF EXISTS "Anyone can insert feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can update feedbacks for their projects" ON feedbacks;

-- Create RLS policies for feedback_settings
CREATE POLICY "Users can view their own feedback settings" ON feedback_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback settings" ON feedback_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback settings" ON feedback_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for feedbacks
CREATE POLICY "Users can view feedbacks for their projects" ON feedbacks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feedback_settings 
      WHERE feedback_settings.project_id = feedbacks.project_id 
      AND feedback_settings.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert feedbacks" ON feedbacks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update feedbacks for their projects" ON feedbacks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM feedback_settings 
      WHERE feedback_settings.project_id = feedbacks.project_id 
      AND feedback_settings.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_feedback_settings_updated_at ON feedback_settings;
CREATE TRIGGER update_feedback_settings_updated_at BEFORE UPDATE ON feedback_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Verify tables were created correctly
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('feedback_settings', 'feedbacks')
ORDER BY table_name, ordinal_position;