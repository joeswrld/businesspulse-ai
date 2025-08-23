-- Comprehensive User Subscriptions Table Migration

-- 1. Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create or Alter user_subscriptions table with a comprehensive structure
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Subscription Details
    plan_id UUID DEFAULT uuid_generate_v4(),
    plan_name TEXT NOT NULL DEFAULT 'free_trial',
    plan_type TEXT NOT NULL DEFAULT 'trial',
    status TEXT NOT NULL DEFAULT 'trialing' 
        CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
    
    -- Financial Details
    price INTEGER DEFAULT 0,
    currency TEXT DEFAULT '₦',
    interval TEXT DEFAULT '8 days',
    
    -- Timing Columns
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 days'),
    trial_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 days'),
    
    -- Metadata
    subscription_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_active_subscription UNIQUE (user_id, status)
);

-- 3. Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id 
ON user_subscriptions(user_id);

-- 4. Create a trigger to auto-update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_user_subscription_modtime
BEFORE UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- 5. Upsert function for managing subscriptions
CREATE OR REPLACE FUNCTION upsert_user_subscription(
    p_user_id UUID,
    p_plan_name TEXT DEFAULT 'free_trial',
    p_plan_type TEXT DEFAULT 'trial',
    p_price INTEGER DEFAULT 0,
    p_interval TEXT DEFAULT '8 days'
)
RETURNS UUID AS $$
DECLARE
    v_subscription_id UUID;
BEGIN
    -- Cancel any existing active subscriptions
    UPDATE user_subscriptions 
    SET status = 'canceled', 
        current_period_end = NOW()
    WHERE user_id = p_user_id AND status != 'canceled';

    -- Insert new subscription
    INSERT INTO user_subscriptions (
        user_id, 
        plan_name, 
        plan_type, 
        status, 
        price, 
        interval,
        current_period_start,
        current_period_end,
        trial_end
    ) VALUES (
        p_user_id,
        p_plan_name,
        p_plan_type,
        'trialing',
        p_price,
        p_interval,
        NOW(),
        NOW() + (p_interval || ' days')::interval,
        NOW() + (p_interval || ' days')::interval
    )
    RETURNING id INTO v_subscription_id;

    RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Example of using the upsert function
-- This can be called from your application or SQL editor
-- SELECT upsert_user_subscription(
--     '9a59f1bf-3e74-42d5-9c7e-8c92478e3515'::UUID,
--     'free_trial',
--     'trial',
--     0,
--     '8'
-- );

-- 7. RLS Policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions" ON user_subscriptions
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON user_subscriptions
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. Verification Queries
-- Check table structure
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_subscriptions'
ORDER BY ordinal_position;
