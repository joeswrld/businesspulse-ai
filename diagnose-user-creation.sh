#!/bin/bash

echo "🔍 Diagnosing User Creation Database Error"
echo "=========================================="
echo ""

echo "✅ Checking if Supabase CLI is available..."
if command -v supabase &> /dev/null; then
    echo "   ✓ Supabase CLI found"
    SUPABASE_AVAILABLE=true
else
    echo "   ✗ Supabase CLI not found"
    echo "   Please install Supabase CLI: https://supabase.com/docs/guides/cli"
    SUPABASE_AVAILABLE=false
fi

echo ""

if [ "$SUPABASE_AVAILABLE" = true ]; then
    echo "✅ Checking current database status..."
    
    # Check if we're in a Supabase project
    if [ -f "supabase/config.toml" ]; then
        echo "   ✓ Supabase project found"
        
        # Check database connection
        echo "   🔌 Testing database connection..."
        if supabase db ping &> /dev/null; then
            echo "   ✓ Database connection successful"
        else
            echo "   ✗ Database connection failed"
            echo "   Please check your Supabase configuration"
        fi
        
        echo ""
        echo "✅ Checking database tables..."
        
        # Check if billing tables exist
        echo "   📊 Checking billing tables..."
        supabase db diff --schema public 2>/dev/null | grep -E "(billing_profiles|user_subscriptions|transactions|usage_tracking)" || echo "   No billing tables found in diff"
        
        echo ""
        echo "✅ Checking triggers..."
        
        # Check if triggers exist
        echo "   🔄 Checking database triggers..."
        supabase db diff --schema public 2>/dev/null | grep -E "trigger_create_billing_profile" || echo "   No billing triggers found in diff"
        
    else
        echo "   ✗ Not in a Supabase project directory"
        echo "   Please run this script from your project root"
    fi
else
    echo "⚠️  Supabase CLI not available - manual checks required"
fi

echo ""
echo "🔍 Manual Checks Required:"
echo "=========================="
echo ""

echo "1. Check Supabase Dashboard:"
echo "   - Go to https://supabase.com/dashboard"
echo "   - Select your project"
echo "   - Go to Database > Tables"
echo "   - Verify these tables exist:"
echo "     • billing_profiles"
echo "     • user_subscriptions" 
echo "     • transactions"
echo "     • usage_tracking"
echo ""

echo "2. Check Database Logs:"
echo "   - Go to Database > Logs"
echo "   - Look for errors when creating users"
echo "   - Check for trigger execution errors"
echo ""

echo "3. Check RLS Policies:"
echo "   - Go to Database > Policies"
echo "   - Verify RLS is enabled on billing tables"
echo "   - Check if policies allow user creation"
echo ""

echo "4. Test User Creation:"
echo "   - Try to create a new user through your app"
echo "   - Check browser console for specific error messages"
echo "   - Check Supabase logs for detailed error information"
echo ""

echo "🚀 Quick Fix Options:"
echo "====================="
echo ""

echo "Option 1: Run the fix script (recommended)"
echo "   supabase db reset  # Reset database completely"
echo "   # Then run: safe-billing-migration.sql"
echo ""

echo "Option 2: Apply the fix directly"
echo "   # Run: fix-user-creation-error.sql"
echo ""

echo "Option 3: Manual table creation"
echo "   # Create tables manually in Supabase dashboard"
echo ""

echo "📋 Common Issues and Solutions:"
echo "==============================="
echo ""

echo "❌ Issue: 'relation does not exist'"
echo "   Solution: Run safe-billing-migration.sql"
echo ""

echo "❌ Issue: 'permission denied'"
echo "   Solution: Check RLS policies and user permissions"
echo ""

echo "❌ Issue: 'trigger function failed'"
echo "   Solution: Run fix-user-creation-error.sql"
echo ""

echo "❌ Issue: 'foreign key constraint'"
echo "   Solution: Ensure auth.users table exists and is accessible"
echo ""

echo "✨ Diagnosis Complete!"
echo "====================="
echo ""
echo "Next steps:"
echo "1. Check the manual checks above"
echo "2. Run the appropriate fix script"
echo "3. Test user creation again"
echo "4. Monitor for any remaining errors"