#!/bin/bash

# Script to apply the usage overview fix
echo "🔧 Applying Usage Overview Fix..."

# Check if we're in the right directory
if [ ! -f "fix_usage_overview.sql" ]; then
    echo "❌ Error: fix_usage_overview.sql not found. Please run this script from the project root."
    exit 1
fi

echo "📋 The following steps need to be completed manually:"
echo ""
echo "1. Open your Supabase dashboard"
echo "2. Go to the SQL Editor"
echo "3. Copy and paste the contents of fix_usage_overview.sql"
echo "4. Execute the SQL script"
echo "5. Verify that the usage_counters table has the correct structure"
echo ""
echo "📄 SQL script location: $(pwd)/fix_usage_overview.sql"
echo ""
echo "✅ After applying the database fix:"
echo "   - The Usage Overview should display actual usage data"
echo "   - Users can refresh their usage data manually"
echo "   - Usage limits and progress bars will work correctly"
echo ""
echo "🧪 To test:"
echo "   1. Navigate to the Billing page"
echo "   2. Check the Usage Overview section"
echo "   3. Click the refresh button to update data"
echo "   4. Verify usage counts match your actual data"
echo ""
echo "📚 For more details, see: test_usage_overview.md"