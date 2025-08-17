#!/bin/bash

# Test Gemini API directly with curl
# This script tests if your Gemini API key is working correctly

echo "🧪 Testing Gemini API directly..."

# Check if GEMINI_API_KEY is set
if [ -z "$GEMINI_API_KEY" ]; then
    echo "❌ GEMINI_API_KEY environment variable not set"
    echo "Please set it: export GEMINI_API_KEY=your_api_key_here"
    exit 1
fi

echo "🔑 Using Gemini API key: ${GEMINI_API_KEY:0:10}..."

# Test the API with a simple request
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" \
  -H 'Content-Type: application/json' \
  -H "X-goog-api-key: $GEMINI_API_KEY" \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }' | jq '.'

echo ""
echo "✅ If you see a JSON response above, your Gemini API key is working!"
echo "❌ If you see an error, check your API key and try again."