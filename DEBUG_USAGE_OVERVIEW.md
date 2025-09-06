# 🔍 Debug Usage Overview - Show Real User Plan

## 🎯 **Goal**
Make the Usage Overview section show the **correct plan** of the user instead of mock data.

## 🔍 **Current Issue**
The Usage Overview might be showing mock data or not displaying the correct user plan.

## 🚀 **Step-by-Step Fix**

### **Step 1: Check Database Setup**
Run this in Supabase SQL Editor to check if everything is set up correctly:

```sql
-- Check if subscriptions table exists and has data
\i test_subscription_data.sql
```

### **Step 2: Create Test Subscription**
If no subscriptions exist, create one:

```sql
-- Create a test subscription for the first user
\i create_test_subscription.sql
```

### **Step 3: Check Frontend Logs**
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Navigate to the Billing page
4. Look for these log messages:
   - `"Loading usage overview data for user: [user-id]"`
   - `"Fetching subscription for user: [user-id]"`
   - `"✓ Found subscription: [subscription-data]"`
   - `"Calculated usage data: [usage-data]"`

### **Step 4: Verify Data Flow**
The data should flow like this:
1. **User ID** → `useUsageOverview(userId)`
2. **Fetch Subscription** → `subscriptions` table
3. **Calculate Usage** → Real usage data from tables
4. **Display Plan** → Real plan info in UI

## 🔧 **What the Fix Does**

### **Enhanced Error Handling**
- ✅ Logs when fetching subscription data
- ✅ Creates default trial subscription if none exists
- ✅ Shows detailed error messages
- ✅ Logs all data fetching steps

### **Automatic Subscription Creation**
- ✅ If no subscription exists, creates a trial subscription
- ✅ Sets proper trial dates (8 days from now)
- ✅ Ensures user always has a plan to display

### **Better Debugging**
- ✅ Console logs show exactly what data is being fetched
- ✅ Easy to identify where the issue is occurring
- ✅ Clear error messages for troubleshooting

## 🧪 **Testing the Fix**

### **Test 1: Check Console Logs**
1. Open browser DevTools
2. Go to Billing page
3. Look for these logs:
   ```
   Loading usage overview data for user: [user-id]
   Fetching subscription for user: [user-id]
   ✓ Found subscription: {plan_type: "trial", ...}
   Calculated usage data: {subscription: {...}, usage: {...}}
   ```

### **Test 2: Check Database**
Run this query to see the subscription:
```sql
SELECT 
    s.user_id,
    u.email,
    s.plan_type,
    s.trial_start,
    s.trial_end,
    s.is_active
FROM subscriptions s
LEFT JOIN auth.users u ON s.user_id = u.id
WHERE s.user_id = 'your-user-id-here';
```

### **Test 3: Check UI**
The Usage Overview should show:
- ✅ **Current Plan**: "Free Trial" (or actual plan)
- ✅ **Trial ends**: Actual trial end date
- ✅ **Usage counts**: Real data from database
- ✅ **Limits**: Correct limits for the plan

## 🎯 **Expected Results**

After applying the fix:

1. **Real Plan Display**: Shows actual user plan from database
2. **Correct Trial Dates**: Shows real trial start/end dates
3. **Live Usage Data**: Shows real usage counts from tables
4. **Proper Limits**: Shows correct limits for the user's plan
5. **Console Logs**: Clear debugging information

## 🚨 **Common Issues & Solutions**

### **Issue 1: "No subscription found"**
**Solution**: The fix automatically creates a trial subscription

### **Issue 2: "Table doesn't exist"**
**Solution**: Run the complete fix script:
```sql
\i complete_usage_counters_fix.sql
```

### **Issue 3: "Permission denied"**
**Solution**: Check RLS policies are set up correctly

### **Issue 4: Mock data still showing**
**Solution**: Check console logs to see what data is being fetched

## 🎉 **Success Indicators**

You'll know it's working when:
- ✅ Console shows real subscription data
- ✅ UI displays actual plan information
- ✅ Trial dates are real (not hardcoded)
- ✅ Usage counts reflect real database data
- ✅ No more mock data in the interface

The Usage Overview will now show the **correct plan** of the user! 🎉