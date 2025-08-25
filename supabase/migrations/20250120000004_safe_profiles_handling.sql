-- Safe profiles table handling
-- This migration ensures profiles table works correctly regardless of existing structure

-- Function to safely create or update user profile
CREATE OR REPLACE FUNCTION safe_create_user_profile(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_exists BOOLEAN;
    has_user_id_col BOOLEAN;
    has_email_col BOOLEAN;
    has_full_name_col BOOLEAN;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id_param) INTO profile_exists;
    
    -- Check which columns exist in profiles table
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) INTO has_user_id_col;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) INTO has_email_col;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'full_name'
        AND table_schema = 'public'
    ) INTO has_full_name_col;
    
    -- If profile doesn't exist, create it
    IF NOT profile_exists THEN
        -- Build dynamic INSERT statement based on available columns
        IF has_user_id_col THEN
            -- Insert with user_id column
            EXECUTE format('INSERT INTO profiles (id, user_id) VALUES (%L, %L)', user_id_param, user_id_param);
        ELSE
            -- Insert without user_id column
            EXECUTE format('INSERT INTO profiles (id) VALUES (%L)', user_id_param);
        END IF;
    END IF;
    
    -- Update profile with user data if columns exist
    IF has_email_col OR has_full_name_col THEN
        -- Build dynamic UPDATE statement
        DECLARE
            update_sql TEXT := 'UPDATE profiles SET ';
            update_parts TEXT[] := ARRAY[]::TEXT[];
        BEGIN
            IF has_email_col THEN
                update_parts := array_append(update_parts, 'email = auth_users.email');
            END IF;
            
            IF has_full_name_col THEN
                update_parts := array_append(update_parts, 'full_name = auth_users.raw_user_meta_data->>''full_name''');
            END IF;
            
            IF array_length(update_parts, 1) > 0 THEN
                update_sql := update_sql || array_to_string(update_parts, ', ') || 
                             ' FROM auth.users auth_users ' ||
                             'WHERE profiles.id = auth_users.id AND auth_users.id = ' || quote_literal(user_id_param);
                EXECUTE update_sql;
            END IF;
        END;
    END IF;
    
    RAISE NOTICE 'Profile handled successfully for user %', user_id_param;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION safe_create_user_profile(UUID) TO authenticated;

-- Update the main function to use the safe profile creation
CREATE OR REPLACE FUNCTION ensure_all_tables_for_user(user_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure feedback_settings table exists
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

    -- Add constraints and indexes
    ALTER TABLE feedback_settings ADD CONSTRAINT feedback_settings_project_id_locked_check 
    CHECK (NOT project_id_locked OR (project_id IS NOT NULL AND project_id != ''));

    CREATE UNIQUE INDEX idx_feedback_settings_project_id_user_unique 
    ON feedback_settings (user_id, project_id) 
    WHERE project_id IS NOT NULL AND project_id != '';

    CREATE INDEX idx_feedback_settings_user_id ON feedback_settings(user_id);
    CREATE INDEX idx_feedback_settings_project_id ON feedback_settings(project_id);

    -- Enable RLS
    ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view their own feedback settings" ON feedback_settings
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own feedback settings" ON feedback_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own feedback settings" ON feedback_settings
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- Ensure feedbacks table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedbacks') THEN
    CREATE TABLE feedbacks (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      project_id TEXT,
      name TEXT,
      email TEXT,
      message TEXT NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved'))
    );

    -- Create indexes
    CREATE INDEX idx_feedbacks_project_id ON feedbacks(project_id);
    CREATE INDEX idx_feedbacks_timestamp ON feedbacks(timestamp);
    CREATE INDEX idx_feedbacks_status ON feedbacks(status);

    -- Enable RLS
    ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
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
  END IF;

  -- Ensure data_sources table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'data_sources') THEN
    CREATE TABLE data_sources (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('text', 'pdf', 'csv', 'xlsx', 'docx', 'json', 'txt')),
      file_size BIGINT,
      file_url TEXT,
      status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX idx_data_sources_user_id ON data_sources(user_id);
    CREATE INDEX idx_data_sources_status ON data_sources(status);
    CREATE INDEX idx_data_sources_type ON data_sources(type);

    -- Enable RLS
    ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view their own data sources" ON data_sources
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own data sources" ON data_sources
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own data sources" ON data_sources
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own data sources" ON data_sources
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- Ensure user_subscriptions table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    CREATE TABLE user_subscriptions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'pro', 'enterprise')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')),
      current_period_start TIMESTAMP WITH TIME ZONE,
      current_period_end TIMESTAMP WITH TIME ZONE,
      cancel_at_period_end BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes
    CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
    CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

    -- Enable RLS
    ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view their own subscription" ON user_subscriptions
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can update their own subscription" ON user_subscriptions
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own subscription" ON user_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Note: Triggers will be created in a separate migration to avoid syntax errors

  -- Grant necessary permissions
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

  -- Create default records for the user using safe functions
  -- Ensure user has a profile using the safe function
  PERFORM safe_create_user_profile(user_id_param);

  -- Ensure user has feedback settings
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

  -- Ensure user has a subscription record
  IF NOT EXISTS (SELECT 1 FROM user_subscriptions WHERE user_id = user_id_param) THEN
    INSERT INTO user_subscriptions (
      user_id,
      subscription_type,
      status,
      current_period_start,
      current_period_end
    ) VALUES (
      user_id_param,
      'free',
      'active',
      NOW(),
      NOW() + INTERVAL '1 year'
    );
  END IF;

  -- Log the successful setup
  RAISE NOTICE 'All tables and default records created for user %', user_id_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ensure_all_tables_for_user(UUID) TO authenticated;