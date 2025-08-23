-- Fix subscription table structure and data
-- Run this in Supabase SQL Editor

-- 1. Check current table structure
SELECT 
  'Current user_subscriptions structure' as check_result,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Add missing columns if they don't exist
DO $$
BEGIN
    -- Add plan_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'plan_name'
    ) THEN
        ALTER TABLE user_subscriptions ADD COLUMN plan_name TEXT NOT NULL DEFAULT 'free_trial';
    END IF;

    -- Add plan_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE user_subscriptions ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'trial';
    END IF;

    -- Add current_period_start column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'current_period_start'
    ) THEN
        ALTER TABLE user_subscriptions ADD COLUMN current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Add current_period_end column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'current_period_end'
    ) THEN
        ALTER TABLE user_subscriptions ADD COLUMN current_period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 days');
    END IF;

    -- Add trial_end column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'trial_end'
    ) THEN
        ALTER TABLE user_subscriptions ADD COLUMN trial_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '8 days');
    END IF;

    -- Add price column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'price'
    ) THEN
        ALTER TABLE user_subscriptions ADD COLUMN price INTEGER DEFAULT 0;
    END IF;

    -- Add currency column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE user_subscriptions ADD COLUMN currency TEXT DEFAULT '₦';
    END IF;

    -- Add interval column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'interval'
    ) THEN
        ALTER TABLE user_subscriptions ADD COLUMN interval TEXT DEFAULT '8 days';
    END IF;

    -- Add subscription_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_subscriptions' 
        AND column_name = 'subscription_id'
    ) THEN
        ALTER TABLE user_subscriptions ADD COLUMN subscription_id TEXT;
    END IF;
END $$;

-- 3. Check updated table structure
SELECT 
  'Updated user_subscriptions structure' as check_result,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_subscriptions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Create default subscription for current user
INSERT INTO user_subscriptions (
  user_id,
  plan_name,
  plan_type,
  status,
  price,
  currency,
  interval,
  current_period_start,
  current_period_end,
  trial_end,
  created_at,
  updated_at
)
SELECT 
  '9a59f1bf-3e74-42d5-9c7e-8c92478e3515' as user_id,
  'free_trial' as plan_name,
  'trial' as plan_type,
  'trialing' as status,
  0 as price,
  '₦' as currency,
  '8 days' as interval,
  NOW() as current_period_start,
  (NOW() + INTERVAL '8 days') as current_period_end,
  (NOW() + INTERVAL '8 days') as trial_end,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions 
  WHERE user_id = '9a59f1bf-3e74-42d5-9c7e-8c92478e3515'
);

-- 5. Verify the subscription was created
SELECT 
  'Subscription after fix' as check_result,
  us.*
FROM user_subscriptions us
WHERE us.user_id = '9a59f1bf-3e74-42d5-9c7e-8c92478e3515';