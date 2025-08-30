#!/bin/bash

echo "🔍 Diagnosing Paystack Edge Function Issue"
echo "=========================================="
echo ""

echo "✅ Checking Supabase CLI..."
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "Please install it first: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

echo "🔗 Checking project link status..."
if ! supabase status &> /dev/null; then
    echo "❌ Project not linked!"
    echo ""
    echo "Please link your project:"
    echo "  supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "You can find your project ref in your Supabase dashboard."
    exit 1
fi

echo "✅ Project is linked"
echo ""

echo "📋 Checking function status..."
supabase functions list

echo ""

echo "🔐 Checking environment variables..."
echo "Current secrets:"
supabase secrets list

echo ""

echo "🧪 Testing the function..."
echo "Attempting to call the verify-payment function..."

# Get the project URL from the status
PROJECT_URL=$(supabase status --output json | grep -o '"api": "[^"]*"' | cut -d'"' -f4)

if [ -z "$PROJECT_URL" ]; then
    echo "❌ Could not determine project URL"
    echo "Please check your project link: supabase status"
    exit 1
fi

echo "Project URL: $PROJECT_URL"
echo ""

# Test the function
echo "Testing function with sample data..."
RESPONSE=$(curl -s -X POST "$PROJECT_URL/functions/v1/verify-payment" \
  -H "Content-Type: application/json" \
  -d '{"reference":"test","plan":"pro","amount":3500000,"email":"test@example.com"}')

echo "Response received:"
echo "$RESPONSE"
echo ""

if [ -z "$RESPONSE" ]; then
    echo "❌ Function returned empty response (causes JSON error)"
    echo ""
    echo "🔧 Solutions:"
    echo "1. Deploy the function: supabase functions deploy verify-payment"
    echo "2. Check function logs: supabase functions logs verify-payment"
    echo "3. Verify environment variables are set"
else
    echo "✅ Function is responding (though may have validation errors)"
    echo ""
    echo "The response above shows the function is working."
    echo "If you see validation errors, that's expected for test data."
fi

echo ""
echo "🚀 Next Steps:"
echo "==============="
echo ""

echo "1. Deploy the function:"
echo "   supabase functions deploy verify-payment"
echo ""

echo "2. Set required environment variables:"
echo "   supabase secrets set SUPABASE_URL=$PROJECT_URL"
echo "   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
echo "   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key"
echo ""

echo "3. Check function logs:"
echo "   supabase functions logs verify-payment"
echo ""

echo "4. Test again:"
echo "   curl -X POST \"$PROJECT_URL/functions/v1/verify-payment\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"reference\":\"test\",\"plan\":\"pro\",\"amount\":3500000,\"email\":\"test@example.com\"}'"
echo ""

echo "✨ Diagnosis Complete!"