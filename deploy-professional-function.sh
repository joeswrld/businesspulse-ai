#!/bin/bash

echo "🚀 Deploying Professional Insights Analysis Edge Function..."

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    echo "Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Deploy the function
echo "📦 Deploying function..."
supabase functions deploy insightsAnalysis

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "🧪 Testing the professional function..."
    echo ""
    
    # Test the function
    curl -X POST "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84" \
        -d '{"data": "The new dashboard is amazing! I love how fast it loads and the interface is so intuitive. However, I noticed some bugs in the mobile version that need fixing. The search feature could be improved, and I would like to see dark mode support. Overall, this is a huge improvement over the old system!"}' \
        | jq .
    
    echo ""
    echo "🎉 Professional function is ready!"
    echo "Visit: http://localhost:5173/insights"
    echo ""
    echo "📊 Expected Output Structure:"
    echo "  - summary: Professional analysis summary"
    echo "  - sentiment: positive/negative/neutral"
    echo "  - key_themes: Array of identified themes"
    echo "  - suggested_actions: Array of actionable recommendations"
else
    echo "❌ Function deployment failed!"
    exit 1
fi