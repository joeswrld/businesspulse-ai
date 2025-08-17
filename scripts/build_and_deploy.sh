#!/bin/bash

# Real-Time Data Upload & AI Insights - Build and Deploy Script
# This script helps you deploy the complete system

echo "🚀 Building and Deploying Real-Time Data Upload & AI Insights System"
echo "=================================================================="

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
check_supabase_cli() {
    print_status "Checking Supabase CLI installation..."
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Please install it first:"
        echo "npm install -g supabase"
        echo "or visit: https://supabase.com/docs/guides/cli"
        exit 1
    else
        print_success "Supabase CLI is installed"
    fi
}

# Check if user is logged in to Supabase
check_supabase_auth() {
    print_status "Checking Supabase authentication..."
    if ! supabase status &> /dev/null; then
        print_warning "You need to login to Supabase first:"
        echo "supabase login"
        echo "supabase link --project-ref YOUR_PROJECT_REF"
        exit 1
    else
        print_success "Supabase project is linked"
    fi
}

# Deploy Edge Function
deploy_edge_function() {
    print_status "Deploying generate_insights Edge Function..."
    
    if [ -d "supabase/functions/generate_insights" ]; then
        supabase functions deploy generate_insights
        if [ $? -eq 0 ]; then
            print_success "Edge Function deployed successfully"
        else
            print_error "Failed to deploy Edge Function"
            exit 1
        fi
    else
        print_error "Edge Function directory not found"
        exit 1
    fi
}

# Set environment variables
set_environment_variables() {
    print_status "Setting up environment variables..."
    
    echo ""
    echo "Please set the following environment variables in your Supabase Dashboard:"
    echo "1. Go to Settings → Edge Functions"
    echo "2. Add the following variables:"
    echo ""
    echo "GEMINI_API_KEY=your_gemini_api_key_here"
    echo ""
    echo "To get a Gemini API key:"
    echo "1. Visit https://makersuite.google.com/app/apikey"
    echo "2. Create a new API key"
    echo "3. Copy the key and add it to Supabase"
    echo ""
    
    read -p "Press Enter when you've set the environment variables..."
}

# Database setup instructions
setup_database() {
    print_status "Setting up database..."
    
    echo ""
    echo "Please run the following SQL in your Supabase Dashboard SQL Editor:"
    echo ""
    echo "1. Go to SQL Editor in your Supabase Dashboard"
    echo "2. Copy and paste the contents of scripts/create_ai_insights_table.sql"
    echo "3. Run the SQL script"
    echo ""
    
    read -p "Press Enter when you've set up the database..."
}

# Test the deployment
test_deployment() {
    print_status "Testing deployment..."
    
    echo ""
    echo "To test the deployment:"
    echo "1. Start your development server: npm run dev"
    echo "2. Navigate to /upload"
    echo "3. Upload a file or enter text"
    echo "4. Check that insights are generated and appear on /ai-insights"
    echo ""
    
    read -p "Press Enter when you're ready to test..."
}

# Main deployment flow
main() {
    echo ""
    print_status "Starting deployment process..."
    
    # Check prerequisites
    check_supabase_cli
    check_supabase_auth
    
    # Setup database
    setup_database
    
    # Deploy Edge Function
    deploy_edge_function
    
    # Set environment variables
    set_environment_variables
    
    # Test deployment
    test_deployment
    
    print_success "Deployment completed successfully!"
    echo ""
    echo "🎉 Your Real-Time Data Upload & AI Insights system is now ready!"
    echo ""
    echo "Next steps:"
    echo "1. Test the upload functionality"
    echo "2. Verify real-time updates work"
    echo "3. Check that AI insights are generated"
    echo "4. Monitor Edge Function logs for any issues"
    echo ""
    echo "For support, check the REALTIME_UPLOAD_README.md file"
}

# Run the main function
main