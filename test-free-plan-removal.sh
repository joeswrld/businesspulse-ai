#!/bin/bash

# Test Free Plan Removal
echo "🧪 Testing Free Plan Removal..."

# Check if Free Plan has been removed from components
echo ""
echo "🔍 Checking PlanComparison component..."

if grep -q "Free Plan" src/components/billing/PlanComparison.tsx; then
    echo "❌ Free Plan still found in PlanComparison"
else
    echo "✅ Free Plan removed from PlanComparison"
fi

if grep -q "id: 'free'" src/components/billing/PlanComparison.tsx; then
    echo "❌ Free Plan ID still found in PlanComparison"
else
    echo "✅ Free Plan ID removed from PlanComparison"
fi

echo ""
echo "🔍 Checking useBillingSystem hook..."

if grep -q "free:" src/hooks/useBillingSystem.ts; then
    echo "❌ Free Plan still found in billing hook"
else
    echo "✅ Free Plan removed from billing hook"
fi

if grep -q "'free'" src/hooks/useBillingSystem.ts; then
    echo "❌ Free Plan references still found in billing hook"
else
    echo "✅ Free Plan references removed from billing hook"
fi

echo ""
echo "🔍 Checking Billing page..."

if grep -q "currentPlan === 'free'" src/pages/Billing.tsx; then
    echo "❌ Free Plan logic still found in Billing page"
else
    echo "✅ Free Plan logic removed from Billing page"
fi

echo ""
echo "🔍 Checking database migration..."

if grep -q "'free'" safe-billing-migration.sql; then
    echo "❌ Free Plan still found in migration"
else
    echo "✅ Free Plan removed from migration"
fi

echo ""
echo "📊 Summary:"
echo "=================="

# Count remaining free plan references
free_count=$(grep -c "free" src/components/billing/PlanComparison.tsx src/hooks/useBillingSystem.ts src/pages/Billing.tsx safe-billing-migration.sql 2>/dev/null || echo "0")

if [ "$free_count" -eq 0 ]; then
    echo "🎉 Free Plan completely removed!"
    echo ""
    echo "✅ What's now available:"
    echo "   • Free Trial (8 days) - ₦0"
    echo "   • Pro Plan (30 days) - ₦35,000/month"
    echo "   • Business Plan (30 days) - ₦53,000/month"
    echo ""
    echo "📋 Next steps:"
    echo "1. Test the billing page to ensure it works"
    echo "2. Verify only 3 plans are shown"
    echo "3. Check that upgrade flows work correctly"
else
    echo "⚠️  Free Plan references still found: $free_count"
    echo "Please check the files above for remaining references"
fi