-- Add subscription fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS plan_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE;

-- Create index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON users(subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Add comments for documentation
COMMENT ON COLUMN users.plan IS 'Current subscription plan: free, pro, business';
COMMENT ON COLUMN users.subscription_id IS 'Paystack subscription ID';
COMMENT ON COLUMN users.subscription_status IS 'Subscription status: inactive, active, past_due, cancelled, trialing';
COMMENT ON COLUMN users.plan_start_date IS 'Date when current plan started';
COMMENT ON COLUMN users.next_payment_date IS 'Next payment due date';
COMMENT ON COLUMN users.last_payment_date IS 'Last successful payment date';
COMMENT ON COLUMN users.trial_end_date IS 'Trial period end date';