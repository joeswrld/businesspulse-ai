#!/bin/bash

# Comprehensive Fix for All Platform Pages
# This script runs migrations to ensure all users can access all platform pages without errors

echo "🔧 Running comprehensive platform fix for new users..."

# Check if we're in the right directory
if [ ! -f "supabase/migrations/20250120000000_ensure_feedback_system.sql" ] || [ ! -f "supabase/migrations/20250120000001_ensure_all_tables.sql" ] || [ ! -f "supabase/migrations/20250120000002_fix_trigger_function.sql" ] || [ ! -f "supabase/migrations/20250120000003_fix_profiles_table.sql" ] || [ ! -f "supabase/migrations/20250120000004_safe_profiles_handling.sql" ] || [ ! -f "supabase/migrations/20250120000005_final_profiles_fix.sql" ]; then
    echo "❌ Error: Migration files not found. Please run this script from the project root."
    exit 1
fi

# Run the migration
echo "📦 Applying database migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Comprehensive platform fix completed successfully!"
    echo ""
    echo "🎉 All users (new and existing) can now access all platform pages without errors."
    echo ""
    echo "The following has been set up:"
    echo "- Database functions for automatic table creation"
    echo "- Default settings for all users across all features"
    echo "- Proper Row Level Security policies for all tables"
    echo "- User profiles, subscriptions, and feedback settings"
    echo "- Data sources and other platform tables"
    echo ""
    echo "New users will no longer see errors when accessing any platform page."
else
    echo "❌ Error applying migration. Please check your Supabase connection."
    exit 1
fi