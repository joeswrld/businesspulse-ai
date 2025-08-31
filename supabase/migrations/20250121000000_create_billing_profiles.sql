-- Create billing_profiles table for enhanced billing system
CREATE TABLE IF NOT EXISTS billing_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  plan TEXT CHECK (plan IN ('trial','free','pro','business')) DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  subscription_status TEXT,
  paystack_customer_id TEXT,
  paystack_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create transactions table if not exists (enhanced version)
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  amount INT,
  currency TEXT DEFAULT 'NGN',
  status TEXT CHECK (status IN ('success','failed','pending')),
  description TEXT,
  paystack_reference TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_profiles_user_id ON billing_profiles(id);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_plan ON billing_profiles(plan);
CREATE INDEX IF NOT EXISTS idx_billing_profiles_status ON billing_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Enable RLS
ALTER TABLE billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for billing_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_profiles' AND policyname = 'users can read own billing profile') THEN
    CREATE POLICY "users can read own billing profile"
      ON billing_profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_profiles' AND policyname = 'users can update own billing profile') THEN
    CREATE POLICY "users can update own billing profile"
      ON billing_profiles FOR UPDATE
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'billing_profiles' AND policyname = 'users can insert own billing profile') THEN
    CREATE POLICY "users can insert own billing profile"
      ON billing_profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- RLS Policies for transactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'users can read own transactions') THEN
    CREATE POLICY "users can read own transactions"
      ON transactions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'users can insert own transactions') THEN
    CREATE POLICY "users can insert own transactions"
      ON transactions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Function to create billing profile for new users
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

-- Trigger to create billing profile for new users
DROP TRIGGER IF EXISTS trigger_create_billing_profile ON auth.users;
CREATE TRIGGER trigger_create_billing_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_billing_profile();

-- Function to handle trial expiration
CREATE OR REPLACE FUNCTION handle_trial_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- If trial has expired and user is still on trial plan
  IF NEW.trial_ends_at < NOW() AND NEW.plan = 'trial' THEN
    NEW.plan := 'free';
    NEW.subscription_status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle trial expiration
DROP TRIGGER IF EXISTS trigger_handle_trial_expiration ON billing_profiles;
CREATE TRIGGER trigger_handle_trial_expiration
  BEFORE UPDATE ON billing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_trial_expiration();

-- Insert billing profiles for existing users who don't have one
INSERT INTO billing_profiles (id, plan, trial_ends_at, subscription_status)
SELECT 
  u.id,
  CASE 
    WHEN u.plan = 'pro' THEN 'pro'
    WHEN u.plan = 'business' THEN 'business'
    WHEN u.created_at > NOW() - INTERVAL '8 days' THEN 'trial'
    ELSE 'free'
  END,
  CASE 
    WHEN u.created_at > NOW() - INTERVAL '8 days' THEN u.created_at + INTERVAL '8 days'
    ELSE NULL
  END,
  CASE 
    WHEN u.subscription_status = 'active' THEN 'active'
    WHEN u.created_at > NOW() - INTERVAL '8 days' THEN 'trial'
    ELSE 'expired'
  END
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM billing_profiles bp WHERE bp.id = u.id
);

-- Add comments for documentation
COMMENT ON TABLE billing_profiles IS 'User billing profiles with plan, trial, and subscription information';
COMMENT ON TABLE transactions IS 'Payment transaction history for users';
COMMENT ON COLUMN billing_profiles.plan IS 'Current plan: trial, free, pro, business';
COMMENT ON COLUMN billing_profiles.trial_ends_at IS 'End date of 8-day free trial';
COMMENT ON COLUMN billing_profiles.next_billing_date IS 'Next billing date for active subscriptions';
COMMENT ON COLUMN billing_profiles.subscription_status IS 'Subscription status: trial, active, past_due, cancelled, expired';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount in kobo (smallest currency unit)';
COMMENT ON COLUMN transactions.paystack_reference IS 'Unique Paystack transaction reference';