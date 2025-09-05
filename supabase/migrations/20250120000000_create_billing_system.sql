-- Create billing system tables for production-ready SaaS billing

-- Create user_subscriptions table for tracking subscription state
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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

-- Create transactions table for payment history
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_code VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reference VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  status VARCHAR(50) NOT NULL,
  gateway VARCHAR(50) DEFAULT 'paystack',
  metadata JSONB,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trial_end column to users table if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE;

-- Add authorization_code column to users table for card updates
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS authorization_code VARCHAR(255);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_users_trial_end ON users(trial_end);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to set trial end for new users
CREATE OR REPLACE FUNCTION set_trial_end()
RETURNS TRIGGER AS $$
BEGIN
    -- Set trial end to 8 days from now for new users
    NEW.trial_end = NOW() + INTERVAL '8 days';
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for trial end
CREATE TRIGGER set_trial_end_trigger
    BEFORE INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION set_trial_end();

-- Create function to check if user has active subscription or trial
CREATE OR REPLACE FUNCTION has_active_access(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_trial_end TIMESTAMP WITH TIME ZONE;
    subscription_status VARCHAR(50);
BEGIN
    -- Get user's trial end and subscription status
    SELECT trial_end, subscription_status 
    INTO user_trial_end, subscription_status
    FROM users 
    WHERE id = user_uuid;
    
    -- Check if user has active subscription
    IF subscription_status = 'active' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is still in trial period
    IF user_trial_end IS NOT NULL AND user_trial_end > NOW() THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ language 'plpgsql';

-- Insert default plans
INSERT INTO user_subscriptions (user_id, plan_code, plan_name, status)
SELECT 
    u.id,
    'free',
    'Free',
    'active'
FROM users u
ON CONFLICT (user_id) DO NOTHING;

-- Update existing users to have trial_end if not set
UPDATE users 
SET trial_end = NOW() + INTERVAL '8 days'
WHERE trial_end IS NULL;

-- Add comments for documentation
COMMENT ON TABLE user_subscriptions IS 'Tracks user subscription state and billing periods';
COMMENT ON TABLE transactions IS 'Records all payment transactions for audit and reconciliation';
COMMENT ON COLUMN users.trial_end IS 'End date of 8-day free trial period';
COMMENT ON COLUMN users.authorization_code IS 'Paystack authorization code for recurring payments';
COMMENT ON FUNCTION has_active_access(UUID) IS 'Returns true if user has active subscription or valid trial';
