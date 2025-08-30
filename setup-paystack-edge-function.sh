#!/bin/bash

echo "🚀 Setting up Paystack Edge Function for Payment Verification"
echo "============================================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install Supabase CLI first:"
    echo "  npm install -g supabase"
    echo "  # OR"
    echo "  brew install supabase/tap/supabase"
    echo ""
    echo "After installation, run this script again."
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "⚠️  Not in a Supabase project directory"
    echo ""
    echo "Initializing Supabase project..."
    supabase init
    echo ""
fi

# Check if verify-payment function exists
if [ ! -d "supabase/functions/verify-payment" ]; then
    echo "❌ verify-payment function not found!"
    echo "Please ensure the Edge Function was created correctly."
    exit 1
fi

echo "✅ verify-payment function found"
echo ""

# Check if project is linked
echo "🔗 Checking project link status..."
if ! supabase status &> /dev/null; then
    echo "⚠️  Project not linked"
    echo ""
    echo "Please link your Supabase project:"
    echo "  supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "You can find your project ref in your Supabase dashboard."
    echo ""
    read -p "Enter your project ref (or press Enter to skip): " PROJECT_REF
    
    if [ ! -z "$PROJECT_REF" ]; then
        echo "Linking project..."
        supabase link --project-ref "$PROJECT_REF"
        echo ""
    else
        echo "Skipping project link. You can do this manually later."
        echo ""
    fi
else
    echo "✅ Project is linked"
    echo ""
fi

# Deploy the function
echo "🚀 Deploying verify-payment function..."
supabase functions deploy verify-payment

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
else
    echo "❌ Function deployment failed!"
    echo "Please check the error messages above."
    exit 1
fi

echo ""

# Check function status
echo "📋 Checking function status..."
supabase functions list

echo ""

# Set environment variables
echo "🔐 Setting environment variables..."
echo ""
echo "You need to set these environment variables for the function to work:"
echo ""

echo "1. SUPABASE_URL:"
echo "   supabase secrets set SUPABASE_URL=https://your-project.supabase.co"
echo ""

echo "2. SUPABASE_SERVICE_ROLE_KEY:"
echo "   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
echo ""

echo "3. PAYSTACK_SECRET_KEY:"
echo "   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key"
echo ""

echo "📝 How to get these values:"
echo ""

echo "SUPABASE_URL:"
echo "  - Go to your Supabase dashboard"
echo "  - Copy the URL from the project settings"
echo ""

echo "SUPABASE_SERVICE_ROLE_KEY:"
echo "  - Go to your Supabase dashboard"
echo "  - Settings → API"
echo "  - Copy the 'service_role' key (keep this secret!)"
echo ""

echo "PAYSTACK_SECRET_KEY:"
echo "  - Go to your Paystack dashboard"
echo "  - Settings → API Keys & Webhooks"
echo "  - Copy the 'Secret Key' (starts with sk_test_ or sk_live_)"
echo ""

echo "🚀 After setting the secrets, test the function:"
echo ""

echo "1. Test locally:"
echo "   supabase functions serve verify-payment"
echo ""

echo "2. Test deployed function:"
echo "   curl -X POST https://your-project.supabase.co/functions/v1/verify-payment \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"reference\":\"test\",\"plan\":\"pro\",\"amount\":3500000,\"email\":\"test@example.com\"}'"
echo ""

echo "3. Check function logs:"
echo "   supabase functions logs verify-payment"
echo ""

echo "✨ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Set the environment variables using the commands above"
echo "2. Test the function to ensure it works"
echo "3. Try the payment flow in your app"
echo ""

echo "🔍 If you encounter issues:"
echo "- Check function logs: supabase functions logs verify-payment"
echo "- Verify environment variables: supabase secrets list"
echo "- Test function locally: supabase functions serve verify-payment"
echo ""