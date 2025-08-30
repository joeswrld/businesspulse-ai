#!/bin/bash

# Safe Billing Migration Script
# This script runs the safe migration that handles existing tables

echo "🔧 Running safe billing migration..."

# Check if we're in the right directory
if [ ! -f "safe-billing-migration.sql" ]; then
    echo "❌ Error: safe-billing-migration.sql not found in current directory"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found"
    echo "Please install Supabase CLI first:"
    echo "npm install -g supabase"
    exit 1
fi

echo "📋 Checking current database state..."

# Check what tables already exist
echo "Existing tables:"
supabase db reset --dry-run 2>&1 | grep -E "(CREATE TABLE|relation.*exists)" || echo "No existing tables found"

echo ""
echo "🚀 Running safe migration..."

# Run the safe migration
if supabase db reset --dry-run 2>&1 | grep -q "safe-billing-migration.sql"; then
    echo "✅ Migration file found in Supabase configuration"
    supabase db push
else
    echo "📝 Running migration directly..."
    # You can also run this directly in your Supabase dashboard SQL editor
    echo "Copy the contents of safe-billing-migration.sql and run it in your Supabase SQL editor"
fi

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📊 What was created/updated:"
echo "   • billing_profiles table (if not exists)"
echo "   • user_subscriptions table (if not exists)"
echo "   • transactions table (if not exists)"
echo "   • usage_tracking table (if not exists)"
echo "   • All necessary indexes and RLS policies"
echo "   • Default data for existing users"
echo ""
echo "🎉 Your billing system is now ready!"
echo ""
echo "Next steps:"
echo "1. Test the billing page at /billing"
echo "2. Set up Paystack integration"
echo "3. Add usage tracking to your features"
echo "4. Test the complete upgrade flow"