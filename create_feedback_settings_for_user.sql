-- Function to create feedback settings for a new user
-- This function will be called automatically when a new user accesses the feedback settings page

CREATE OR REPLACE FUNCTION create_feedback_settings_for_user(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if feedback_settings table exists, if not create it
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback_settings') THEN
    -- Create feedback_settings table
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

    -- Add constraints for project_id
    ALTER TABLE feedback_settings ADD CONSTRAINT feedback_settings_project_id_locked_check 
    CHECK (NOT project_id_locked OR (project_id IS NOT NULL AND project_id != ''));

    -- Create a unique index on project_id per user that excludes empty values
    CREATE UNIQUE INDEX idx_feedback_settings_project_id_user_unique 
    ON feedback_settings (user_id, project_id) 
    WHERE project_id IS NOT NULL AND project_id != '';

    -- Create indexes for better performance
    CREATE INDEX idx_feedback_settings_user_id ON feedback_settings(user_id);
    CREATE INDEX idx_feedback_settings_project_id ON feedback_settings(project_id);

    -- Enable Row Level Security
    ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies for feedback_settings
    DROP POLICY IF EXISTS "Users can view their own feedback settings" ON feedback_settings;
    DROP POLICY IF EXISTS "Users can insert their own feedback settings" ON feedback_settings;
    DROP POLICY IF EXISTS "Users can update their own feedback settings" ON feedback_settings;

    CREATE POLICY "Users can view their own feedback settings" ON feedback_settings
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own feedback settings" ON feedback_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own feedback settings" ON feedback_settings
      FOR UPDATE USING (auth.uid() = user_id);

    -- Create function to update updated_at timestamp if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    END IF;

    -- Create trigger for updated_at
    DROP TRIGGER IF EXISTS update_feedback_settings_updated_at ON feedback_settings;
    CREATE TRIGGER update_feedback_settings_updated_at BEFORE UPDATE ON feedback_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Grant necessary permissions
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    GRANT ALL ON feedback_settings TO anon, authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
  END IF;

  -- Check if feedbacks table exists, if not create it
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedbacks') THEN
    -- Create feedbacks table
    CREATE TABLE feedbacks (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      project_id TEXT,
      name TEXT,
      email TEXT,
      message TEXT NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved'))
    );

    -- Create indexes for better performance
    CREATE INDEX idx_feedbacks_project_id ON feedbacks(project_id);
    CREATE INDEX idx_feedbacks_timestamp ON feedbacks(timestamp);
    CREATE INDEX idx_feedbacks_status ON feedbacks(status);

    -- Enable Row Level Security
    ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies for feedbacks
    DROP POLICY IF EXISTS "Users can view feedbacks for their projects" ON feedbacks;
    DROP POLICY IF EXISTS "Anyone can insert feedbacks" ON feedbacks;
    DROP POLICY IF EXISTS "Users can update feedbacks for their projects" ON feedbacks;

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

    -- Grant necessary permissions
    GRANT ALL ON feedbacks TO anon, authenticated;
  END IF;

  -- Create default feedback settings for the user if they don't exist
  IF NOT EXISTS (SELECT 1 FROM feedback_settings WHERE user_id = user_id_param) THEN
    INSERT INTO feedback_settings (
      user_id,
      project_id,
      project_id_locked,
      title,
      show_name,
      show_email,
      button_text,
      theme,
      brand_color,
      redirect_url,
      notify_email
    ) VALUES (
      user_id_param,
      '',
      false,
      'Share your thoughts with us',
      true,
      true,
      'Send Feedback',
      'dark',
      '#2563eb',
      null,
      null
    );
  END IF;

  -- Log the successful setup
  RAISE NOTICE 'Feedback system setup completed for user %', user_id_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_feedback_settings_for_user(UUID) TO authenticated;

-- Create a simpler function that just ensures the user has feedback settings
CREATE OR REPLACE FUNCTION ensure_user_feedback_settings(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create default feedback settings for the user if they don't exist
  IF NOT EXISTS (SELECT 1 FROM feedback_settings WHERE user_id = user_id_param) THEN
    INSERT INTO feedback_settings (
      user_id,
      project_id,
      project_id_locked,
      title,
      show_name,
      show_email,
      button_text,
      theme,
      brand_color,
      redirect_url,
      notify_email
    ) VALUES (
      user_id_param,
      '',
      false,
      'Share your thoughts with us',
      true,
      true,
      'Send Feedback',
      'dark',
      '#2563eb',
      null,
      null
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ensure_user_feedback_settings(UUID) TO authenticated;