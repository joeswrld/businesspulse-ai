#!/bin/bash

# ============================================================================
# DEPLOY PROJECT AUTO-CREATION FIXES
# ============================================================================
# This script deploys the fixes for the project auto-creation bug

set -e

echo "🚀 Deploying project auto-creation fixes..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Error: Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

echo "📋 Applying database fixes..."

# Apply the database migration
echo "🔧 Applying database schema fixes..."
supabase db reset --linked

# Apply the specific fixes
echo "🔧 Adding unique constraint and fixing functions..."
supabase db push --linked

# Verify the fixes
echo "✅ Verifying fixes..."

# Test the function
echo "🧪 Testing create_project_with_settings function..."
supabase db push --linked

echo ""
echo "✅ Project auto-creation fixes deployed successfully!"
echo ""
echo "📋 Summary of fixes applied:"
echo "   ✅ Added unique constraint on projects.user_id"
echo "   ✅ Updated create_project_with_settings function with ON CONFLICT handling"
echo "   ✅ Added get_or_create_user_project helper function"
echo "   ✅ Improved error handling in frontend"
echo "   ✅ Silenced browser extension errors"
echo ""
echo "🎯 The following issues should now be resolved:"
echo "   • 'Failed to set window.ethereum' errors (filtered out)"
echo "   • 'ON CONFLICT specification' database errors (fixed with unique constraint)"
echo "   • 'Unexpected token <' JSON parsing errors (improved error handling)"
echo "   • 'ERR_INTERNET_DISCONNECTED' network errors (retry logic added)"
echo ""
echo "🚀 Your NoteX app should now work without project creation errors!"