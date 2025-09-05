-- Fix function conflict by dropping existing functions first
-- This script safely updates the usage_counters system

-- Step 1: Drop existing functions if they exist
DROP FUNCTION IF EXISTS refresh_usage_for_user(UUID);
DROP FUNCTION IF EXISTS reset_usage_if_new_month(UUID);
DROP FUNCTION IF EXISTS get_user_usage_with_monthly_reset(UUID);
DROP FUNCTION IF EXISTS ensure_current_month_usage(UUID);

-- Step 2: Add missing columns to usage_counters table
ALTER TABLE usage_counters 
ADD COLUMN IF NOT EXISTS ai_insights_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS analytics_reports_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS detailed_reports_count INTEGER NOT NULL DEFAULT 0;

-- Step 3: Rename columns to match the UsageOverview component expectations
DO $$ 
BEGIN
    -- Check if columns exist before renaming
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage_counters' AND column_name = 'ai_insights_count') THEN
        ALTER TABLE usage_counters RENAME COLUMN ai_insights_count TO insights_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage_counters' AND column_name = 'analytics_reports_count') THEN
        ALTER TABLE usage_counters RENAME COLUMN analytics_reports_count TO analytics_count;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usage_counters' AND column_name = 'detailed_reports_count') THEN
        ALTER TABLE usage_counters RENAME COLUMN detailed_reports_count TO reports_count;
    END IF;
END $$;

-- Step 4: Create the main monthly reset function
CREATE OR REPLACE FUNCTION ensure_current_month_usage(user_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  month_start DATE,
  feedback_count INTEGER,
  insights_count INTEGER,
  analytics_count INTEGER,
  reports_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month_start DATE;
  existing_record RECORD;
BEGIN
  -- Get the first day of the current month
  current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Check if a record exists for the current month
  SELECT * INTO existing_record
  FROM usage_counters
  WHERE user_id = user_uuid 
    AND month_start = current_month_start;
  
  -- If no record exists for current month, handle reset logic
  IF NOT FOUND THEN
    -- Check if there are any old records for this user
    SELECT * INTO existing_record
    FROM usage_counters
    WHERE user_id = user_uuid 
    ORDER BY month_start DESC
    LIMIT 1;
    
    -- If old record exists, reset all counts to 0 for new month
    IF FOUND THEN
      UPDATE usage_counters
      SET 
        month_start = current_month_start,
        feedback_count = 0,
        insights_count = 0,
        analytics_count = 0,
        reports_count = 0,
        updated_at = NOW()
      WHERE user_id = user_uuid 
        AND month_start = existing_record.month_start;
    ELSE
      -- No records exist, create a new one
      INSERT INTO usage_counters (
        user_id,
        month_start,
        feedback_count,
        insights_count,
        analytics_count,
        reports_count,
        created_at,
        updated_at
      ) VALUES (
        user_uuid,
        current_month_start,
        0,
        0,
        0,
        0,
        NOW(),
        NOW()
      );
    END IF;
  END IF;
  
  -- Return the current month's record
  RETURN QUERY
  SELECT 
    uc.user_id,
    uc.month_start,
    uc.feedback_count,
    uc.insights_count,
    uc.analytics_count,
    uc.reports_count,
    uc.created_at,
    uc.updated_at
  FROM usage_counters uc
  WHERE uc.user_id = user_uuid 
    AND uc.month_start = current_month_start;
END;
$$;

-- Step 5: Create the extended function with reset flag
CREATE OR REPLACE FUNCTION get_user_usage_with_monthly_reset(user_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  month_start DATE,
  feedback_count INTEGER,
  insights_count INTEGER,
  analytics_count INTEGER,
  reports_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_reset BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_month_start DATE;
  existing_record RECORD;
  was_reset BOOLEAN := FALSE;
BEGIN
  -- Get the first day of the current month
  current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Check if a record exists for the current month
  SELECT * INTO existing_record
  FROM usage_counters
  WHERE user_id = user_uuid 
    AND month_start = current_month_start;
  
  -- If no record exists for current month, handle reset logic
  IF NOT FOUND THEN
    -- Check if there are any old records for this user
    SELECT * INTO existing_record
    FROM usage_counters
    WHERE user_id = user_uuid 
    ORDER BY month_start DESC
    LIMIT 1;
    
    -- If old record exists, reset all counts to 0 for new month
    IF FOUND THEN
      UPDATE usage_counters
      SET 
        month_start = current_month_start,
        feedback_count = 0,
        insights_count = 0,
        analytics_count = 0,
        reports_count = 0,
        updated_at = NOW()
      WHERE user_id = user_uuid 
        AND month_start = existing_record.month_start;
      
      was_reset := TRUE;
    ELSE
      -- No records exist, create a new one
      INSERT INTO usage_counters (
        user_id,
        month_start,
        feedback_count,
        insights_count,
        analytics_count,
        reports_count,
        created_at,
        updated_at
      ) VALUES (
        user_uuid,
        current_month_start,
        0,
        0,
        0,
        0,
        NOW(),
        NOW()
      );
      
      was_reset := TRUE;
    END IF;
  END IF;
  
  -- Return the current month's record
  RETURN QUERY
  SELECT 
    uc.user_id,
    uc.month_start,
    uc.feedback_count,
    uc.insights_count,
    uc.analytics_count,
    uc.reports_count,
    uc.created_at,
    uc.updated_at,
    was_reset
  FROM usage_counters uc
  WHERE uc.user_id = user_uuid 
    AND uc.month_start = current_month_start;
END;
$$;

-- Step 6: Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION ensure_current_month_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_current_month_usage(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_usage_with_monthly_reset(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_usage_with_monthly_reset(UUID) TO service_role;

-- Step 7: Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'usage_counters' 
ORDER BY ordinal_position;

-- Step 8: Test the function (commented out for production)
-- SELECT * FROM ensure_current_month_usage('your-user-uuid-here');