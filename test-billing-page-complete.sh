#!/bin/bash

# Complete Billing Page Test Script
echo "🧪 Testing Complete Billing Page Integration..."

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

echo ""
print_status "info" "Starting comprehensive billing page test..."

# Test 1: Check if all required files exist
echo ""
print_status "info" "Testing file structure..."

required_files=(
    "src/pages/Billing.tsx"
    "src/components/PaystackPayment.tsx"
    "src/components/billing/UsageTracker.tsx"
    "src/components/billing/PlanComparison.tsx"
    "src/hooks/useBillingSystem.ts"
    "safe-billing-migration.sql"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "success" "Found $file"
    else
        print_status "error" "Missing $file"
    fi
done

# Test 2: Check imports in Billing.tsx
echo ""
print_status "info" "Testing Billing.tsx imports..."

if grep -q "import.*UsageTracker" src/pages/Billing.tsx; then
    print_status "success" "UsageTracker import found"
else
    print_status "error" "UsageTracker import missing"
fi

if grep -q "import.*PlanComparison" src/pages/Billing.tsx; then
    print_status "success" "PlanComparison import found"
else
    print_status "error" "PlanComparison import missing"
fi

if grep -q "import.*PaystackPayment" src/pages/Billing.tsx; then
    print_status "success" "PaystackPayment import found"
else
    print_status "error" "PaystackPayment import missing"
fi

# Test 3: Check component usage in Billing.tsx
echo ""
print_status "info" "Testing component usage..."

if grep -q "<UsageTracker" src/pages/Billing.tsx; then
    print_status "success" "UsageTracker component used"
else
    print_status "error" "UsageTracker component not used"
fi

if grep -q "<PlanComparison" src/pages/Billing.tsx; then
    print_status "success" "PlanComparison component used"
else
    print_status "error" "PlanComparison component not used"
fi

if grep -q "<PaystackPayment" src/pages/Billing.tsx; then
    print_status "success" "PaystackPayment component used"
else
    print_status "error" "PaystackPayment component not used"
fi

# Test 4: Check API endpoints
echo ""
print_status "info" "Testing API endpoints..."

api_endpoints=(
    "src/pages/api/paystack/verify-payment.ts"
    "src/pages/api/cancel-subscription.ts"
    "src/pages/api/reactivate-subscription.ts"
    "src/pages/api/paystack/update-card.ts"
)

for endpoint in "${api_endpoints[@]}"; do
    if [ -f "$endpoint" ]; then
        print_status "success" "Found $endpoint"
    else
        print_status "error" "Missing $endpoint"
    fi
done

# Test 5: Check database migration
echo ""
print_status "info" "Testing database migration..."

if [ -f "safe-billing-migration.sql" ]; then
    if grep -q "CREATE TABLE.*billing_profiles" safe-billing-migration.sql; then
        print_status "success" "billing_profiles table creation found"
    else
        print_status "error" "billing_profiles table creation missing"
    fi
    
    if grep -q "CREATE TABLE.*user_subscriptions" safe-billing-migration.sql; then
        print_status "success" "user_subscriptions table creation found"
    else
        print_status "error" "user_subscriptions table creation missing"
    fi
    
    if grep -q "CREATE TABLE.*transactions" safe-billing-migration.sql; then
        print_status "success" "transactions table creation found"
    else
        print_status "error" "transactions table creation missing"
    fi
    
    if grep -q "CREATE TABLE.*usage_tracking" safe-billing-migration.sql; then
        print_status "success" "usage_tracking table creation found"
    else
        print_status "error" "usage_tracking table creation missing"
    fi
else
    print_status "error" "Migration file not found"
fi

# Test 6: Check plan configuration
echo ""
print_status "info" "Testing plan configuration..."

if grep -q "trial.*8 days" safe-billing-migration.sql; then
    print_status "success" "Trial plan (8 days) configured"
else
    print_status "error" "Trial plan (8 days) not configured"
fi

if grep -q "pro.*30 days" safe-billing-migration.sql; then
    print_status "success" "Pro plan (30 days) configured"
else
    print_status "error" "Pro plan (30 days) not configured"
fi

if grep -q "business.*30 days" safe-billing-migration.sql; then
    print_status "success" "Business plan (30 days) configured"
else
    print_status "error" "Business plan (30 days) not configured"
fi

# Test 7: Check Paystack integration
echo ""
print_status "info" "Testing Paystack integration..."

if grep -q "PaystackPop" src/components/PaystackPayment.tsx; then
    print_status "success" "Paystack integration found"
else
    print_status "error" "Paystack integration missing"
fi

if grep -q "3500000.*kobo" src/components/PaystackPayment.tsx; then
    print_status "success" "Pro plan pricing (₦35,000) configured"
else
    print_status "error" "Pro plan pricing not configured"
fi

if grep -q "5300000.*kobo" src/components/PaystackPayment.tsx; then
    print_status "success" "Business plan pricing (₦53,000) configured"
else
    print_status "error" "Business plan pricing not configured"
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
    print_status "success" "All tests passed! Your billing page is fully integrated and ready."
    echo ""
    echo "🚀 What's Working:"
    echo "   • Complete billing page with all components"
    echo "   • Usage tracking with visual progress bars"
    echo "   • Plan comparison table"
    echo "   • Paystack payment integration"
    echo "   • Transaction history with Paystack links"
    echo "   • Three plans: Trial (8 days), Pro (30 days), Business (30 days)"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Run database migration: ./run-safe-migration.sh"
    echo "2. Set Paystack API keys in .env.local"
    echo "3. Start development server: npm run dev"
    echo "4. Test at: http://localhost:3000/billing"
else
    print_status "error" "Some tests failed. Please fix the errors above before proceeding."
    echo ""
    echo "🔧 Common fixes:"
    echo "   • Check file paths and imports"
    echo "   • Verify component interfaces match"
    echo "   • Ensure all required files exist"
fi

echo ""
print_status "info" "For detailed setup instructions, see PAYSTACK_SETUP_GUIDE.md"