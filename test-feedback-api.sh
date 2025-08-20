#!/bin/bash

# Test Feedback API Endpoint
# This script tests the feedback API to ensure it's working correctly

echo "🧪 Testing NoteX Feedback API Endpoint"
echo "======================================"

# API endpoint URL
API_URL="https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/feedback-api"

echo "📍 API URL: $API_URL"
echo ""

# Test 1: Check if endpoint is accessible (should return 405 for GET)
echo "🔍 Test 1: Checking endpoint accessibility..."
GET_RESPONSE=$(curl -s -w "%{http_code}" "$API_URL")
HTTP_CODE="${GET_RESPONSE: -3}"
RESPONSE_BODY="${GET_RESPONSE%???}"

if [ "$HTTP_CODE" = "405" ]; then
    echo "✅ Endpoint is accessible (Method Not Allowed for GET is expected)"
else
    echo "❌ Endpoint returned unexpected status: $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
fi
echo ""

# Test 2: Test with valid data
echo "🔍 Test 2: Testing with valid feedback data..."
TEST_DATA="project_id=test-project-123&name=Test%20User&email=test@example.com&message=This%20is%20a%20test%20feedback"

POST_RESPONSE=$(curl -s -w "%{http_code}" -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "$TEST_DATA" \
    "$API_URL")

HTTP_CODE="${POST_RESPONSE: -3}"
RESPONSE_BODY="${POST_RESPONSE%???}"

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"
echo ""

# Test 3: Test with missing required fields
echo "🔍 Test 3: Testing with missing required fields..."
INVALID_DATA="name=Test%20User&email=test@example.com&message=Test%20message"

INVALID_RESPONSE=$(curl -s -w "%{http_code}" -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "$INVALID_DATA" \
    "$API_URL")

HTTP_CODE="${INVALID_RESPONSE: -3}"
RESPONSE_BODY="${INVALID_RESPONSE%???}"

echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"
echo ""

# Test 4: Test CORS headers
echo "🔍 Test 4: Testing CORS headers..."
CORS_RESPONSE=$(curl -s -I -X OPTIONS "$API_URL")
echo "CORS Headers:"
echo "$CORS_RESPONSE" | grep -E "(Access-Control|Content-Type)"
echo ""

echo "📋 Test Summary:"
echo "================="

if [ "$HTTP_CODE" = "405" ]; then
    echo "✅ Endpoint is accessible"
else
    echo "❌ Endpoint accessibility issue"
fi

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "500" ]; then
    echo "✅ API is responding to requests"
else
    echo "❌ API response issue"
fi

echo ""
echo "🔧 Troubleshooting Tips:"
echo "1. If endpoint returns 404: Deploy the function with 'supabase functions deploy feedback-api'"
echo "2. If endpoint returns 500: Check function logs with 'supabase functions logs feedback-api'"
echo "3. If CORS errors: Check browser console for detailed error messages"
echo "4. If database errors: Run the database setup script first"
echo ""
echo "📝 To view function logs:"
echo "supabase functions logs feedback-api --follow"