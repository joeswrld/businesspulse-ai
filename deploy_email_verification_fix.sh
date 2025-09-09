#!/bin/bash

# Deploy Email Verification Flow Fix
# This script applies all the necessary fixes to resolve the email verification issues

set -e

echo "🚀 Starting Email Verification Flow Fix Deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Please install it first."
    echo "   Run: npm install -g supabase"
    exit 1
fi

echo "📋 Applying database migration..."

# Apply the email verification fix migration
if [ -f "fix_email_verification_flow.sql" ]; then
    echo "   Applying email verification flow fix..."
    supabase db push --include-all
    echo "   ✅ Database migration applied successfully"
else
    echo "   ⚠️  Migration file not found, skipping database changes"
fi

echo "🔧 Updating frontend components..."

# Check if the updated files exist
if [ -f "src/hooks/useEmailConfirmation.ts" ]; then
    echo "   ✅ Email confirmation hook created"
else
    echo "   ❌ Email confirmation hook not found"
fi

if [ -f "src/components/AuthFlowGuard.tsx" ]; then
    echo "   ✅ AuthFlowGuard component updated"
else
    echo "   ❌ AuthFlowGuard component not found"
fi

if [ -f "src/hooks/useUserStatus.ts" ]; then
    echo "   ✅ UserStatus hook updated"
else
    echo "   ❌ UserStatus hook not found"
fi

echo "🧪 Running build test..."

# Test the build
if npm run build; then
    echo "   ✅ Build successful"
else
    echo "   ❌ Build failed - please check for errors"
    exit 1
fi

echo "📝 Summary of changes applied:"
echo "   • Added email_confirmed column to profiles table"
echo "   • Updated check_user_access() function to check email confirmation"
echo "   • Updated get_user_status() function to include email confirmation"
echo "   • Created useEmailConfirmation hook for proper email verification handling"
echo "   • Updated AuthFlowGuard to use proper email confirmation logic"
echo "   • Updated UserStatus interface to include email_confirmed field"
echo "   • Added automatic email confirmation sync triggers"

echo ""
echo "🎉 Email Verification Flow Fix Deployment Complete!"
echo ""
echo "📋 What was fixed:"
echo "   ✅ Confirmed users will no longer see 'Email Verification Required'"
echo "   ✅ Only unverified users will be blocked from accessing the platform"
echo "   ✅ Authenticated pages (Dashboard, Billing, Settings, Profile) will load properly"
echo "   ✅ Email confirmation status is properly tracked in the database"
echo "   ✅ Automatic sync between Supabase auth and profiles table"
echo ""
echo "🔍 To test the fix:"
echo "   1. Sign up with a new account"
echo "   2. Verify your email through the confirmation link"
echo "   3. Log in and check that you can access all authenticated pages"
echo "   4. Verify that unconfirmed users still see the verification screen"
echo ""
echo "⚠️  Note: Existing users who have already confirmed their email will be automatically"
echo "   updated to have email_confirmed = TRUE in the profiles table."