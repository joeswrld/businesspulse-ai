#!/bin/bash

echo "🔧 Testing Paystack Configuration & 400 Error Fix"
echo "================================================="
echo ""

echo "✅ Checking environment variables..."
if [ -f ".env.local" ]; then
    echo "   ✓ .env.local file exists"
    
    # Check Paystack key
    if grep -q "VITE_PAYSTACK_PUBLIC_KEY" .env.local; then
        PAYSTACK_KEY=$(grep "VITE_PAYSTACK_PUBLIC_KEY" .env.local | cut -d'=' -f2)
        
        if [ "$PAYSTACK_KEY" = "your_paystack_public_key_here" ] || [ -z "$PAYSTACK_KEY" ]; then
            echo "   ⚠️  WARNING: Paystack key is still placeholder or empty"
            echo "      Current value: $PAYSTACK_KEY"
            echo "      Please update with your actual Paystack key"
        else
            echo "   ✓ Paystack key is set: ${PAYSTACK_KEY:0:20}..."
            
            # Check key format
            if [[ $PAYSTACK_KEY == pk_test_* ]]; then
                echo "   ✓ Key format: Test mode (pk_test_...)"
            elif [[ $PAYSTACK_KEY == pk_live_* ]]; then
                echo "   ✓ Key format: Live mode (pk_live_...)"
            else
                echo "   ⚠️  WARNING: Key format doesn't match expected pattern"
                echo "      Expected: pk_test_... or pk_live_..."
                echo "      Found: ${PAYSTACK_KEY:0:10}..."
            fi
        fi
    else
        echo "   ✗ VITE_PAYSTACK_PUBLIC_KEY not found in .env.local"
    fi
else
    echo "   ✗ .env.local file does not exist"
    echo "      Please create it with your Paystack configuration"
fi

echo ""

echo "✅ Checking PaystackPayment component..."
if grep -q "plan: currentPlanDetails.planCode" src/components/PaystackPayment.tsx; then
    echo "   ❌ ISSUE: Plan parameter still exists (will cause 400 error)"
    echo "      This needs to be removed from the Paystack config"
else
    echo "   ✓ Plan parameter removed from Paystack config"
fi

if grep -q "plan parameter is not supported in inline checkout" src/components/PaystackPayment.tsx; then
    echo "   ✓ Comment added explaining plan parameter removal"
else
    echo "   ⚠️  WARNING: No comment explaining plan parameter removal"
fi

if grep -q "Validate configuration before sending to Paystack" src/components/PaystackPayment.tsx; then
    echo "   ✓ Configuration validation added"
else
    echo "   ✗ Configuration validation not found"
fi

echo ""

echo "✅ Checking for configuration validation..."
if grep -q "VITE_PAYSTACK_PUBLIC_KEY.*pk_test_..." src/components/PaystackPayment.tsx; then
    echo "   ✓ Public key validation check exists"
else
    echo "   ✗ Public key validation check not found"
fi

if grep -q "Valid user email is required" src/components/PaystackPayment.tsx; then
    echo "   ✓ Email validation check exists"
else
    echo "   ✗ Email validation check not found"
fi

if grep -q "Invalid payment amount" src/components/PaystackPayment.tsx; then
    echo "   ✓ Amount validation check exists"
else
    echo "   ✗ Amount validation check not found"
fi

echo ""

echo "✅ Checking error logging improvements..."
if grep -q "key: config.key.substring" src/components/PaystackPayment.tsx; then
    echo "   ✓ Secure key logging implemented (shows partial key)"
else
    echo "   ✗ Secure key logging not implemented"
fi

echo ""

echo "🚀 Fix Status Summary:"
echo "======================"
echo ""

# Count the issues found
issues=0

if grep -q "plan: currentPlanDetails.planCode" src/components/PaystackPayment.tsx; then
    echo "❌ Issue 1: Plan parameter still exists (will cause 400 error)"
    issues=$((issues + 1))
fi

if [ ! -f ".env.local" ]; then
    echo "❌ Issue 2: .env.local file missing"
    issues=$((issues + 1))
elif grep -q "VITE_PAYSTACK_PUBLIC_KEY" .env.local; then
    PAYSTACK_KEY=$(grep "VITE_PAYSTACK_PUBLIC_KEY" .env.local | cut -d'=' -f2)
    if [ "$PAYSTACK_KEY" = "your_paystack_public_key_here" ] || [ -z "$PAYSTACK_KEY" ]; then
        echo "❌ Issue 3: Paystack key not configured"
        issues=$((issues + 1))
    fi
fi

if ! grep -q "Validate configuration before sending to Paystack" src/components/PaystackPayment.tsx; then
    echo "❌ Issue 4: Configuration validation not implemented"
    issues=$((issues + 1))
fi

if [ $issues -eq 0 ]; then
    echo "🎉 SUCCESS: Paystack 400 error fix is properly implemented!"
    echo ""
    echo "Next steps:"
    echo "1. Ensure your actual Paystack key is in .env.local"
    echo "2. Restart development server"
    echo "3. Test payment flow to verify no 400 errors"
else
    echo "⚠️  WARNING: $issues issue(s) found that need attention"
    echo ""
    echo "To complete the fix:"
    if grep -q "plan: currentPlanDetails.planCode" src/components/PaystackPayment.tsx; then
        echo "1. Remove plan parameter from Paystack config"
    fi
    if [ ! -f ".env.local" ]; then
        echo "2. Create .env.local with your Paystack key"
    elif grep -q "VITE_PAYSTACK_PUBLIC_KEY" .env.local; then
        PAYSTACK_KEY=$(grep "VITE_PAYSTACK_PUBLIC_KEY" .env.local | cut -d'=' -f2)
        if [ "$PAYSTACK_KEY" = "your_paystack_public_key_here" ] || [ -z "$PAYSTACK_KEY" ]; then
            echo "2. Update VITE_PAYSTACK_PUBLIC_KEY with your actual key"
        fi
    fi
    if ! grep -q "Validate configuration before sending to Paystack" src/components/PaystackPayment.tsx; then
        echo "3. Implement configuration validation"
    fi
fi

echo ""
echo "🔍 Manual Verification Required:"
echo "================================"
echo ""

echo "1. Environment Variables:"
echo "   - Check .env.local has actual Paystack key"
echo "   - Restart development server"
echo "   - Verify key loads in browser console"
echo ""

echo "2. Payment Flow Testing:"
echo "   - Click upgrade button"
echo "   - Check console for configuration validation"
echo "   - Verify Paystack popup opens without 400 errors"
echo ""

echo "3. Console Logs:"
echo "   - Should see: 'Setting up Paystack with config:'"
echo "   - Should see: 'Paystack handler created: Inline'"
echo "   - Should NOT see: 'Failed to load resource: 400'"
echo ""

echo "✨ Test Complete!"