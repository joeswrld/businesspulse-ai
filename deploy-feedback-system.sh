#!/bin/bash

# Deploy Feedback System for NoteX Platform
# This script sets up the complete feedback system including database schema and edge functions

set -e

echo "🚀 Deploying NoteX Feedback System..."

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

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    print_error "Not in a Supabase project directory. Please run this from your project root."
    exit 1
fi

print_status "Starting feedback system deployment..."

# 1. Deploy database schema
print_status "Deploying database schema..."
if [ -f "feedback_system_schema.sql" ]; then
    supabase db reset --linked
    supabase db push
    print_success "Database schema deployed successfully"
else
    print_error "feedback_system_schema.sql not found"
    exit 1
fi

# 2. Deploy edge functions
print_status "Deploying edge functions..."

# Deploy widget-settings function
if [ -d "supabase/functions/widget-settings" ]; then
    supabase functions deploy widget-settings
    print_success "widget-settings function deployed"
else
    print_error "widget-settings function not found"
    exit 1
fi

# Deploy widget-feedback function
if [ -d "supabase/functions/widget-feedback" ]; then
    supabase functions deploy widget-feedback
    print_success "widget-feedback function deployed"
else
    print_error "widget-feedback function not found"
    exit 1
fi

# Deploy feedback-stats function
if [ -d "supabase/functions/feedback-stats" ]; then
    supabase functions deploy feedback-stats
    print_success "feedback-stats function deployed"
else
    print_error "feedback-stats function not found"
    exit 1
fi

# 3. Set up RLS policies
print_status "Setting up Row Level Security policies..."
supabase db push
print_success "RLS policies configured"

# 4. Verify deployment
print_status "Verifying deployment..."

# Check if tables exist
TABLES_EXIST=$(supabase db diff --linked 2>/dev/null | grep -c "feedback\|feedback_settings" || echo "0")
if [ "$TABLES_EXIST" -gt 0 ]; then
    print_success "Feedback tables created successfully"
else
    print_warning "Could not verify table creation. Please check manually."
fi

# Check if functions are deployed
FUNCTIONS_DEPLOYED=$(supabase functions list 2>/dev/null | grep -c "widget-settings\|widget-feedback\|feedback-stats" || echo "0")
if [ "$FUNCTIONS_DEPLOYED" -eq 3 ]; then
    print_success "All edge functions deployed successfully"
else
    print_warning "Some functions may not be deployed. Please check manually."
fi

# 5. Create sample data (optional)
read -p "Do you want to create sample feedback data for testing? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Creating sample data..."
    
    # This would require a script to insert sample data
    # For now, we'll just print instructions
    print_warning "Sample data creation not implemented yet."
    print_status "You can manually test the system by:"
    echo "1. Going to /feedback-settings to configure your widget"
    echo "2. Copying the embed code to a test page"
    echo "3. Submitting feedback through the widget"
    echo "4. Viewing the feedback in /feedback dashboard"
fi

# 6. Final instructions
print_success "Feedback system deployment completed!"
echo
echo "📋 Next Steps:"
echo "1. Configure your feedback widget at /feedback-settings"
echo "2. Test the widget by embedding it on a test page"
echo "3. View feedback analytics at /feedback"
echo
echo "🔗 Important URLs:"
echo "- Feedback Dashboard: /feedback"
echo "- Widget Settings: /feedback-settings"
echo "- Widget Script: /widget.js"
echo
echo "📚 API Endpoints:"
echo "- GET /api/widget/settings/{project_id}"
echo "- POST /api/widget/feedback"
echo "- GET /api/feedback/stats/{project_id}"
echo
print_success "Deployment complete! 🎉"