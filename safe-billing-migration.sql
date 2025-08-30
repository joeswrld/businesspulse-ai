-- Safe migration to handle existing tables
-- This script checks if tables exist before creating them
-- Updated for NoteX: Free Trial (8 days), Pro (30 days), Business (30 days)

-- Function to safely create tables
CREATE OR REPLACE FUNCTION create_billing_tables_safely()
RETURNS void AS $$
BEGIN
  -- Create billing_profiles table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'billing_profiles') THEN
    CREATE TABLE billing_profiles (
      id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
      plan TEXT CHECK (plan IN ('trial','pro','business')) DEFAULT 'trial',
      trial_ends_at TIMESTAMP WITH TIME ZONE,
      next_billing_date TIMESTAMP WITH TIME ZONE,
      subscription_status TEXT CHECK (subscription_status IN ('trial','active','past_due','cancelled','expired')) DEFAULT 'trial',
      paystack_customer_id TEXT,
      paystack_subscription_id TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    RAISE NOTICE 'Created billing_profiles table';
  ELSE
    RAISE NOTICE 'billing_profiles table already exists';
  END IF;

  -- Create user_subscriptions table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    CREATE TABLE user_subscriptions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      plan_code VARCHAR(255) NOT NULL,
      plan_name VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'inactive',
      current_period_start TIMESTAMP WITH TIME ZONE,
      current_period_end TIMESTAMP WITH TIME ZONE,
      cancel_at_period_end BOOLEAN DEFAULT FALSE,
      canceled_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id)
    );
    
    RAISE NOTICE 'Created user_subscriptions table';
  ELSE
    RAISE NOTICE 'user_subscriptions table already exists';
  END IF;

  -- Create transactions table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions') THEN
    CREATE TABLE transactions (
      id BIGSERIAL PRIMARY KEY,
      user_id UUID REFERENCES auth.users ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      currency TEXT DEFAULT 'NGN',
      status TEXT CHECK (status IN ('success','failed','pending')) DEFAULT 'pending',
      description TEXT,
      paystack_reference TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    RAISE NOTICE 'Created transactions table';
  ELSE
    RAISE NOTICE 'transactions table already exists';
  END IF;

  -- Create usage_tracking table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'usage_tracking') THEN
    CREATE TABLE usage_tracking (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES auth.users ON DELETE CASCADE,
      feedback_count INTEGER DEFAULT 0,
      analytics_count INTEGER DEFAULT 0,
      reports_count INTEGER DEFAULT 0,
      insights_count INTEGER DEFAULT 0,
      teams_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    RAISE NOTICE 'Created usage_tracking table';
  ELSE
    RAISE NOTICE 'usage_tracking table already exists';
  END IF;

END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT create_billing_tables_safely();

-- Create indexes safely
DO $$
BEGIN
  -- billing_profiles indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_billing_profiles_user_id') THEN
    CREATE INDEX idx_billing_profiles_user_id ON billing_profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_billing_profiles_plan') THEN
    CREATE INDEX idx_billing_profiles_plan ON billing_profiles(plan);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_billing_profiles_status') THEN
    CREATE INDEX idx_billing_profiles_status ON billing_profiles(subscription_status);
  END IF;

  -- user_subscriptions indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_subscriptions_user_id') THEN
    CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_subscriptions_status') THEN
    CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
  END IF;

  -- transactions indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_user_id') THEN
    CREATE INDEX idx_transactions_user_id ON transactions(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_status') THEN
    CREATE INDEX idx_transactions_status ON transactions(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_reference') THEN
    CREATE INDEX idx_transactions_reference ON transactions(paystack_reference);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_created_at') THEN
    CREATE INDEX idx_transactions_created_at ON transactions(created_at);
  END IF;

  -- usage_tracking indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usage_tracking_user_id') THEN
    CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
  END IF;

END $$;

-- Enable RLS safely
DO $$
BEGIN
  -- billing_profiles RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_profiles') THEN
    ALTER TABLE billing_profiles ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "users can read own billing profile"
      ON billing_profiles FOR SELECT
      USING (auth.uid() = id);

    CREATE POLICY "users can update own billing profile"
      ON billing_profiles FOR UPDATE
      USING (auth.uid() = id);

    CREATE POLICY "users can insert own billing profile"
      ON billing_profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;

  -- user_subscriptions RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions') THEN
    ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can create own subscriptions" ON user_subscriptions
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- transactions RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions') THEN
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "users can read own transactions"
      ON transactions FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "users can insert own transactions"
      ON transactions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- usage_tracking RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_tracking') THEN
    ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "users can read own usage"
      ON usage_tracking FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "users can update own usage"
      ON usage_tracking FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "users can insert own usage"
      ON usage_tracking FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

END $$;

-- Create functions safely
CREATE OR REPLACE FUNCTION create_billing_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO billing_profiles (id, plan, trial_ends_at, subscription_status)
  VALUES (
    NEW.id,
    'trial',
    NOW() + INTERVAL '8 days',
    'trial'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_trial_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- If trial has expired and user is still on trial plan
  IF NEW.trial_ends_at < NOW() AND NEW.plan = 'trial' THEN
    NEW.plan := 'pro';
    NEW.subscription_status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers safely
DO $$
BEGIN
  -- billing profile trigger
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_billing_profile') THEN
    CREATE TRIGGER trigger_create_billing_profile
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_billing_profile();
  END IF;

  -- trial expiration trigger
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_handle_trial_expiration') THEN
    CREATE TRIGGER trigger_handle_trial_expiration
      BEFORE UPDATE ON billing_profiles
      FOR EACH ROW
      EXECUTE FUNCTION handle_trial_expiration();
  END IF;

END $$;

-- Insert default data for existing users
INSERT INTO billing_profiles (id, plan, trial_ends_at, subscription_status)
SELECT 
  u.id,
  'trial',
  u.created_at + INTERVAL '8 days',
  'trial'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM billing_profiles bp WHERE bp.id = u.id
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_subscriptions (user_id, plan_code, plan_name, status)
SELECT 
  u.id,
  'trial',
  'Free Trial (8 days)',
  'active'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us WHERE us.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO usage_tracking (id, user_id, feedback_count, analytics_count, reports_count, insights_count, teams_count)
SELECT 
  u.id,
  u.id,
  0,
  0,
  0,
  0,
  0
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM usage_tracking ut WHERE ut.user_id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE billing_profiles IS 'User billing profiles with plan, trial, and subscription information';
COMMENT ON TABLE user_subscriptions IS 'User subscription state and billing periods';
COMMENT ON TABLE transactions IS 'Payment transaction history for users';
COMMENT ON TABLE usage_tracking IS 'User feature usage tracking';
COMMENT ON COLUMN billing_profiles.plan IS 'Current plan: trial (8 days), pro (30 days), business (30 days)';
COMMENT ON COLUMN billing_profiles.trial_ends_at IS 'End date of 8-day free trial';
COMMENT ON COLUMN billing_profiles.next_billing_date IS 'Next billing date for active subscriptions (30 days for pro/business)';
COMMENT ON COLUMN billing_profiles.subscription_status IS 'Subscription status: trial, active, past_due, cancelled, expired';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount in kobo (smallest currency unit)';
COMMENT ON COLUMN transactions.paystack_reference IS 'Unique Paystack transaction reference';

-- Clean up
DROP FUNCTION IF EXISTS create_billing_tables_safely();