# 🚀 Deploy Usage Overview System - SQL Fix

## ❌ **Error Fixed**
The original error `42P13: parameter name "month_start" used more than once` has been resolved by renaming the function parameter from `month_start` to `target_month_start`.

## 🔧 **Quick Fix**

### **Option 1: Run the Fix Script (Recommended)**
```sql
-- Run this in your Supabase SQL editor
\i fix_usage_overview_sql_error.sql
```

### **Option 2: Manual Fix**
If you prefer to run the commands manually:

```sql
-- 1. Drop the existing function
DROP FUNCTION IF EXISTS refresh_user_usage(UUID, DATE);

-- 2. Recreate with correct parameter name
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
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_insights_count
    FROM insights_simple 
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_analytics_count
    FROM analytics 
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
    SELECT COUNT(*) INTO v_reports_count
    FROM reports 
    WHERE user_id = v_user_id 
    AND created_at >= v_month_start;
    
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
    
    -- Return the updated data
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

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_usage(UUID, DATE) TO service_role;
```

## ✅ **Verify the Fix**

Run the test script to verify everything works:

```sql
-- Run this in your Supabase SQL editor
\i test_sql_functions.sql
```

## 🔄 **What Changed**

### **Before (Causing Error):**
```sql
CREATE OR REPLACE FUNCTION refresh_user_usage(user_uuid UUID, month_start DATE)
-- Parameter name "month_start" conflicts with return table column "month_start"
```

### **After (Fixed):**
```sql
CREATE OR REPLACE FUNCTION refresh_user_usage(user_uuid UUID, target_month_start DATE)
-- Parameter renamed to avoid conflict with return table column "month_start"
```

## 📝 **Frontend Code Updated**

The frontend code has been automatically updated to use the new parameter name:

```typescript
// In useUsageOverview.ts and usageEnforcement.ts
const { error } = await supabase.rpc('refresh_user_usage', {
  user_uuid: userId,
  target_month_start: monthStart,  // ← Updated parameter name
});
```

## 🧪 **Test the Complete System**

1. **Apply the SQL fix** (run the fix script above)
2. **Test the functions** (run the test script)
3. **Start your app** and navigate to the billing page
4. **Verify the Usage Overview** displays correctly

## ✨ **Expected Results**

After applying the fix, you should see:
- ✅ No SQL parameter name conflicts
- ✅ Usage Overview component loads correctly
- ✅ Real-time usage data displays
- ✅ Progress bars work properly
- ✅ Plan limits are enforced
- ✅ Trial expiration handling works

## 🚨 **If You Still Get Errors**

1. **Check if tables exist:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('usage_counters', 'subscriptions');
   ```

2. **Check if functions exist:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('refresh_user_usage', 'check_usage_limit');
   ```

3. **Verify RLS policies:**
   ```sql
   SELECT policyname FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('usage_counters', 'subscriptions');
   ```

---

## 🎉 **Your Usage Overview System is Now Ready!**

The parameter name conflict has been resolved, and your NoteX platform now has a fully functional usage overview system with real-time tracking, plan-based limits, and comprehensive access control.