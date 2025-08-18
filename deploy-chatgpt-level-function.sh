#!/bin/bash

echo "🚀 Deploying ChatGPT-Level Insights Analysis Edge Function..."

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
    echo "🧪 Testing the ChatGPT-level function..."
    echo ""
    
    echo "📊 Testing Positive Feedback:"
    curl -X POST "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84" \
        -d '{"data": "The new dashboard is amazing! I love how fast it loads and the interface is so intuitive. However, I noticed some bugs in the mobile version that need fixing. The search feature could be improved, and I would like to see dark mode support. Overall, this is a huge improvement over the old system!"}' \
        | jq .
    
    echo ""
    echo "📊 Testing Negative Feedback:"
    curl -X POST "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84" \
        -d '{"data": "This app is absolutely terrible. It crashes every time I try to upload a file, the customer support is non-existent, and I have been waiting for a refund for weeks. I am switching to a competitor because this is the worst app I have ever used."}' \
        | jq .
    
    echo ""
    echo "🎉 ChatGPT-level function is ready!"
    echo "Visit: http://localhost:5173/insights"
    echo ""
    echo "🚀 Enhanced Features:"
    echo "  - Senior product analyst persona with 10+ years experience"
    echo "  - Step-by-step analysis process (5 detailed steps)"
    echo "  - Few-shot examples for consistent quality"
    echo "  - Business impact assessment and prioritization"
    echo "  - Strategic recommendations with effort vs. impact analysis"
    echo "  - Executive-level summaries for stakeholders"
else
    echo "❌ Function deployment failed!"
    exit 1
fi