#!/bin/bash

# Deploy Feedback System Fixes
# This script applies the database migration and restarts the application

set -e

echo "🚀 Deploying Feedback System Fixes..."

# Check if we're in the right directory
if [ ! -f "supabase/migrations/20250130000004_fix_feedback_system_schema.sql" ]; then
    echo "❌ Migration file not found. Please run this script from the project root."
    exit 1
fi

# Apply the migration
echo "📊 Applying database migration..."
supabase db push

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo "✅ Database migration applied successfully!"
else
    echo "❌ Database migration failed!"
    exit 1
fi

# Restart the development server if it's running
echo "🔄 Restarting development server..."
if pgrep -f "vite\|npm\|yarn\|bun" > /dev/null; then
    echo "Stopping existing development server..."
    pkill -f "vite\|npm\|yarn\|bun" || true
    sleep 2
fi

echo "🎉 Feedback system fixes deployed successfully!"
echo ""
echo "📋 What was fixed:"
echo "  ✅ Projects table now uses UUID primary key with auto-generation"
echo "  ✅ Created proper feedback_settings table with RLS policies"
echo "  ✅ Fixed project creation to use session.user.id"
echo "  ✅ Added helper functions for project management"
echo "  ✅ Updated FeedbackSettings component to use new schema"
echo "  ✅ Fixed widget-settings function to return valid JSON"
echo "  ✅ Added storage bucket for project logos"
echo ""
echo "🔧 Next steps:"
echo "  1. Start your development server: npm run dev"
echo "  2. Test project creation in the Feedback Settings page"
echo "  3. Verify that projects appear in the dropdown"
echo "  4. Test feedback widget integration"
echo ""
echo "✨ The Feedback Settings page should now work correctly!"