#!/bin/bash

# Test the Insights Analysis Edge Function
echo "🧪 Testing Insights Analysis Edge Function..."

# Function URL
FUNCTION_URL="https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/insightsAnalysis"

# Test data
TEST_DATA='{
  "data": "The new dashboard is amazing! I love how fast it loads and the clean design. This is exactly what I was looking for."
}'

echo "📤 Sending test request..."
echo "Data: $TEST_DATA"
echo ""

# Make the request
RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA")

echo "📥 Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "✅ Test completed!"
echo ""
echo "If you see a JSON response with 'summary' and 'sentiment', the function is working!"
echo "If you see an error, check that:"
echo "1. The function is deployed"
echo "2. GEMINI_API_KEY is set in Supabase"
echo "3. The function URL is correct"