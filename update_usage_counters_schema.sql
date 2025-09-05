-- Update usage_counters table to include all required fields for monthly reset
-- This script adds the missing columns and creates the monthly reset RPC function

-- First, add the missing columns to the existing table
ALTER TABLE usage_counters 
ADD COLUMN IF NOT EXISTS ai_insights_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS analytics_reports_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS detailed_reports_count INTEGER NOT NULL DEFAULT 0;

-- Rename columns to match the UsageOverview component expectations
ALTER TABLE usage_counters 
RENAME COLUMN ai_insights_count TO insights_count;

ALTER TABLE usage_counters 
RENAME COLUMN analytics_reports_count TO analytics_count;

ALTER TABLE usage_counters 
RENAME COLUMN detailed_reports_count TO reports_count;

-- Create the monthly reset RPC function
CREATE OR REPLACE FUNCTION refresh_usage_for_user(user_uuid UUID)
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
  
  -- If no record exists for current month, create one
  IF NOT FOUND THEN
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
    
    -- Return the newly created record
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
  ELSE
    -- Record exists for current month, return it as-is
    RETURN QUERY
    SELECT 
      existing_record.user_id,
      existing_record.month_start,
      existing_record.feedback_count,
      existing_record.insights_count,
      existing_record.analytics_count,
      existing_record.reports_count,
      existing_record.created_at,
      existing_record.updated_at;
  END IF;
END;
$$;

-- Create a function to reset usage for a user if they have an old month record
CREATE OR REPLACE FUNCTION reset_usage_if_new_month(user_uuid UUID)
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
  
  -- If no record exists for current month, check for old records and reset
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

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION refresh_usage_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_usage_for_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reset_usage_if_new_month(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_usage_if_new_month(UUID) TO service_role;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'usage_counters' 
ORDER BY ordinal_position;