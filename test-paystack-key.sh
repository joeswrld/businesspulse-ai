#!/bin/bash

echo "🔑 Testing Paystack Key Configuration"
echo "===================================="
echo ""

echo "✅ Checking .env.local file..."
if [ -f ".env.local" ]; then
    echo "   ✓ .env.local file exists"
    
    # Check if Paystack key is set
    if grep -q "VITE_PAYSTACK_PUBLIC_KEY" .env.local; then
        echo "   ✓ VITE_PAYSTACK_PUBLIC_KEY found in .env.local"
        
        # Extract the key value
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

echo "✅ Checking other environment variables..."
if grep -q "VITE_SUPABASE_URL" .env.local; then
    echo "   ✓ VITE_SUPABASE_URL found"
else
    echo "   ✗ VITE_SUPABASE_URL missing"
fi

if grep -q "VITE_SUPABASE_ANON_KEY" .env.local; then
    echo "   ✓ VITE_SUPABASE_ANON_KEY found"
else
    echo "   ✗ VITE_SUPABASE_ANON_KEY missing"
fi

echo ""

echo "✅ Checking PaystackPayment component..."
if grep -q "import.meta.env.VITE_PAYSTACK_PUBLIC_KEY" src/components/PaystackPayment.tsx; then
    echo "   ✓ Component uses correct environment variable name"
else
    echo "   ✗ Component still uses old environment variable name"
    echo "      Please update to use import.meta.env.VITE_PAYSTACK_PUBLIC_KEY"
fi

echo ""

echo "🚀 Next Steps:"
echo "=============="
echo ""

if [ -f ".env.local" ] && grep -q "VITE_PAYSTACK_PUBLIC_KEY" .env.local; then
    PAYSTACK_KEY=$(grep "VITE_PAYSTACK_PUBLIC_KEY" .env.local | cut -d'=' -f2)
    
    if [ "$PAYSTACK_KEY" != "your_paystack_public_key_here" ] && [ -n "$PAYSTACK_KEY" ]; then
        echo "✅ Configuration looks good!"
        echo "   1. Restart your development server"
        echo "   2. Test the payment flow"
        echo "   3. Check browser console for Paystack key loading"
    else
        echo "⚠️  Configuration needs updating:"
        echo "   1. Update VITE_PAYSTACK_PUBLIC_KEY in .env.local"
        echo "   2. Use your actual Paystack key from dashboard"
        echo "   3. Restart development server"
    fi
else
    echo "❌ Configuration incomplete:"
    echo "   1. Create .env.local file"
    echo "   2. Add VITE_PAYSTACK_PUBLIC_KEY with your key"
    echo "   3. Restart development server"
fi

echo ""
echo "🔍 To get your Paystack key:"
echo "   1. Go to https://dashboard.paystack.com/"
echo "   2. Settings → API Keys & Webhooks"
echo "   3. Copy your Public Key (pk_test_... or pk_live_...)"
echo ""

echo "✨ Test Complete!"