#!/bin/bash

# Feedback System Deployment Script
# This script sets up the complete feedback system in NoteX

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting feedback system deployment..."

# Step 1: Deploy the feedback API function
print_status "Deploying feedback API function..."
if [ -d "supabase/functions/feedback-api" ]; then
    supabase functions deploy feedback-api
    print_success "Feedback API function deployed successfully"
else
    print_error "Feedback API function not found. Please ensure the function exists."
    exit 1
fi

# Step 2: Set up database tables
print_status "Setting up database tables..."
if [ -f "setup-feedback-system.sql" ]; then
    print_warning "IMPORTANT: Database Setup Options"
    echo ""
    echo "If you get a foreign key constraint error, choose the appropriate script:"
    echo ""
    echo "1. Fresh Setup (drops existing data): setup-feedback-system.sql"
    echo "2. Safe Migration (preserves data): migrate-feedback-system.sql"
    echo "3. Check current state: check-database-state.sql"
    echo ""
    print_warning "Please run the chosen SQL script in your Supabase SQL Editor:"
    echo ""
    echo "Copy and paste the contents of your chosen script"
    echo "Or run: cat [script-name].sql"
    echo ""
    read -p "Press Enter after you've run the SQL script..."
else
    print_error "setup-feedback-system.sql not found"
    exit 1
fi

# Step 3: Build the application
print_status "Building the application..."
npm run build
print_success "Application built successfully"

# Step 4: Deploy the feedback widget
print_status "Deploying feedback widget..."
if [ -f "public/feedback-widget.js" ]; then
    print_success "Feedback widget is ready for deployment"
    print_warning "Make sure to upload feedback-widget.js to your CDN or hosting service"
    print_warning "Update the widget URL in the embed code if needed"
else
    print_error "Feedback widget not found"
    exit 1
fi

# Step 5: Verify deployment
print_status "Verifying deployment..."

# Check if the function is accessible
FUNCTION_URL="https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/feedback-api"
print_status "Testing feedback API endpoint..."

# Test the function with a simple request
if curl -s -o /dev/null -w "%{http_code}" "$FUNCTION_URL" | grep -q "405"; then
    print_success "Feedback API is accessible (Method Not Allowed is expected for GET requests)"
else
    print_warning "Could not verify feedback API accessibility"
fi

print_success "🎉 Feedback System Deployment Complete!"
echo ""
echo "Next steps:"
echo "1. Run the SQL from setup-feedback-system.sql in your Supabase SQL Editor"
echo "2. Upload feedback-widget.js to your CDN (e.g., https://notex.com.ng/feedback-widget.js)"
echo "3. Test the feedback system by adding the widget to a test website"
echo "4. Configure your feedback settings in the NoteX dashboard"
echo ""
echo "For testing, you can use this embed code:"
echo "<script src=\"https://notex.com.ng/feedback-widget.js\" data-project-id=\"YOUR_PROJECT_ID\"></script>"
echo ""
print_success "Feedback system is now ready to use! 🚀"