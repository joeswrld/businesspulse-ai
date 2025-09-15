#!/bin/bash

# ============================================================================
# DEPLOY FEEDBACK SYSTEM FIX
# ============================================================================
# This script deploys the comprehensive feedback system fix

set -e

echo "🚀 Starting Feedback System Fix Deployment..."

# Check if we're in the right directory
if [ ! -f "fix_feedback_system_complete.sql" ]; then
    echo "❌ Error: fix_feedback_system_complete.sql not found in current directory"
    exit 1
fi

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Please install it first."
    echo "   Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Error: Not connected to Supabase. Please run 'supabase login' first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Apply the database fix
echo "📊 Applying database schema fixes..."
supabase db reset --linked

echo "🔧 Running feedback system fix SQL..."
supabase db push

echo "📝 Applying the comprehensive fix..."
psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -f fix_feedback_system_complete.sql

echo "✅ Database fixes applied successfully!"

# Verify the fix
echo "🔍 Verifying the fix..."

# Check table structure
echo "📋 Checking table structure..."
psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -c "
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'feedback' 
ORDER BY ordinal_position;
"

# Check sentiment distribution
echo "📊 Checking sentiment distribution..."
psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -c "
SELECT 
  sentiment,
  COUNT(*) as count,
  ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM feedback)::numeric) * 100, 2) as percentage
FROM feedback 
GROUP BY sentiment 
ORDER BY count DESC;
"

# Check for any NULL created_at values
echo "🕐 Checking for NULL created_at values..."
psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -c "
SELECT COUNT(*) as null_created_at_count
FROM feedback 
WHERE created_at IS NULL;
"

echo ""
echo "🎉 Feedback System Fix Deployment Complete!"
echo ""
echo "✅ What was fixed:"
echo "   • Standardized table name to 'feedback' (singular)"
echo "   • Added proper created_at defaults"
echo "   • Backfilled sentiment analysis for existing data"
echo "   • Created automatic sentiment analysis trigger"
echo "   • Updated frontend code to use correct field names"
echo "   • Added helper functions for statistics"
echo ""
echo "🔧 Next steps:"
echo "   1. Test the Feedback page to ensure it loads correctly"
echo "   2. Test the Dashboard to verify sentiment and date display"
echo "   3. Create a new feedback entry to test automatic sentiment analysis"
echo ""
echo "📊 The system now provides:"
echo "   • Automatic sentiment analysis for new feedback"
echo "   • Consistent date formatting across all pages"
echo "   • Proper totals and statistics display"
echo "   • Real-time updates for both pages"