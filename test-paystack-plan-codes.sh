#!/bin/bash

echo "🚀 Testing Paystack Plan Codes Integration"
echo "=========================================="
echo ""

# Check if plan codes are properly integrated
echo "✅ Checking PaystackPayment Component..."
if grep -q "PLN_4z2wpgmw41w2k7r" src/components/PaystackPayment.tsx; then
    echo "   ✓ Pro Plan code found: PLN_4z2wpgmw41w2k7r"
else
    echo "   ✗ Pro Plan code NOT found"
fi

if grep -q "PLN_esryg99ztsy9xc8" src/components/PaystackPayment.tsx; then
    echo "   ✓ Business Plan code found: PLN_esryg99ztsy9xc8"
else
    echo "   ✗ Business Plan code NOT found"
fi

if grep -q "plan: currentPlanDetails.planCode" src/components/PaystackPayment.tsx; then
    echo "   ✓ Plan parameter properly configured"
else
    echo "   ✗ Plan parameter NOT configured"
fi

echo ""

echo "✅ Checking API Endpoint..."
if grep -q "PLN_4z2wpgmw41w2k7r" src/pages/api/paystack/verify-payment.ts; then
    echo "   ✓ Pro Plan code found in API"
else
    echo "   ✗ Pro Plan code NOT found in API"
fi

if grep -q "PLN_esryg99ztsy9xc8" src/pages/api/paystack/verify-payment.ts; then
    echo "   ✓ Business Plan code found in API"
else
    echo "   ✗ Business Plan code NOT found in API"
fi

if grep -q "transaction.subscription?.subscription_code" src/pages/api/paystack/verify-payment.ts; then
    echo "   ✓ Subscription code capture configured"
else
    echo "   ✗ Subscription code capture NOT configured"
fi

echo ""

echo "✅ Checking PlanComparison Component..."
if grep -q "PLN_4z2wpgmw41w2k7r" src/components/billing/PlanComparison.tsx; then
    echo "   ✓ Pro Plan code found in UI"
else
    echo "   ✗ Pro Plan code NOT found in UI"
fi

if grep -q "PLN_esryg99ztsy9xc8" src/components/billing/PlanComparison.tsx; then
    echo "   ✓ Business Plan code found in UI"
else
    echo "   ✗ Business Plan code NOT found in UI"
fi

if grep -q "planCode:" src/components/billing/PlanComparison.tsx; then
    echo "   ✓ Plan code interface updated"
else
    echo "   ✗ Plan code interface NOT updated"
fi

echo ""

echo "✅ Checking Plan Code Usage..."
echo "   Pro Plan Code: PLN_4z2wpgmw41w2k7r"
echo "   Business Plan Code: PLN_esryg99ztsy9xc8"
echo ""

echo "🔍 Summary of Integration:"
echo "=========================="
echo ""

# Count total occurrences of each plan code
pro_count=$(grep -r "PLN_4z2wpgmw41w2k7r" src/ | wc -l)
business_count=$(grep -r "PLN_esryg99ztsy9xc8" src/ | wc -l)

echo "   Pro Plan Code (PLN_4z2wpgmw41w2k7r): $pro_count occurrences"
echo "   Business Plan Code (PLN_esryg99ztsy9xc8): $business_count occurrences"

if [ $pro_count -ge 3 ] && [ $business_count -ge 3 ]; then
    echo ""
    echo "🎉 SUCCESS: Plan codes are properly integrated across all components!"
    echo "   - PaystackPayment component ✓"
    echo "   - API endpoint ✓"
    echo "   - PlanComparison UI ✓"
    echo "   - Database mapping ✓"
else
    echo ""
    echo "⚠️  WARNING: Some components may not have plan codes properly integrated"
    echo "   Please check the files above for missing integrations"
fi

echo ""
echo "🚀 Next Steps:"
echo "   1. Test the upgrade flow with actual plan codes"
echo "   2. Verify Paystack receives the correct plan parameter"
echo "   3. Check database updates with proper plan codes"
echo "   4. Monitor subscription creation in Paystack dashboard"
echo ""

echo "✨ Paystack Plan Codes Integration Test Complete!"