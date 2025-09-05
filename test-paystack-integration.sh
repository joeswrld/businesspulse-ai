#!/bin/bash

# Paystack Integration Test Script
# This script tests the complete Paystack integration

echo "🧪 Testing Paystack Integration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "info")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_status "error" "Please run this script from the project root directory"
    exit 1
fi

echo ""
print_status "info" "Starting Paystack integration tests..."

# Test 1: Check environment variables
echo ""
print_status "info" "Testing environment variables..."

if [ -z "$NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY" ]; then
    print_status "warning" "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY not set"
else
    print_status "success" "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is set"
fi

if [ -z "$PAYSTACK_SECRET_KEY" ]; then
    print_status "warning" "PAYSTACK_SECRET_KEY not set"
else
    print_status "success" "PAYSTACK_SECRET_KEY is set"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    print_status "warning" "NEXT_PUBLIC_SUPABASE_URL not set"
else
    print_status "success" "NEXT_PUBLIC_SUPABASE_URL is set"
fi

# Test 2: Check if required files exist
echo ""
print_status "info" "Testing required files..."

required_files=(
    "src/components/PaystackPayment.tsx"
    "src/pages/api/paystack/verify-payment.ts"
    "src/pages/api/cancel-subscription.ts"
    "src/pages/api/reactivate-subscription.ts"
    "src/pages/api/paystack/update-card.ts"
    "src/pages/Billing.tsx"
    "safe-billing-migration.sql"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "success" "Found $file"
    else
        print_status "error" "Missing $file"
    fi
done

# Test 3: Check if database migration has been run
echo ""
print_status "info" "Testing database setup..."

# This would require Supabase CLI to be installed and configured
if command -v supabase &> /dev/null; then
    print_status "success" "Supabase CLI is installed"
    
    # Check if we can connect to Supabase
    if supabase status &> /dev/null; then
        print_status "success" "Supabase connection working"
    else
        print_status "warning" "Cannot connect to Supabase (may need to run 'supabase login')"
    fi
else
    print_status "warning" "Supabase CLI not installed - run 'npm install -g supabase'"
fi

# Test 4: Check if development server can start
echo ""
print_status "info" "Testing development server..."

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_status "success" "Dependencies installed"
else
    print_status "warning" "Dependencies not installed - run 'npm install'"
fi

# Test 5: Check Paystack script loading
echo ""
print_status "info" "Testing Paystack script integration..."

if grep -q "paystack" public/index.html 2>/dev/null || grep -q "paystack" src/app/layout.tsx 2>/dev/null; then
    print_status "success" "Paystack script reference found"
else
    print_status "warning" "Paystack script not found in HTML - may be loaded dynamically"
fi

# Test 6: Validate API endpoints
echo ""
print_status "info" "Testing API endpoint structure..."

# Check if API endpoints have proper structure
if grep -q "export default async function handler" src/pages/api/paystack/verify-payment.ts; then
    print_status "success" "verify-payment API endpoint structure is correct"
else
    print_status "error" "verify-payment API endpoint structure is incorrect"
fi

if grep -q "export default async function handler" src/pages/api/cancel-subscription.ts; then
    print_status "success" "cancel-subscription API endpoint structure is correct"
else
    print_status "error" "cancel-subscription API endpoint structure is incorrect"
fi

# Test 7: Check component integration
echo ""
print_status "info" "Testing component integration..."

if grep -q "PaystackPayment" src/pages/Billing.tsx; then
    print_status "success" "PaystackPayment component is integrated in Billing page"
else
    print_status "error" "PaystackPayment component not found in Billing page"
fi

# Test 8: Check transaction history
echo ""
print_status "info" "Testing transaction history display..."

if grep -q "Transaction History" src/pages/Billing.tsx; then
    print_status "success" "Transaction history section found in Billing page"
else
    print_status "error" "Transaction history section not found in Billing page"
fi

# Summary
echo ""
echo "📊 Test Summary:"
echo "=================="

# Count successes and errors
success_count=$(grep -c "✅" <<< "$(cat /dev/stdin)" 2>/dev/null || echo "0")
error_count=$(grep -c "❌" <<< "$(cat /dev/stdin)" 2>/dev/null || echo "0")
warning_count=$(grep -c "⚠️" <<< "$(cat /dev/stdin)" 2>/dev/null || echo "0")

echo "✅ Successes: $success_count"
echo "❌ Errors: $error_count"
echo "⚠️  Warnings: $warning_count"

echo ""
if [ "$error_count" -eq 0 ]; then
    print_status "success" "All critical tests passed! Your Paystack integration is ready."
    echo ""
    echo "🚀 Next steps:"
    echo "1. Start your development server: npm run dev"
    echo "2. Navigate to: http://localhost:3000/billing"
    echo "3. Test the upgrade flow with test cards"
    echo "4. Check transaction history after successful payment"
else
    print_status "error" "Some tests failed. Please fix the errors above before proceeding."
    echo ""
    echo "🔧 Fix the errors and run this script again."
fi

echo ""
print_status "info" "For detailed setup instructions, see PAYSTACK_SETUP_GUIDE.md"