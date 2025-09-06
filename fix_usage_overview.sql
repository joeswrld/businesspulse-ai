-- Fix usage overview by ensuring usage_counters table has the right schema
-- and populating it with actual usage data

-- First, check if usage_counters table exists and has the right columns
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'usage_counters' AND column_name = 'insights_count') THEN
        ALTER TABLE usage_counters ADD COLUMN insights_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'usage_counters' AND column_name = 'analytics_count') THEN
        ALTER TABLE usage_counters ADD COLUMN analytics_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'usage_counters' AND column_name = 'reports_count') THEN
        ALTER TABLE usage_counters ADD COLUMN reports_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create or update usage counters for all users based on actual data
INSERT INTO usage_counters (user_id, feedback_count, insights_count, analytics_count, reports_count)
SELECT 
    u.id as user_id,
    COALESCE((
        SELECT COUNT(*) 
        FROM feedbacks f 
        JOIN feedback_settings fs ON f.project_id = fs.project_id 
        WHERE fs.user_id = u.id
    ), 0) as feedback_count,
    COALESCE((
        SELECT COUNT(*) 
        FROM ai_insights 
        WHERE user_id = u.id
    ), 0) as insights_count,
    COALESCE((
        SELECT COUNT(*) 
        FROM analytics_history 
        WHERE user_id = u.id
    ), 0) as analytics_count,
    COALESCE((
        SELECT COUNT(*) 
        FROM reports 
        WHERE user_id = u.id
    ), 0) as reports_count
FROM auth.users u
ON CONFLICT (user_id) 
DO UPDATE SET
    feedback_count = EXCLUDED.feedback_count,
    insights_count = EXCLUDED.insights_count,
    analytics_count = EXCLUDED.analytics_count,
    reports_count = EXCLUDED.reports_count,
    updated_at = NOW();

-- Create a simple function to refresh usage for a specific user
CREATE OR REPLACE FUNCTION refresh_user_usage(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO usage_counters (user_id, feedback_count, insights_count, analytics_count, reports_count)
    SELECT 
        user_uuid,
        COALESCE((
            SELECT COUNT(*) 
            FROM feedbacks f 
            JOIN feedback_settings fs ON f.project_id = fs.project_id 
            WHERE fs.user_id = user_uuid
        ), 0),
        COALESCE((
            SELECT COUNT(*) 
            FROM ai_insights 
            WHERE user_id = user_uuid
        ), 0),
        COALESCE((
            SELECT COUNT(*) 
            FROM analytics_history 
            WHERE user_id = user_uuid
        ), 0),
        COALESCE((
            SELECT COUNT(*) 
            FROM reports 
            WHERE user_id = user_uuid
        ), 0)
    ON CONFLICT (user_id) 
    DO UPDATE SET
        feedback_count = EXCLUDED.feedback_count,
        insights_count = EXCLUDED.insights_count,
        analytics_count = EXCLUDED.analytics_count,
        reports_count = EXCLUDED.reports_count,
        updated_at = NOW();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID) TO service_role;

-- Verify the table structure
SELECT 'usage_counters table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'usage_counters' 
ORDER BY ordinal_position;

-- Show current usage data
SELECT 'Current usage data:' as info;
SELECT user_id, feedback_count, insights_count, analytics_count, reports_count, updated_at
FROM usage_counters
ORDER BY updated_at DESC
LIMIT 10;