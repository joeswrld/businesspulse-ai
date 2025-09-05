#!/bin/bash

echo "🔧 Fixing Payment Verification Issues..."
echo "========================================"

# Check if we're in the right directory
if [ ! -f "supabase/functions/verify-payment/index.ts" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Found Edge Function file"

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Deploy the Edge Function
echo ""
echo "🚀 Deploying Edge Function..."
supabase functions deploy verify-payment

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Failed to deploy Edge Function"
    exit 1
fi

# Check environment variables
echo ""
echo "🔍 Checking environment variables..."

if [ -f ".env.local" ]; then
    echo "✅ .env.local file found"
    
    if grep -q "VITE_SUPABASE_URL" .env.local && ! grep -q "your_supabase_url" .env.local; then
        echo "✅ VITE_SUPABASE_URL is configured"
    else
        echo "❌ VITE_SUPABASE_URL not properly configured"
    fi
    
    if grep -q "VITE_PAYSTACK_PUBLIC_KEY" .env.local && ! grep -q "pk_test_..." .env.local; then
        echo "✅ VITE_PAYSTACK_PUBLIC_KEY is configured"
    else
        echo "❌ VITE_PAYSTACK_PUBLIC_KEY not properly configured"
    fi
else
    echo "⚠️  .env.local file not found. Please create it with:"
    echo "   VITE_SUPABASE_URL=your_supabase_url"
    echo "   VITE_SUPABASE_ANON_KEY=your_anon_key"
    echo "   VITE_PAYSTACK_PUBLIC_KEY=your_paystack_key"
fi

echo ""
echo "🎉 Payment verification fix complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Restart your development server"
echo "   2. Try making a payment"
echo "   3. Check browser console for detailed error messages"
echo "   4. If issues persist, check Supabase logs: supabase functions logs verify-payment"
echo ""
echo "✨ The payment verification should now work with detailed error messages!"