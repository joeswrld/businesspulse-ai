#!/bin/bash

# Fix for Team Invitation Permission Denied Error
# This script helps you apply the database fix for permission issues

echo "🔧 Fixing Team Invitation Permission Denied Error..."

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

print_status "The 'Permission denied' error is caused by:"
echo "1. Team owners not being properly added to team_members table"
echo "2. RLS policies that are too restrictive"
echo "3. Missing or incorrect role assignments"
echo ""

print_status "To fix this issue, please follow these steps:"
echo ""

echo "1. 📊 Go to your Supabase Dashboard:"
echo "   - Open https://supabase.com/dashboard"
echo "   - Select your project"
echo ""

echo "2. 🔧 Navigate to SQL Editor:"
echo "   - Click on 'SQL Editor' in the left sidebar"
echo "   - Click 'New Query'"
echo ""

echo "3. 📝 Copy and paste this SQL code:"
echo ""

# Display the SQL content
cat fix_invitation_permission_denied.sql

echo ""
echo "4. ▶️  Click 'Run' to execute the SQL"
echo ""

print_warning "What this fix does:"
echo "✅ Ensures team owners are properly added as team members"
echo "✅ Fixes RLS policies to allow team owners to create invitations"
echo "✅ Adds fallback policies for different scenarios"
echo "✅ Shows diagnostic information to verify the fix"
echo ""

print_success "After running the SQL:"
echo "✅ You should be able to send invitations without permission errors"
echo "✅ Team owners will have proper access to invite members"
echo "✅ The system will show diagnostic information to confirm the fix"
echo ""

print_status "If you still get permission errors after running the SQL:"
echo "1. Check the diagnostic output in the SQL results"
echo "2. Make sure you're the owner of the team you're trying to invite to"
echo "3. Try refreshing the page and logging out/in again"
echo "4. Check the browser console for any additional error messages"
echo ""

print_success "🎉 The permission fix has been prepared! Please run the SQL in your Supabase dashboard."