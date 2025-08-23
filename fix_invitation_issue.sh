#!/bin/bash

# Fix for Team Invitation System Issue
# This script helps you apply the database fix

echo "🔧 Fixing Team Invitation System Issue..."

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

print_status "The issue is likely caused by missing database columns or RLS policies."
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
cat fix_invitation_simple.sql

echo ""
echo "4. ▶️  Click 'Run' to execute the SQL"
echo ""

print_warning "Important Notes:"
echo "- This will fix the database schema for team invitations"
echo "- It will add missing columns and fix RLS policies"
echo "- No existing data will be lost"
echo "- This version avoids sequence-related errors"
echo ""

print_success "After running the SQL:"
echo "✅ The invitation system should work properly"
echo "✅ You'll be able to send invitations without errors"
echo "✅ Better error messages will be shown if issues occur"
echo ""

print_status "If you still encounter issues after running the SQL:"
echo "1. Check the browser console for specific error messages"
echo "2. Try refreshing the page"
echo "3. Make sure you have admin rights to the team you're inviting to"
echo "4. Contact support if the issue persists"
echo ""

print_success "🎉 The fix has been prepared! Please run the SQL in your Supabase dashboard."