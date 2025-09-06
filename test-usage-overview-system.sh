#!/bin/bash

echo "🧪 Testing Usage Overview System..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "src/components/billing/UsageOverview.tsx" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Found UsageOverview component"

echo ""
echo "📊 Testing database functions..."
echo "Please run the following SQL in your Supabase SQL Editor to test the functions:"
echo ""
echo "--- COPY THIS SQL INTO SUPABASE SQL EDITOR ---"
cat << 'EOF'
-- Test 1: Test refresh_usage function
SELECT 'Testing refresh_usage function...' as test_name;
SELECT * FROM refresh_usage(auth.uid());

-- Test 2: Test check_usage_limit function
SELECT 'Testing check_usage_limit function...' as test_name;
SELECT * FROM check_usage_limit(auth.uid());

-- Test 3: Test get_user_usage_summary function
SELECT 'Testing get_user_usage_summary function...' as test_name;
SELECT * FROM get_user_usage_summary(auth.uid());

-- Test 4: Test increment_usage_counter function
SELECT 'Testing increment_usage_counter function...' as test_name;
SELECT increment_usage_counter(auth.uid(), 'feedback') as feedback_incremented;
SELECT increment_usage_counter(auth.uid(), 'insights') as insights_incremented;
SELECT increment_usage_counter(auth.uid(), 'analytics') as analytics_incremented;
SELECT increment_usage_counter(auth.uid(), 'reports') as reports_incremented;

-- Test 5: Verify usage data after increment
SELECT 'Verifying usage data after increment...' as test_name;
SELECT * FROM get_user_usage_summary(auth.uid());

-- Test 6: Test monthly reset (simulate different month)
SELECT 'Testing monthly reset logic...' as test_name;
-- This would normally happen automatically, but we can test the logic
UPDATE usage_counters 
SET month_start = '2024-01-01'::DATE 
WHERE user_id = auth.uid();

-- Now call refresh_usage to see if it resets
SELECT * FROM refresh_usage(auth.uid());

-- Test 7: Test plan limits enforcement
SELECT 'Testing plan limits enforcement...' as test_name;
-- Check current limits
SELECT * FROM check_usage_limit(auth.uid());

-- Try to exceed limits (should fail)
SELECT 'Attempting to exceed limits...' as test_name;
-- This should return false for free users after reaching limits
SELECT increment_usage_counter(auth.uid(), 'feedback') as can_increment_more;

-- Test 8: Clean up test data
SELECT 'Cleaning up test data...' as test_name;
-- Reset usage counters for clean state
UPDATE usage_counters 
SET 
    feedback_count = 0,
    insights_count = 0,
    analytics_count = 0,
    reports_count = 0,
    month_start = DATE_TRUNC('month', CURRENT_DATE)::DATE,
    updated_at = NOW()
WHERE user_id = auth.uid();

SELECT 'All tests completed!' as result;
EOF
echo ""
echo "--- END OF SQL ---"

echo ""
echo "🎯 Frontend Testing Steps:"
echo "1. Go to your billing page"
echo "2. Check that usage data loads correctly"
echo "3. Verify the refresh button works"
echo "4. Check that plan limits are displayed correctly"
echo "5. Test the auto-refresh every 30 seconds"
echo "6. Verify trial expiration logic"
echo "7. Test upgrade buttons"

echo ""
echo "🔧 Expected Results:"
echo "• Free Plan: 50 feedback, 10 insights, 10 analytics, 5 reports"
echo "• Pro Plan: 300 feedback, 50 insights, 100 analytics, 20 reports"
echo "• Business Plan: Unlimited for all features"
echo "• Monthly auto-reset should work"
echo "• Usage enforcement should prevent exceeding limits"
echo "• Real-time updates every 30 seconds"

echo ""
echo "📋 Manual Verification Checklist:"
echo "□ Database functions created successfully"
echo "□ UsageOverview component loads without errors"
echo "□ Usage data displays correctly"
echo "□ Plan limits are enforced"
echo "□ Monthly reset works"
echo "□ Auto-refresh works"
echo "□ Trial expiration logic works"
echo "□ Upgrade buttons work"

echo ""
echo "✨ Usage Overview System Test Complete!"
echo ""
echo "If any tests fail, check:"
echo "1. Database functions are created correctly"
echo "2. User has proper permissions"
echo "3. RLS policies are set up correctly"
echo "4. Frontend is using the correct function names"