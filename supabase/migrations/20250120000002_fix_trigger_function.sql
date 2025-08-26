-- Fix for trigger function syntax error
-- This migration creates the trigger function outside of the main function

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns (only if tables exist)
DO $$
BEGIN
  -- Create trigger for feedback_settings if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback_settings') THEN
    DROP TRIGGER IF EXISTS update_feedback_settings_updated_at ON feedback_settings;
    CREATE TRIGGER update_feedback_settings_updated_at BEFORE UPDATE ON feedback_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Create trigger for data_sources if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'data_sources') THEN
    DROP TRIGGER IF EXISTS update_data_sources_updated_at ON data_sources;
    CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Create trigger for profiles if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Create trigger for user_subscriptions if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
    CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;