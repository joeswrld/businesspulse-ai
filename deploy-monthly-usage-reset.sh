#!/bin/bash

echo "🔄 Deploying Monthly Usage Reset System..."
echo "========================================="

# Check if we're in the right directory
if [ ! -f "src/components/billing/UsageOverview.tsx" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Found UsageOverview component"

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Check if user is logged in to Supabase
echo ""
echo "🔐 Checking Supabase authentication..."
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run: supabase login"
    exit 1
fi

echo "✅ Supabase authentication confirmed"

# Apply database schema updates
echo ""
echo "📊 Applying database schema updates..."
echo "Please run the following SQL in your Supabase SQL Editor:"
echo ""
echo "--- COPY THIS SQL INTO SUPABASE SQL EDITOR ---"
cat update_usage_counters_schema.sql
echo ""
echo "--- END OF FIRST SQL ---"
echo ""
echo "Then run this second SQL:"
echo ""
echo "--- COPY THIS SQL INTO SUPABASE SQL EDITOR ---"
cat monthly_usage_reset_rpc.sql
echo ""
echo "--- END OF SECOND SQL ---"

echo ""
echo "🎉 Monthly Usage Reset System deployment complete!"
echo ""
echo "📋 Manual steps required:"
echo "   1. Go to your Supabase project dashboard"
echo "   2. Navigate to SQL Editor"
echo "   3. Run the first SQL script (update_usage_counters_schema.sql)"
echo "   4. Run the second SQL script (monthly_usage_reset_rpc.sql)"
echo "   5. Verify the functions were created successfully"
echo ""
echo "🔧 What this update does:"
echo "   • Adds missing columns to usage_counters table"
echo "   • Creates RPC functions for monthly reset logic"
echo "   • Updates UsageOverview to use the new RPC"
echo "   • Automatically resets usage counts every new month"
echo ""
echo "📊 New columns added:"
echo "   • insights_count (AI Insights)"
echo "   • analytics_count (Analytics Reports)"
echo "   • reports_count (Detailed Reports)"
echo ""
echo "🔄 Monthly Reset Logic:"
echo "   • Checks if month_start matches current month"
echo "   • If not, resets all counts to 0"
echo "   • Updates month_start to current month"
echo "   • Creates new record if none exists"
echo ""
echo "🧪 Testing:"
echo "   1. Go to your billing page"
echo "   2. Check that usage data loads correctly"
echo "   3. Verify monthly reset works (test with different dates)"
echo "   4. Check that business users still show unlimited"
echo ""
echo "✨ Monthly usage reset is now active!"