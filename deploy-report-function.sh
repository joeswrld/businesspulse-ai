#!/bin/bash

echo "🚀 Deploying AI Report Generation Edge Function..."

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    echo "Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Deploy the function
echo "📦 Deploying generateReport function..."
supabase functions deploy generateReport

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "🧪 Testing the report generation function..."
    echo ""

    echo "📊 Testing Report Generation:"
    curl -X POST "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/generateReport" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84" \
        -d '{
            "user_id": "test-user-123",
            "insights_ids": ["insight-1", "insight-2", "insight-3"],
            "title": "Test Report",
            "description": "Test report generation"
        }' \
        | jq .

    echo ""
    echo "🎉 Report generation function is ready!"
    echo "Visit: http://localhost:5173/reports"
    echo ""
    echo "✨ Features:"
    echo "  - AI-powered report generation using Gemini"
    echo "  - Executive summaries and key insights"
    echo "  - Trend analysis and recommended actions"
    echo "  - Sentiment breakdown and theme extraction"
    echo "  - Professional, actionable business reports"
    echo "  - Real-time status updates"
    echo "  - Export functionality"
else
    echo "❌ Function deployment failed!"
    exit 1
fi