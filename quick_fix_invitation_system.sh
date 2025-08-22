#!/bin/bash

# Quick Fix for Team Invitation System
# This script fixes the missing columns error

echo "🔧 Quick Fix for Team Invitation System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_status "Fixing team_invitations table..."

# Option 1: Run the migration
if command -v supabase &> /dev/null; then
    print_status "Option 1: Running database migration..."
    if supabase db push; then
        print_success "Migration completed successfully!"
    else
        print_warning "Migration failed. Trying Option 2..."
    fi
else
    print_warning "Supabase CLI not found. Using Option 2..."
fi

# Option 2: Manual SQL fix
print_status "Option 2: Manual SQL fix instructions..."
echo ""
echo "📋 Please run this SQL in your Supabase SQL Editor:"
echo ""
echo "----------------------------------------"
cat fix_team_invitations_immediate.sql
echo "----------------------------------------"
echo ""

print_status "Steps to fix:"
echo "1. Go to your Supabase Dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the SQL above"
echo "4. Click 'Run' to execute"
echo "5. Wait for the query to complete"
echo ""

print_success "After running the SQL, your invitation system will work!"
echo ""
print_status "The fix adds these missing columns:"
echo "✅ token - Unique invitation token"
echo "✅ expires_at - Expiration timestamp"
echo "✅ accepted_at - Acceptance timestamp"
echo "✅ declined_at - Decline timestamp"
echo "✅ personal_message - Custom message field"
echo "✅ inviter_id - User who sent the invitation"
echo ""

print_warning "If you still get errors after running the SQL:"
echo "1. Check the console for specific error messages"
echo "2. Verify the table structure in Supabase Dashboard"
echo "3. Try refreshing the page"
echo "4. Contact support if issues persist"