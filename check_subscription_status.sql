-- Check subscription status and fix issues
-- Run this in Supabase SQL Editor

-- 1. Check if user_subscriptions table exists and has data
SELECT 
  'user_subscriptions table exists' as check_result,
  COUNT(*) as total_records
FROM user_subscriptions;

-- 2. Check current user's subscription (replace with actual user_id)
-- Replace '9a59f1bf-3e74-42d5-9c7e-8c92478e3515' with the actual user_id from console
SELECT 
  'Current user subscription' as check_result,
  us.*
FROM user_subscriptions us
WHERE us.user_id = '9a59f1bf-3e74-42d5-9c7e-8c92478e3515';

-- 3. Check if user exists in auth.users
SELECT 
  'User in auth.users' as check_result,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
WHERE au.id = '9a59f1bf-3e74-42d5-9c7e-8c92478e3515';

-- 4. Check RLS policies on user_subscriptions
SELECT 
  'RLS policies' as check_result,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_subscriptions';

-- 5. Create default subscription if user doesn't have one
INSERT INTO user_subscriptions (
  user_id,
  plan_name,
  status,
  price,
  currency,
  interval,
  created_at,
  updated_at
)
SELECT 
  '9a59f1bf-3e74-42d5-9c7e-8c92478e3515' as user_id,
  'free_trial' as plan_name,
  'trialing' as status,
  0 as price,
  '₦' as currency,
  '8 days' as interval,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions 
  WHERE user_id = '9a59f1bf-3e74-42d5-9c7e-8c92478e3515'
);

-- 6. Verify the subscription was created
SELECT 
  'Subscription after fix' as check_result,
  us.*
FROM user_subscriptions us
WHERE us.user_id = '9a59f1bf-3e74-42d5-9c7e-8c92478e3515';