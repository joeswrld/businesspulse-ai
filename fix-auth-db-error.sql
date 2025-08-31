-- Fix for Database Error Saving New User

-- Remove problematic triggers that cause user creation to fail
DROP TRIGGER IF EXISTS trigger_create_billing_profile ON auth.users;
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;

-- Drop problematic functions
DROP FUNCTION IF EXISTS create_billing_profile();
DROP FUNCTION IF EXISTS create_user_profile();

-- Create necessary tables if they don't exist
CREATE TABLE IF NOT EXISTS billing_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  plan TEXT DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_status TEXT DEFAULT 'trial',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  feedback_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  widget_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;

-- Create basic policies safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_profiles' AND policyname = 'users can read own billing profile') THEN
    CREATE POLICY "users can read own billing profile" ON billing_profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_profiles' AND policyname = 'users can insert own billing profile') THEN
    CREATE POLICY "users can insert own billing profile" ON billing_profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_tracking' AND policyname = 'users can read own usage') THEN
    CREATE POLICY "users can read own usage" ON usage_tracking FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_tracking' AND policyname = 'users can insert own usage') THEN
    CREATE POLICY "users can insert own usage" ON usage_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback_settings' AND policyname = 'users can read own feedback settings') THEN
    CREATE POLICY "users can read own feedback settings" ON feedback_settings FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feedback_settings' AND policyname = 'users can insert own feedback settings') THEN
    CREATE POLICY "users can insert own feedback settings" ON feedback_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

SELECT 'Database fix completed - user creation should now work!' as status;
