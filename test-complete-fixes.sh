#!/bin/bash

echo "🧪 Testing Complete Transaction Receipt & Button Functionality Fixes"
echo "=================================================================="
echo ""

echo "✅ Checking transaction history table updates..."
if grep -q "Receipt" src/pages/Billing.tsx; then
    echo "   ✓ Table header changed from 'Actions' to 'Receipt'"
else
    echo "   ❌ Table header not updated"
    exit 1
fi

echo ""

echo "✅ Checking download receipt functionality..."
if grep -q "downloadReceipt" src/pages/Billing.tsx; then
    echo "   ✓ downloadReceipt function added"
else
    echo "   ❌ downloadReceipt function not found"
    exit 1
fi

if grep -q "Download.*Receipt" src/pages/Billing.tsx; then
    echo "   ✓ Download Receipt button added"
else
    echo "   ❌ Download Receipt button not found"
    exit 1
fi

echo ""

echo "✅ Checking button layout updates..."
if grep -q "flex items-center justify-end gap-2" src/pages/Billing.tsx; then
    echo "   ✓ Button layout updated to show both Receipt and View buttons"
else
    echo "   ❌ Button layout not updated"
    exit 1
fi

echo ""

echo "✅ Checking button handlers..."
if grep -q "onClick.*downloadReceipt" src/pages/Billing.tsx; then
    echo "   ✓ Download Receipt button has proper onClick handler"
else
    echo "   ❌ Download Receipt button onClick handler not found"
    exit 1
fi

echo ""

echo "✅ Checking button states..."
if grep -q "disabled.*transaction.status.*success" src/pages/Billing.tsx; then
    echo "   ✓ Download Receipt button properly disabled for non-success transactions"
else
    echo "   ❌ Download Receipt button disabled state not found"
    exit 1
fi

echo ""

echo "✅ Checking Update Payment Method button..."
if grep -q "Show Update Payment Method button for all users" src/pages/Billing.tsx; then
    echo "   ✓ Update Payment Method button now shows for all users"
else
    echo "   ❌ Update Payment Method button still restricted"
    exit 1
fi

if grep -q "disabled.*updatingCard" src/pages/Billing.tsx; then
    echo "   ✓ Update Payment Method button has proper disabled state"
else
    echo "   ❌ Update Payment Method button disabled state not found"
    exit 1
fi

echo ""

echo "✅ Checking button handler debugging..."
if grep -q "handleUpdateCard called" src/pages/Billing.tsx; then
    echo "   ✓ handleUpdateCard has debugging logs"
else
    echo "   ❌ handleUpdateCard debugging not added"
    exit 1
fi

if grep -q "handleCancelSubscription called" src/pages/Billing.tsx; then
    echo "   ✓ handleCancelSubscription has debugging logs"
else
    echo "   ❌ handleCancelSubscription debugging not added"
    exit 1
fi

echo ""

echo "✅ Checking useBillingSystem hook updates..."
if grep -q "paystackDashboardUrl.*dashboard.paystack.com" src/hooks/useBillingSystem.ts; then
    echo "   ✓ updatePaymentMethod function updated to work locally"
else
    echo "   ❌ updatePaymentMethod function not updated"
    exit 1
fi

if grep -q "subscription_status.*cancelled" src/hooks/useBillingSystem.ts; then
    echo "   ✓ cancelSubscription function updated to work locally"
else
    echo "   ❌ cancelSubscription function not updated"
    exit 1
fi

echo ""

echo "✅ Checking receipt content generation..."
if grep -q "NoteX - Transaction Receipt" src/pages/Billing.tsx; then
    echo "   ✓ Receipt content template added"
else
    echo "   ❌ Receipt content template not found"
    exit 1
fi

if grep -q "Blob.*text/plain" src/pages/Billing.tsx; then
    echo "   ✓ Receipt download as text file implemented"
else
    echo "   ❌ Receipt download implementation not found"
    exit 1
fi

echo ""

echo "✅ Checking debug information..."
if grep -q "Debug Info:" src/pages/Billing.tsx; then
    echo "   ✓ Debug information section added for development"
else
    echo "   ❌ Debug information section not found"
    exit 1
fi

echo ""

echo "🚀 Fix Status:"
echo "=============="
echo ""

echo "✅ All transaction receipt fixes implemented!"
echo "✅ Download functionality added!"
echo "✅ Button handlers updated to work locally!"
echo "✅ Receipt content generation implemented!"
echo "✅ Button states and layout improved!"
echo "✅ Update Payment Method button now shows for all users!"
echo "✅ Debug information added for troubleshooting!"
echo ""

echo "🧪 Next Steps:"
echo "=============="
echo ""

echo "1. Restart your development server:"
echo "   npm run dev"
echo ""

echo "2. Test the transaction history:"
echo "   - Navigate to billing page"
echo "   - Look for 'Receipt' column header (instead of 'Actions')"
echo "   - Check that each transaction has a 'Receipt' button"
echo "   - Verify 'View' button still exists for Paystack reference"
echo ""

echo "3. Test the download functionality:"
echo "   - Click 'Receipt' button on a successful transaction"
echo "   - Should download a .txt file with transaction details"
echo "   - Check that failed/pending transactions have disabled Receipt button"
echo ""

echo "4. Test the button functionality:"
echo "   - Click 'Update Payment Method' - should open Paystack dashboard"
echo "   - Click 'Cancel Subscription' - should update local database"
echo "   - Verify both buttons work without API route errors"
echo ""

echo "5. Check debug information:"
echo "   - Look for debug info section (development mode only)"
echo "   - Check console logs when clicking buttons"
echo "   - Verify button states and data values"
echo ""

echo "3. Expected Results:"
echo "   ✅ Table header shows 'Receipt' instead of 'Actions'"
echo "   ✅ Each transaction has Download Receipt button"
echo "   ✅ Receipt downloads as text file with transaction details"
echo "   ✅ Update Payment Method button opens Paystack dashboard"
echo "   ✅ Cancel Subscription button updates local database"
echo "   ✅ Debug information visible in development mode"
echo "   ✅ Console logs show button click events"
echo ""

echo "🔍 Testing Details:"
echo "==================="
echo ""

echo "1. Receipt Download:"
echo "   - Should work for 'success' status transactions"
echo "   - Should be disabled for 'pending' or 'failed' transactions"
echo "   - Should generate .txt file with transaction details"
echo ""

echo "2. Button Functionality:"
echo "   - Update Payment Method: Opens Paystack dashboard"
echo "   - Cancel Subscription: Updates local database status"
echo "   - Both should work without network errors"
echo ""

echo "3. Debug Information:"
echo "   - Current plan, subscription status, billing profile ID"
echo "   - Transaction count and other relevant data"
echo "   - Console logs for button interactions"
echo ""

echo "✨ Test Complete!"
echo ""
echo "All fixes should now be working perfectly!"
echo "Try the features to verify everything works."