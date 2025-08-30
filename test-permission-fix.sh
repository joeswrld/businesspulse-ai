#!/bin/bash

echo "🔧 Testing Permission Error Fix"
echo "==============================="
echo ""

echo "✅ Checking if problematic triggers exist..."
if grep -q "trigger_create_billing_profile" safe-billing-migration.sql; then
    echo "   ⚠️  WARNING: Problematic trigger found in migration file"
    echo "      This should be removed to prevent permission errors"
else
    echo "   ✓ No problematic triggers found in migration file"
fi

echo ""

echo "✅ Checking if fix script exists..."
if [ -f "fix-permission-error.sql" ]; then
    echo "   ✓ fix-permission-error.sql exists"
    
    # Check if it drops the problematic trigger
    if grep -q "DROP TRIGGER IF EXISTS trigger_create_billing_profile" fix-permission-error.sql; then
        echo "   ✓ Script drops problematic trigger"
    else
        echo "   ✗ Script doesn't drop problematic trigger"
    fi
    
    # Check if it creates the new function
    if grep -q "create_user_billing_profile" fix-permission-error.sql; then
        echo "   ✓ Script creates new function approach"
    else
        echo "   ✗ Script doesn't create new function approach"
    fi
else
    echo "   ✗ fix-permission-error.sql not found"
fi

echo ""

echo "✅ Checking if useBillingSystem hook was updated..."
if grep -q "create_user_billing_profile" src/hooks/useBillingSystem.ts; then
    echo "   ✓ Hook uses new function approach"
else
    echo "   ✗ Hook still uses old approach"
fi

echo ""

echo "✅ Checking for permission-related code..."
if grep -q "auth.users" src/hooks/useBillingSystem.ts; then
    echo "   ⚠️  WARNING: Direct auth.users references found"
    echo "      These should be avoided to prevent permission issues"
else
    echo "   ✓ No direct auth.users references found"
fi

echo ""

echo "🚀 Fix Status Summary:"
echo "======================"
echo ""

# Count the issues found
issues=0

if grep -q "trigger_create_billing_profile" safe-billing-migration.sql; then
    echo "❌ Issue 1: Problematic trigger still exists in migration"
    issues=$((issues + 1))
fi

if [ ! -f "fix-permission-error.sql" ]; then
    echo "❌ Issue 2: Fix script not found"
    issues=$((issues + 1))
fi

if ! grep -q "create_user_billing_profile" src/hooks/useBillingSystem.ts; then
    echo "❌ Issue 3: Hook not updated to use new approach"
    issues=$((issues + 1))
fi

if [ $issues -eq 0 ]; then
    echo "🎉 SUCCESS: Permission error fix is properly implemented!"
    echo ""
    echo "Next steps:"
    echo "1. Run fix-permission-error.sql in your database"
    echo "2. Test user creation to verify fix"
    echo "3. Test billing profile creation via functions"
else
    echo "⚠️  WARNING: $issues issue(s) found that need attention"
    echo ""
    echo "To complete the fix:"
    echo "1. Update the migration file to remove triggers"
    echo "2. Ensure fix-permission-error.sql exists"
    echo "3. Update useBillingSystem hook to use new approach"
fi

echo ""
echo "🔍 Manual Verification Required:"
echo "================================"
echo ""

echo "1. Database Changes:"
echo "   - Run fix-permission-error.sql in Supabase"
echo "   - Verify functions were created"
echo "   - Check that triggers were dropped"
echo ""

echo "2. Application Changes:"
echo "   - Restart development server"
echo "   - Test user creation flow"
echo "   - Verify no permission errors"
echo ""

echo "3. Billing System:"
echo "   - Test billing profile creation"
echo "   - Verify function calls work"
echo "   - Check billing page loads correctly"
echo ""

echo "✨ Test Complete!"