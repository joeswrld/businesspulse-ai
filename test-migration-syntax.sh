#!/bin/bash

# Test the safe migration script
echo "🧪 Testing Safe Migration Script..."

# Check if the file exists
if [ ! -f "safe-billing-migration.sql" ]; then
    echo "❌ Error: safe-billing-migration.sql not found"
    exit 1
fi

echo "✅ Migration file found"

# Check for syntax errors
echo "🔍 Checking SQL syntax..."

# Look for common SQL syntax issues
if grep -q "^- " safe-billing-migration.sql; then
    echo "❌ Error: Found markdown-style dashes in SQL file"
    echo "   These lines contain '- ' which is not valid SQL syntax:"
    grep -n "^- " safe-billing-migration.sql
    exit 1
fi

# Check for proper SQL structure
if ! grep -q "CREATE TABLE" safe-billing-migration.sql; then
    echo "❌ Error: No CREATE TABLE statements found"
    exit 1
fi

if ! grep -q "CREATE OR REPLACE FUNCTION" safe-billing-migration.sql; then
    echo "❌ Error: No function creation found"
    exit 1
fi

# Check for the three plans mentioned
if ! grep -q "trial.*8 days" safe-billing-migration.sql; then
    echo "❌ Error: Trial plan (8 days) not found"
    exit 1
fi

if ! grep -q "pro.*30 days" safe-billing-migration.sql; then
    echo "❌ Error: Pro plan (30 days) not found"
    exit 1
fi

if ! grep -q "business.*30 days" safe-billing-migration.sql; then
    echo "❌ Error: Business plan (30 days) not found"
    exit 1
fi

echo "✅ SQL syntax looks correct"
echo "✅ All three plans configured: Trial (8 days), Pro (30 days), Business (30 days)"

# Check for required tables
required_tables=("billing_profiles" "user_subscriptions" "transactions" "usage_tracking")
for table in "${required_tables[@]}"; do
    if ! grep -q "CREATE TABLE.*$table" safe-billing-migration.sql; then
        echo "❌ Error: Table '$table' not found in migration"
        exit 1
    fi
    echo "✅ Table '$table' found"
done

echo ""
echo "🎉 Migration script validation passed!"
echo ""
echo "📋 Next steps:"
echo "1. Run the migration in your Supabase SQL Editor:"
echo "   - Copy the contents of safe-billing-migration.sql"
echo "   - Paste into Supabase SQL Editor"
echo "   - Click 'Run'"
echo ""
echo "2. Or run via command line:"
echo "   ./run-safe-migration.sh"
echo ""
echo "3. Test the integration:"
echo "   ./test-paystack-integration.sh"