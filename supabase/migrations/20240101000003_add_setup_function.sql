-- Create a function to set up feedback tables
CREATE OR REPLACE FUNCTION setup_feedback_tables()
RETURNS TEXT AS $$
BEGIN
  -- Create feedback table if it doesn't exist
  CREATE TABLE IF NOT EXISTS feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_name VARCHAR(255),
    email VARCHAR(255),
    message TEXT NOT NULL,
    sentiment VARCHAR(50) DEFAULT 'neutral',
    status VARCHAR(50) DEFAULT 'new',
    priority VARCHAR(50) DEFAULT 'normal',
    category VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create feedback settings table if it doesn't exist
  CREATE TABLE IF NOT EXISTS feedback_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    brand_colors JSONB DEFAULT '{"primary": "#3b82f6", "secondary": "#1e40af"}',
    greeting_text VARCHAR(500) DEFAULT 'How was your experience?',
    button_placement VARCHAR(50) DEFAULT 'bottom',
    widget_enabled BOOLEAN DEFAULT true,
    auto_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create feedback notifications table if it doesn't exist
  CREATE TABLE IF NOT EXISTS feedback_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
  );

  -- Create indexes if they don't exist
  CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
  CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
  CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);
  CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback(priority);
  CREATE INDEX IF NOT EXISTS idx_feedback_settings_user_id ON feedback_settings(user_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_notifications_user_id ON feedback_notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_notifications_feedback_id ON feedback_notifications(feedback_id);

  -- Enable Row Level Security
  ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
  ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE feedback_notifications ENABLE ROW LEVEL SECURITY;

  -- Create RLS policies if they don't exist
  DO $$
  BEGIN
    -- Feedback policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'Users can view their own feedback') THEN
      CREATE POLICY "Users can view their own feedback" ON feedback
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'Users can update their own feedback') THEN
      CREATE POLICY "Users can update their own feedback" ON feedback
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback' AND policyname = 'Users can insert their own feedback') THEN
      CREATE POLICY "Users can insert their own feedback" ON feedback
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Feedback settings policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback_settings' AND policyname = 'Users can view their own feedback settings') THEN
      CREATE POLICY "Users can view their own feedback settings" ON feedback_settings
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback_settings' AND policyname = 'Users can update their own feedback settings') THEN
      CREATE POLICY "Users can update their own feedback settings" ON feedback_settings
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback_settings' AND policyname = 'Users can insert their own feedback settings') THEN
      CREATE POLICY "Users can insert their own feedback settings" ON feedback_settings
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Feedback notifications policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback_notifications' AND policyname = 'Users can view their own feedback notifications') THEN
      CREATE POLICY "Users can view their own feedback notifications" ON feedback_notifications
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback_notifications' AND policyname = 'Users can update their own feedback notifications') THEN
      CREATE POLICY "Users can update their own feedback notifications" ON feedback_notifications
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback_notifications' AND policyname = 'Users can insert their own feedback notifications') THEN
      CREATE POLICY "Users can insert their own feedback notifications" ON feedback_notifications
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
  END $$;

  -- Create function to update updated_at timestamp if it doesn't exist
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ language 'plpgsql';

  -- Create triggers for updated_at if they don't exist
  DROP TRIGGER IF EXISTS update_feedback_updated_at ON feedback;
  CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  DROP TRIGGER IF EXISTS update_feedback_settings_updated_at ON feedback_settings;
  CREATE TRIGGER update_feedback_settings_updated_at BEFORE UPDATE ON feedback_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

  -- Create function to detect urgent keywords if it doesn't exist
  CREATE OR REPLACE FUNCTION detect_urgent_keywords(message_text TEXT)
  RETURNS BOOLEAN AS $$
  BEGIN
    RETURN message_text ILIKE '%urgent%' OR 
           message_text ILIKE '%refund%' OR 
           message_text ILIKE '%angry%' OR 
           message_text ILIKE '%broken%' OR 
           message_text ILIKE '%not working%' OR
           message_text ILIKE '%issue%' OR
           message_text ILIKE '%problem%' OR
           message_text ILIKE '%frustrated%' OR
           message_text ILIKE '%disappointed%';
  END;
  $$ LANGUAGE plpgsql;

  -- Create function to automatically set priority based on keywords if it doesn't exist
  CREATE OR REPLACE FUNCTION set_feedback_priority()
  RETURNS TRIGGER AS $$
  BEGIN
    IF detect_urgent_keywords(NEW.message) THEN
      NEW.priority = 'urgent';
    ELSIF NEW.message ILIKE '%bug%' OR NEW.message ILIKE '%error%' THEN
      NEW.priority = 'high';
    ELSE
      NEW.priority = 'normal';
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Create trigger for automatic priority setting if it doesn't exist
  DROP TRIGGER IF EXISTS set_feedback_priority_trigger ON feedback;
  CREATE TRIGGER set_feedback_priority_trigger BEFORE INSERT ON feedback
    FOR EACH ROW EXECUTE FUNCTION set_feedback_priority();

  -- Grant necessary permissions
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
  GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

  RETURN 'Feedback tables setup completed successfully!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;