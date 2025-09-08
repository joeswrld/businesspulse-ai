# 🚀 Manual Deployment Guide (Deadlock-Safe)

## ❌ **Deadlock Error Fixed**

The error `40P01: deadlock detected` occurs when multiple database operations try to access the same resources simultaneously. This guide provides a safe, step-by-step approach.

## 🔧 **Step-by-Step Manual Deployment**

### **Step 1: Check Current State**
First, run this to see what exists:
```sql
-- Check existing functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('refresh_user_usage', 'check_usage_limit', 'reset_monthly_usage');

-- Check existing tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('usage_counters', 'subscriptions');
```

### **Step 2: Drop Functions (One at a Time)**
Run these commands **one at a time** in your Supabase SQL editor:

```sql
-- Drop functions in reverse dependency order
DROP FUNCTION IF EXISTS reset_monthly_usage() CASCADE;
```

Wait for completion, then:
```sql
DROP FUNCTION IF EXISTS check_usage_limit(UUID, TEXT) CASCADE;
```

Wait for completion, then:
```sql
DROP FUNCTION IF EXISTS refresh_user_usage(UUID, DATE) CASCADE;
```

### **Step 3: Create Functions (One at a Time)**
Run these commands **one at a time**:

```sql
-- Create refresh_user_usage function
CREATE OR REPLACE FUNCTION refresh_user_usage(user_uuid UUID, target_month_start DATE)
RETURNS TABLE (
    user_id UUID,
    month_start DATE,
    feedback_count INTEGER,
    insights_count INTEGER,
    analytics_count INTEGER,
    reports_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := user_uuid;
    v_month_start DATE := target_month_start;
    v_feedback_count INTEGER := 0;
    v_insights_count INTEGER := 0;
    v_analytics_count INTEGER := 0;
    v_reports_count INTEGER := 0;
BEGIN
    -- Get actual counts from source tables for the month
    SELECT COUNT(*) INTO v_feedback_count
    FROM feedbacks 
    WHERE created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_insights_count
    FROM insights 
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_analytics_count
    FROM analytics_history 
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_reports_count
    FROM analytics_daily 
    WHERE user_id = v_user_id 
    AND date >= v_month_start;
    
    -- Insert or update usage counter
    INSERT INTO usage_counters (
        user_id, 
        month_start, 
        feedback_count, 
        insights_count, 
        analytics_count, 
        reports_count
    )
    VALUES (
        v_user_id, 
        v_month_start, 
        v_feedback_count, 
        v_insights_count, 
        v_analytics_count, 
        v_reports_count
    )
    ON CONFLICT (user_id, month_start) 
    DO UPDATE SET
        feedback_count = EXCLUDED.feedback_count,
        insights_count = EXCLUDED.insights_count,
        analytics_count = EXCLUDED.analytics_count,
        reports_count = EXCLUDED.reports_count,
        updated_at = NOW();
    
    RETURN QUERY
    SELECT 
        v_user_id,
        v_month_start,
        v_feedback_count,
        v_insights_count,
        v_analytics_count,
        v_reports_count;
END;
$$;
```

Wait for completion, then:
```sql
-- Create check_usage_limit function
CREATE OR REPLACE FUNCTION check_usage_limit(user_uuid UUID, feature_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := user_uuid;
    v_feature_type TEXT := feature_type;
    v_plan_type TEXT;
    v_current_count INTEGER := 0;
    v_limit INTEGER := 0;
    v_month_start DATE;
BEGIN
    v_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    
    SELECT plan_type INTO v_plan_type
    FROM subscriptions 
    WHERE user_id = v_user_id;
    
    IF v_plan_type IS NULL THEN
        v_plan_type := 'trial';
    END IF;
    
    CASE v_feature_type
        WHEN 'feedback' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM feedbacks 
            WHERE created_at >= v_month_start;
        WHEN 'insights' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM insights 
            WHERE user_id = v_user_id 
            AND created_at >= v_month_start;
        WHEN 'analytics' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM analytics_history 
            WHERE user_id = v_user_id 
            AND created_at >= v_month_start;
        WHEN 'reports' THEN
            SELECT COUNT(*) INTO v_current_count
            FROM analytics_daily 
            WHERE user_id = v_user_id 
            AND date >= v_month_start;
        ELSE
            RETURN FALSE;
    END CASE;
    
    CASE v_plan_type
        WHEN 'trial' THEN
            CASE v_feature_type
                WHEN 'feedback' THEN v_limit := 50;
                WHEN 'insights' THEN v_limit := 10;
                WHEN 'analytics' THEN v_limit := 10;
                WHEN 'reports' THEN v_limit := 5;
            END CASE;
        WHEN 'pro' THEN
            CASE v_feature_type
                WHEN 'feedback' THEN v_limit := 300;
                WHEN 'insights' THEN v_limit := 50;
                WHEN 'analytics' THEN v_limit := 100;
                WHEN 'reports' THEN v_limit := 20;
            END CASE;
        WHEN 'business' THEN
            RETURN TRUE;
    END CASE;
    
    RETURN v_current_count < v_limit;
END;
$$;
```

Wait for completion, then:
```sql
-- Create reset_monthly_usage function
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_month_start DATE;
    v_previous_month_start DATE;
BEGIN
    v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_previous_month_start := v_current_month_start - INTERVAL '1 month';
    
    PERFORM refresh_user_usage(user_id, v_current_month_start)
    FROM (
        SELECT DISTINCT user_id 
        FROM usage_counters 
        WHERE month_start = v_previous_month_start
    ) AS users;
    
    INSERT INTO usage_counters (user_id, month_start, feedback_count, insights_count, analytics_count, reports_count)
    SELECT 
        user_id,
        v_current_month_start,
        0, 0, 0, 0
    FROM (
        SELECT DISTINCT user_id 
        FROM usage_counters 
        WHERE month_start = v_previous_month_start
    ) AS users
    ON CONFLICT (user_id, month_start) DO NOTHING;
END;
$$;
```

### **Step 4: Create Indexes (One at a Time)**
```sql
-- Drop existing indexes first
DROP INDEX IF EXISTS idx_feedbacks_user_created;
DROP INDEX IF EXISTS idx_insights_user_created;
DROP INDEX IF EXISTS idx_analytics_user_created;
DROP INDEX IF EXISTS idx_reports_user_created;
DROP INDEX IF EXISTS idx_analytics_history_user_created;
DROP INDEX IF EXISTS idx_analytics_daily_user_date;
DROP INDEX IF EXISTS idx_feedbacks_created;
```

Wait for completion, then create indexes one by one:
```sql
CREATE INDEX IF NOT EXISTS idx_insights_user_created ON insights(user_id, created_at);
```

Wait, then:
```sql
CREATE INDEX IF NOT EXISTS idx_analytics_history_user_created ON analytics_history(user_id, created_at);
```

Wait, then:
```sql
CREATE INDEX IF NOT EXISTS idx_analytics_daily_user_date ON analytics_daily(user_id, date);
```

Wait, then:
```sql
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at);
```

### **Step 5: Grant Permissions**
```sql
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_limit(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_usage() TO service_role;
```

### **Step 6: Test the Functions**
```sql
-- Test with a real user ID from your auth.users table
SELECT * FROM refresh_user_usage('your-user-id-here', CURRENT_DATE);

-- Test usage limit checking
SELECT check_usage_limit('your-user-id-here', 'insights');
SELECT check_usage_limit('your-user-id-here', 'analytics');
```

## ⚠️ **Important Tips to Avoid Deadlocks**

1. **Run commands one at a time** - Don't run multiple SQL commands simultaneously
2. **Wait for completion** - Wait for each command to finish before running the next
3. **Use Supabase SQL Editor** - Run commands in the Supabase dashboard, not via scripts
4. **Check for errors** - If a command fails, fix the error before proceeding
5. **Avoid concurrent operations** - Don't run other database operations while deploying

## ✅ **Expected Results**

After completing all steps:
- ✅ All three functions created successfully
- ✅ Indexes created for performance
- ✅ Permissions granted correctly
- ✅ Functions can be called without errors
- ✅ Usage Overview component works in frontend

## 🎉 **Success!**

Your Usage Overview system will be deployed without deadlocks and will work correctly with your actual database structure!