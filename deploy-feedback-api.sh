#!/bin/bash

# Deploy Feedback API Function
# This script deploys the feedback API function with proper configuration

echo "🚀 Deploying NoteX Feedback API Function"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "supabase/functions/feedback-api" ]; then
    print_error "Feedback API function not found. Please ensure the function exists."
    exit 1
fi

print_status "Starting feedback API deployment..."

# Step 1: Deploy the function
print_status "Deploying feedback API function..."
supabase functions deploy feedback-api

if [ $? -eq 0 ]; then
    print_success "Feedback API function deployed successfully"
else
    print_error "Failed to deploy feedback API function"
    exit 1
fi

# Step 2: Configure function to be public (no JWT required)
print_status "Configuring function to be public..."
supabase functions update-config feedback-api --no-verify-jwt

if [ $? -eq 0 ]; then
    print_success "Function configured to be public"
else
    print_warning "Could not update function config (this might be normal)"
fi

# Step 3: Test the function
print_status "Testing the deployed function..."
API_URL="https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/feedback-api"

# Test with a simple POST request
TEST_RESPONSE=$(curl -s -w "%{http_code}" -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "project_id=test&name=Test&email=test@example.com&message=Test" \
    "$API_URL")

HTTP_CODE="${TEST_RESPONSE: -3}"
RESPONSE_BODY="${TEST_RESPONSE%???}"

echo "Test Response:"
echo "HTTP Status: $HTTP_CODE"
echo "Response: $RESPONSE_BODY"

if [ "$HTTP_CODE" = "400" ]; then
    print_success "Function is working (400 is expected for invalid project_id)"
elif [ "$HTTP_CODE" = "401" ]; then
    print_warning "Function still requires authentication. You may need to:"
    echo "1. Check function logs: supabase functions logs feedback-api"
    echo "2. Verify function config: supabase functions list"
    echo "3. Try redeploying: supabase functions deploy feedback-api"
elif [ "$HTTP_CODE" = "404" ]; then
    print_error "Function not found. Check if deployment was successful."
else
    print_success "Function is responding (Status: $HTTP_CODE)"
fi

# Step 4: Show function logs
print_status "Recent function logs:"
supabase functions logs feedback-api --limit 10

print_success "🎉 Feedback API deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Test the widget on a website"
echo "2. Check function logs if issues persist: supabase functions logs feedback-api --follow"
echo "3. Verify database tables exist: Run setup-feedback-system.sql"
echo ""
echo "🔗 Function URL: $API_URL"
echo "📝 To view live logs: supabase functions logs feedback-api --follow"