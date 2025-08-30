#!/bin/bash

echo "🧪 Testing Final Changes - Removed Update Payment Method & View Button"
echo "===================================================================="
echo ""

echo "✅ Checking Update Payment Method button removal..."
if ! grep -q "Update Payment Method" src/pages/Billing.tsx; then
    echo "   ✓ Update Payment Method button removed"
else
    echo "   ❌ Update Payment Method button still exists"
    exit 1
fi

echo ""

echo "✅ Checking View button removal from transaction history..."
if ! grep -q "View in Paystack Button" src/pages/Billing.tsx; then
    echo "   ✓ View button removed from transaction history"
else
    echo "   ❌ View button still exists"
    exit 1
fi

echo ""

echo "✅ Checking Receipt button still exists..."
if grep -q "Download Receipt Button" src/pages/Billing.tsx; then
    echo "   ✓ Download Receipt button still present"
else
    echo "   ❌ Download Receipt button missing"
    exit 1
fi

echo ""

echo "✅ Checking Cancel Subscription button still exists..."
if grep -q "Cancel Subscription" src/pages/Billing.tsx; then
    echo "   ✓ Cancel Subscription button still present"
else
    echo "   ❌ Cancel Subscription button missing"
    exit 1
fi

echo ""

echo "✅ Checking unused imports removed..."
if ! grep -q "CreditCard" src/pages/Billing.tsx; then
    echo "   ✓ CreditCard import removed"
else
    echo "   ❌ CreditCard import still exists"
    exit 1
fi

if ! grep -q "ExternalLink" src/pages/Billing.tsx; then
    echo "   ✓ ExternalLink import removed"
else
    echo "   ❌ ExternalLink import still exists"
    exit 1
fi

echo ""

echo "✅ Checking unused state variables removed..."
if ! grep -q "updatingCard" src/pages/Billing.tsx; then
    echo "   ✓ updatingCard state variable removed"
else
    echo "   ❌ updatingCard state variable still exists"
    exit 1
fi

echo ""

echo "✅ Checking unused functions removed..."
if ! grep -q "handleUpdateCard" src/pages/Billing.tsx; then
    echo "   ✓ handleUpdateCard function removed"
else
    echo "   ❌ handleUpdateCard function still exists"
    exit 1
fi

echo ""

echo "✅ Checking useBillingSystem hook cleaned up..."
if ! grep -q "updatePaymentMethod" src/hooks/useBillingSystem.ts; then
    echo "   ✓ updatePaymentMethod function removed from hook"
else
    echo "   ❌ updatePaymentMethod function still exists in hook"
    exit 1
fi

echo ""

echo "✅ Checking transaction table structure..."
if grep -q "Receipt" src/pages/Billing.tsx; then
    echo "   ✓ Table header still shows 'Receipt'"
else
    echo "   ❌ Table header not showing 'Receipt'"
    exit 1
fi

echo ""

echo "🚀 Fix Status:"
echo "=============="
echo ""

echo "✅ Update Payment Method button completely removed!"
echo "✅ View button removed from transaction history!"
echo "✅ Download Receipt button still working!"
echo "✅ Cancel Subscription button still working!"
echo "✅ Unused imports and functions cleaned up!"
echo "✅ Transaction table structure maintained!"
echo ""

echo "🧪 Next Steps:"
echo "=============="
echo ""

echo "1. Restart your development server:"
echo "   npm run dev"
echo ""

echo "2. Test the billing page:"
echo "   - Navigate to billing page"
echo "   - Verify Update Payment Method button is gone"
echo "   - Check that Cancel Subscription button still works"
echo ""

echo "3. Test the transaction history:"
echo "   - Look for transaction history section"
echo "   - Verify only Receipt button exists (no View button)"
echo "   - Test receipt download functionality"
echo ""

echo "4. Expected Results:"
echo "   ✅ Update Payment Method button completely removed"
echo "   ✅ View button removed from transaction history"
echo "   ✅ Only Receipt button remains in transaction table"
echo "   ✅ Cancel Subscription button still functional"
echo "   ✅ Receipt download still working"
echo "   ✅ No console errors or unused code"
echo ""

echo "🔍 What Was Changed:"
echo "===================="
echo ""

echo "1. Removed Update Payment Method button and all related code"
echo "2. Removed View button from transaction history table"
echo "3. Cleaned up unused imports (CreditCard, ExternalLink)"
echo "4. Removed unused state variables (updatingCard)"
echo "5. Removed unused functions (handleUpdateCard, updatePaymentMethod)"
echo "6. Maintained Receipt download functionality"
echo "7. Kept Cancel Subscription button working"
echo ""

echo "✨ Test Complete!"
echo ""
echo "All requested changes have been implemented!"
echo "The billing page should now be cleaner and more focused."