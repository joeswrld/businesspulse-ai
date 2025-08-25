#!/bin/bash

# Deploy Check Usage Function
# This script deploys the check-usage Edge Function to Supabase

set -e

echo "🚀 Deploying Check Usage Function..."

# Check if we're in the right directory
if [ ! -d "supabase/functions/check-usage" ]; then
    echo "❌ Error: check-usage function directory not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Navigate to the function directory
cd supabase/functions/check-usage

echo "📁 Deploying from: $(pwd)"

# Deploy the function
echo "🔧 Deploying check-usage function..."
supabase functions deploy check-usage --no-verify-jwt

echo "✅ Check Usage function deployed successfully!"

# Test the function
echo "🧪 Testing the function..."
echo "You can test it with:"
echo "curl -X POST https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/check-usage \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"project_id\": \"test-project\", \"feature\": \"feedback\"}'"

echo ""
echo "🎉 Deployment complete! The check-usage function is now available."
echo "📖 See README.md for usage documentation."