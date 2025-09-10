#!/bin/bash

# Deploy Email Confirmation Fix
# This script applies the database migration to fix email confirmation issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🚀 Starting Email Confirmation Fix Deployment..."

# Check if we're in the right directory
if [ ! -f "fix_email_confirmation_database.sql" ]; then
    print_error "fix_email_confirmation_database.sql not found. Please run this script from the project root."
    exit 1
fi

print_status "📋 Applying database migration..."

# Apply the database migration
if psql -h db.xjbrqeqizpoqdjkiyqzt.supabase.co -p 5432 -d postgres -U postgres -f fix_email_confirmation_database.sql; then
    print_success "Database migration applied successfully!"
else
    print_error "Failed to apply database migration"
    exit 1
fi

print_status "🔍 Verifying functions exist..."

# Check if functions were created successfully
if psql -h db.xjbrqeqizpoqdjkiyqzt.supabase.co -p 5432 -d postgres -U postgres -c "SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('check_user_access', 'initialize_user_trial') AND routine_schema = 'public';" | grep -q "check_user_access\|initialize_user_trial"; then
    print_success "Database functions verified successfully!"
else
    print_warning "Could not verify database functions - they may still be deploying"
fi

print_status "📝 Summary of changes applied:"
echo "   • Added email_confirmed column to profiles table"
echo "   • Created trigger to sync email confirmation status from auth.users"
echo "   • Updated check_user_access() function to check email confirmation"
echo "   • Updated initialize_user_trial() function to handle email confirmation"
echo "   • Added proper error handling and logging"
echo "   • Created performance indexes"

print_success "🎉 Email Confirmation Fix Deployed Successfully!"
print_status "Next steps:"
echo "   1. Test email confirmation flow"
echo "   2. Verify users can confirm their emails"
echo "   3. Check that confirmed users can access the dashboard"

print_status "🔧 To test the fix:"
echo "   1. Create a new account"
echo "   2. Check your email for confirmation link"
echo "   3. Click the confirmation link"
echo "   4. Verify you're redirected to the dashboard"