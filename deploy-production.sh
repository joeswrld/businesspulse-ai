#!/bin/bash

# Production Deployment Script for InsightsSimplePage
# Run this script to deploy to production

set -e  # Exit on any error

echo "🚀 Starting Production Deployment for InsightsSimplePage..."

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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI is not installed. Installing..."
        npm install -g supabase
    fi
    
    print_success "Dependencies check completed"
}

# Build the application
build_app() {
    print_status "Building application..."
    
    # Install dependencies
    npm install
    
    # Build for production
    npm run build
    
    print_success "Application built successfully"
}

# Deploy Edge Function
deploy_edge_function() {
    print_status "Deploying Edge Function..."
    
    # Check if Supabase is linked
    if [ ! -f ".supabase/config.toml" ]; then
        print_warning "Supabase project not linked. Please run:"
        echo "supabase link --project-ref YOUR_PROJECT_REF"
        echo "Then run this script again."
        exit 1
    fi
    
    # Deploy the function
    supabase functions deploy analyze-insights
    
    print_success "Edge Function deployed successfully"
}

# Test the deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Test the build locally
    print_status "Testing build locally..."
    npm run preview &
    PREVIEW_PID=$!
    
    # Wait for preview to start
    sleep 5
    
    # Test if preview is running
    if curl -s http://localhost:4173 > /dev/null; then
        print_success "Local preview is working"
    else
        print_warning "Local preview test failed"
    fi
    
    # Kill preview process
    kill $PREVIEW_PID 2>/dev/null || true
    
    print_success "Deployment tests completed"
}

# Deploy to Vercel (if configured)
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    if command -v vercel &> /dev/null; then
        vercel --prod
        print_success "Deployed to Vercel successfully"
    else
        print_warning "Vercel CLI not found. Please install with: npm install -g vercel"
        print_status "You can deploy manually by running: vercel --prod"
    fi
}

# Run database migration
run_migration() {
    print_status "Running database migration..."
    
    print_warning "Please run the following SQL in your Supabase SQL editor:"
    echo ""
    echo "\\i create_insights_results_table_fixed.sql"
    echo ""
    echo "Then verify with:"
    echo "SELECT test_insights_results_table();"
    echo ""
    
    read -p "Press Enter after running the migration..."
}

# Verify environment variables
check_env_vars() {
    print_status "Checking environment variables..."
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        print_warning "NEXT_PUBLIC_SUPABASE_URL not set"
    else
        print_success "NEXT_PUBLIC_SUPABASE_URL is set"
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        print_warning "NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
    else
        print_success "NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
    fi
    
    print_warning "Make sure these environment variables are set in your production environment:"
    echo "- NEXT_PUBLIC_SUPABASE_URL"
    echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "- GEMINI_API_KEY (in Supabase)"
    echo "- SUPABASE_SERVICE_ROLE_KEY (in Supabase)"
}

# Main deployment process
main() {
    echo "🎯 InsightsSimplePage Production Deployment"
    echo "=========================================="
    echo ""
    
    # Check dependencies
    check_dependencies
    
    # Run database migration
    run_migration
    
    # Build application
    build_app
    
    # Deploy Edge Function
    deploy_edge_function
    
    # Test deployment
    test_deployment
    
    # Deploy to Vercel
    deploy_to_vercel
    
    # Check environment variables
    check_env_vars
    
    echo ""
    echo "🎉 Deployment completed!"
    echo ""
    echo "Next steps:"
    echo "1. Verify the Edge Function is working"
    echo "2. Test file upload and analysis"
    echo "3. Monitor logs and performance"
    echo "4. Set up monitoring and alerts"
    echo ""
    echo "For troubleshooting, see: FILE_UPLOAD_TROUBLESHOOTING.md"
}

# Run main function
main "$@"