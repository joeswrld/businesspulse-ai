#!/bin/bash

# Deploy Insights Analysis Edge Function to Supabase
echo "🚀 Deploying Insights Analysis Edge Function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   curl -fsSL https://supabase.com/install.sh | sh"
    exit 1
fi

# Deploy the function
echo "📦 Deploying insightsAnalysis function..."
supabase functions deploy insightsAnalysis

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "🔗 Your function URL:"
    echo "   https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis"
    echo ""
    echo "⚙️  Don't forget to set your GEMINI_API_KEY in Supabase Dashboard:"
    echo "   1. Go to Settings > Edge Functions"
    echo "   2. Add: GEMINI_API_KEY=your_api_key_here"
    echo ""
    echo "🎯 Test the function:"
    echo "   curl -X POST https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"data\": \"The new dashboard is amazing!\"}'"
else
    echo "❌ Deployment failed. Please check your Supabase configuration."
    exit 1
fi