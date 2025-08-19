#!/bin/bash

# Deploy Paystack Integration Functions
echo "🚀 Deploying Paystack Integration Functions..."

# Set environment variables (you'll need to set these in your Supabase dashboard)
echo "📝 Setting up environment variables..."

# Deploy create-subscription function
echo "📦 Deploying create-subscription function..."
supabase functions deploy create-subscription --project-ref xjbrqeqizpoqdjkiyqzt

# Deploy paystack-webhook function
echo "📦 Deploying paystack-webhook function..."
supabase functions deploy paystack-webhook --project-ref xjbrqeqizpoqdjkiyqzt

# Deploy manage-subscription function
echo "📦 Deploying manage-subscription function..."
supabase functions deploy manage-subscription --project-ref xjbrqeqizpoqdjkiyqzt

echo "✅ Paystack functions deployed successfully!"

echo ""
echo "🔧 Next steps:"
echo "1. Set PAYSTACK_SECRET_KEY in your Supabase dashboard"
echo "2. Configure Paystack webhook URL: https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/paystack-webhook"
echo "3. Update your frontend API calls to use the new function URLs"
echo ""
echo "🌐 Function URLs:"
echo "- Create Subscription: https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/create-subscription"
echo "- Paystack Webhook: https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/paystack-webhook"
echo "- Manage Subscription: https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/manage-subscription"