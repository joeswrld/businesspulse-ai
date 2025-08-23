-- Fix usage tracking function issues
-- Run this in Supabase SQL Editor

-- 1. Check if usage_limits table has the required data
SELECT 
  'usage_limits table' as check_result,
  ul.*
FROM usage_limits ul
ORDER BY ul.plan_name;

-- 2. Check if user_usage table has data for current user
SELECT 
  'user_usage for current user' as check_result,
  uu.*
FROM user_usage uu
WHERE uu.user_id = '9a59f1bf-3e74-42d5-9c7e-8c92478e3515'
ORDER BY uu.usage_date DESC;

-- 3. Create user_usage record if it doesn't exist
INSERT INTO user_usage (
  user_id,
  usage_date,
  ai_insights_used,
  data_sources_used,
  team_members_used,
  ai_reports_used,
  business_analytics_used,
  created_at,
  updated_at
)
SELECT 
  '9a59f1bf-3e74-42d5-9c7e-8c92478e3515' as user_id,
  CURRENT_DATE as usage_date,
  0 as ai_insights_used,
  0 as data_sources_used,
  1 as team_members_used,
  0 as ai_reports_used,
  0 as business_analytics_used,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (
  SELECT 1 FROM user_usage 
  WHERE user_id = '9a59f1bf-3e74-42d5-9c7e-8c92478e3515' 
  AND usage_date = CURRENT_DATE
);

-- 4. Ensure usage_limits has all required plans
INSERT INTO usage_limits (
  plan_name,
  ai_insights_limit,
  data_sources_limit,
  team_members_limit,
  ai_reports_limit,
  business_analytics_limit,
  created_at,
  updated_at
)
VALUES 
  ('free_trial', 20, 1, 1, 2, 1, NOW(), NOW()),
  ('pro', 500, 5, 5, 20, 10, NOW(), NOW()),
  ('business', -1, -1, -1, -1, -1, NOW(), NOW())
ON CONFLICT (plan_name) DO UPDATE SET
  ai_insights_limit = EXCLUDED.ai_insights_limit,
  data_sources_limit = EXCLUDED.data_sources_limit,
  team_members_limit = EXCLUDED.team_members_limit,
  ai_reports_limit = EXCLUDED.ai_reports_limit,
  business_analytics_limit = EXCLUDED.business_analytics_limit,
  updated_at = NOW();

-- 5. Test the get_user_usage function
SELECT 
  'Testing get_user_usage function' as check_result,
  guu.*
FROM get_user_usage('9a59f1bf-3e74-42d5-9c7e-8c92478e3515') guu;

-- 6. Test the increment_usage function
SELECT 
  'Testing increment_usage function' as check_result,
  increment_usage('9a59f1bf-3e74-42d5-9c7e-8c92478e3515', 'ai_insights', 1) as can_increment;

-- 7. Check final state
SELECT 
  'Final user_usage state' as check_result,
  uu.*
FROM user_usage uu
WHERE uu.user_id = '9a59f1bf-3e74-42d5-9c7e-8c92478e3515'
ORDER BY uu.usage_date DESC;