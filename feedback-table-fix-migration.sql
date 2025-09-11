-- ============================================================================
-- FEEDBACK TABLE STRUCTURE FIX MIGRATION
-- This migration ensures the feedback table has all required columns for the
-- multi-channel feedback system (widget, QR code, email signature)
-- ============================================================================

-- First, let's check what tables currently exist and their structure
DO $$
DECLARE
    feedback_table_exists boolean := false;
    feedbacks_table_exists boolean := false;
    table_name_to_use text;
BEGIN
    -- Check if 'feedback' table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback'
    ) INTO feedback_table_exists;
    
    -- Check if 'feedbacks' table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'feedbacks'
    ) INTO feedbacks_table_exists;
    
    -- Determine which table to use/standardize on
    IF feedback_table_exists AND feedbacks_table_exists THEN
        -- Both exist, we need to consolidate
        RAISE NOTICE 'Both feedback and feedbacks tables exist. Will consolidate into feedback table.';
        table_name_to_use := 'feedback';
    ELSIF feedback_table_exists THEN
        table_name_to_use := 'feedback';
    ELSIF feedbacks_table_exists THEN
        table_name_to_use := 'feedbacks';
    ELSE
        -- Neither exists, create feedback table
        table_name_to_use := 'feedback';
    END IF;
    
    RAISE NOTICE 'Using table: %', table_name_to_use;
END $$;

-- Drop the feedbacks table if it exists and we're standardizing on 'feedback'
DROP TABLE IF EXISTS public.feedbacks CASCADE;

-- Create or recreate the feedback table with the correct structure
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('widget', 'qr', 'email_signature')),
    name TEXT,
    email TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to existing feedback table
DO $$
BEGIN
    -- Add channel column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback' 
        AND column_name = 'channel'
    ) THEN
        ALTER TABLE public.feedback ADD COLUMN channel TEXT NOT NULL DEFAULT 'widget';
        -- Update existing records to have a default channel
        UPDATE public.feedback SET channel = 'widget' WHERE channel IS NULL;
        -- Add the constraint
        ALTER TABLE public.feedback ADD CONSTRAINT feedback_channel_check 
        CHECK (channel IN ('widget', 'qr', 'email_signature'));
    END IF;
    
    -- Add name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.feedback ADD COLUMN name TEXT;
    END IF;
    
    -- Add email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.feedback ADD COLUMN email TEXT;
    END IF;
    
    -- Add message column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback' 
        AND column_name = 'message'
    ) THEN
        ALTER TABLE public.feedback ADD COLUMN message TEXT NOT NULL DEFAULT '';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.feedback ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Ensure project_id is TEXT and NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback' 
        AND column_name = 'project_id'
        AND data_type != 'text'
    ) THEN
        -- Convert project_id to TEXT if it's not already
        ALTER TABLE public.feedback ALTER COLUMN project_id TYPE TEXT;
    END IF;
    
    -- Make project_id NOT NULL if it isn't already
    ALTER TABLE public.feedback ALTER COLUMN project_id SET NOT NULL;
    
    -- Make message NOT NULL if it isn't already
    ALTER TABLE public.feedback ALTER COLUMN message SET NOT NULL;
    
    -- Make channel NOT NULL if it isn't already
    ALTER TABLE public.feedback ALTER COLUMN channel SET NOT NULL;
    
    RAISE NOTICE 'Feedback table structure updated successfully';
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON public.feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_channel ON public.feedback(channel);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to read feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow anyone to insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Allow authenticated users to update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view feedbacks for their projects" ON public.feedback;
DROP POLICY IF EXISTS "Anyone can insert feedbacks" ON public.feedback;
DROP POLICY IF EXISTS "Users can update feedbacks for their projects" ON public.feedback;

-- Create comprehensive RLS policies
-- Policy 1: Allow authenticated users to read all feedback (for admin dashboard)
CREATE POLICY "Allow authenticated users to read feedback" ON public.feedback
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow anyone to insert feedback (for public forms and widget)
CREATE POLICY "Allow anyone to insert feedback" ON public.feedback
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy 3: Allow authenticated users to update feedback (for admin actions)
CREATE POLICY "Allow authenticated users to update feedback" ON public.feedback
    FOR UPDATE
    TO authenticated
    USING (true);

-- Policy 4: Allow authenticated users to delete feedback (for admin actions)
CREATE POLICY "Allow authenticated users to delete feedback" ON public.feedback
    FOR DELETE
    TO authenticated
    USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.feedback TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;

-- Create a function to safely insert feedback with validation
CREATE OR REPLACE FUNCTION public.insert_feedback_safe(
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
    -- Validate required fields
    IF p_project_id IS NULL OR TRIM(p_project_id) = '' THEN
        RAISE EXCEPTION 'project_id is required';
    END IF;
    
    IF p_channel IS NULL OR p_channel NOT IN ('widget', 'qr', 'email_signature') THEN
        RAISE EXCEPTION 'channel must be one of: widget, qr, email_signature';
    END IF;
    
    IF p_message IS NULL OR TRIM(p_message) = '' THEN
        RAISE EXCEPTION 'message is required';
    END IF;
    
    -- Insert the feedback
    INSERT INTO public.feedback (
        project_id,
        channel,
        name,
        email,
        message
    ) VALUES (
        p_project_id,
        p_channel,
        NULLIF(TRIM(p_name), ''),
        NULLIF(TRIM(p_email), ''),
        TRIM(p_message)
    ) RETURNING id INTO feedback_id;
    
    RETURN feedback_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.insert_feedback_safe(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Create a function to get feedback for a project
CREATE OR REPLACE FUNCTION public.get_feedback_for_project(p_project_id TEXT)
RETURNS TABLE (
    id UUID,
    project_id TEXT,
    channel TEXT,
    name TEXT,
    email TEXT,
    message TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id,
        f.project_id,
        f.channel,
        f.name,
        f.email,
        f.message,
        f.created_at
    FROM public.feedback f
    WHERE f.project_id = p_project_id
    ORDER BY f.created_at DESC;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_feedback_for_project(TEXT) TO authenticated;

-- Create a trigger function to update timestamps
CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.created_at = COALESCE(OLD.created_at, NOW());
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at (if we add that column later)
-- For now, we'll just ensure created_at is set properly

-- Insert some test data to verify the structure works
-- (This will be commented out in production)
/*
INSERT INTO public.feedback (project_id, channel, name, email, message) VALUES
('test-project-1', 'widget', 'John Doe', 'john@example.com', 'This is a test feedback from widget'),
('test-project-1', 'qr', 'Jane Smith', 'jane@example.com', 'This is a test feedback from QR code'),
('test-project-1', 'email_signature', 'Bob Johnson', 'bob@example.com', 'This is a test feedback from email signature');
*/

-- Verify the table structure
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'feedback';
    
    RAISE NOTICE 'Feedback table created/updated with % columns', column_count;
    
    -- List all columns
    RAISE NOTICE 'Columns in feedback table:';
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'feedback'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  %: % (nullable: %, default: %)', 
            rec.column_name, 
            rec.data_type, 
            rec.is_nullable, 
            rec.column_default;
    END LOOP;
END $$;

-- Final verification query
SELECT 
    'Migration completed successfully!' as status,
    COUNT(*) as total_feedback_records
FROM public.feedback;