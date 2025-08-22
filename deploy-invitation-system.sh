#!/bin/bash

# Team Invitation System Deployment Script
# This script deploys the complete team invitation system with email functionality

echo "🚀 Deploying Team Invitation System..."

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

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting deployment process..."

# Step 1: Deploy database migration
print_status "Step 1: Deploying database migration..."
if supabase db push; then
    print_success "Database migration deployed successfully"
else
    print_error "Failed to deploy database migration"
    exit 1
fi

# Step 2: Deploy Edge Function
print_status "Step 2: Deploying Edge Function..."
if supabase functions deploy send-team-invitation; then
    print_success "Edge Function deployed successfully"
else
    print_warning "Failed to deploy Edge Function. You may need to set up email service manually."
fi

# Step 3: Set environment variables
print_status "Step 3: Setting environment variables..."
if supabase secrets set SITE_URL="https://your-domain.com"; then
    print_success "Site URL set successfully"
else
    print_warning "Failed to set SITE_URL. Please set it manually in Supabase dashboard."
fi

print_success "🎉 Team Invitation System deployment completed!"

echo ""
echo "📋 Next Steps:"
echo "1. Configure email service in Supabase dashboard:"
echo "   - Go to Settings > Email Templates"
echo "   - Set up SMTP settings or use Supabase's built-in email service"
echo ""
echo "2. Test the invitation system:"
echo "   - Create a team"
echo "   - Send an invitation to a test email"
echo "   - Check if the email is received"
echo ""
echo "3. Customize email templates:"
echo "   - Edit the email template in supabase/functions/send-team-invitation/index.ts"
echo "   - Update branding and styling as needed"
echo ""
echo "4. Set up email tracking (optional):"
echo "   - Create an 'emails' table in Supabase for email tracking"
echo "   - Configure email analytics"
echo ""

print_status "🔧 Manual Configuration Required:"
echo "1. Email Service Setup:"
echo "   - Supabase Dashboard > Settings > Email Templates"
echo "   - Configure SMTP settings or use Supabase's email service"
echo ""
echo "2. Environment Variables:"
echo "   - SITE_URL: Your application's base URL"
echo "   - Email service credentials (if using external SMTP)"
echo ""

print_success "✅ Team Invitation System is ready to use!"
echo ""
echo "📚 Documentation:"
echo "- Database Schema: supabase/migrations/20241201000003_create_team_invitations_system.sql"
echo "- Edge Function: supabase/functions/send-team-invitation/index.ts"
echo "- Frontend: src/pages/TeamInvitation.tsx"
echo "- Integration: src/pages/Teams.tsx"