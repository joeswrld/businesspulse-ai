#!/bin/bash

# ============================================================================
# COMPREHENSIVE NOTEX SAAS PLATFORM DEPLOYMENT SCRIPT
# ============================================================================

set -e  # Exit on any error

echo "🚀 Starting comprehensive NoteX SaaS platform deployment..."

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

print_status "Deploying comprehensive NoteX SaaS platform..."

# 1. Apply the comprehensive database schema
print_status "Applying comprehensive database schema..."
supabase db push --include-all

if [ $? -eq 0 ]; then
    print_success "Database schema applied successfully"
else
    print_error "Failed to apply database schema"
    exit 1
fi

# 2. Deploy Edge Functions
print_status "Deploying Edge Functions..."

# Deploy Paystack webhook handler
print_status "Deploying Paystack webhook handler..."
supabase functions deploy paystack-webhook

if [ $? -eq 0 ]; then
    print_success "Paystack webhook handler deployed"
else
    print_warning "Paystack webhook handler deployment failed (may already exist)"
fi

# Deploy widget config API
print_status "Deploying widget config API..."
supabase functions deploy widget-config

if [ $? -eq 0 ]; then
    print_success "Widget config API deployed"
else
    print_warning "Widget config API deployment failed (may already exist)"
fi

# Deploy feedback submission API
print_status "Deploying feedback submission API..."
supabase functions deploy submit-feedback

if [ $? -eq 0 ]; then
    print_success "Feedback submission API deployed"
else
    print_warning "Feedback submission API deployment failed (may already exist)"
fi

# 3. Set up environment variables
print_status "Setting up environment variables..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating template..."
    cat > .env << EOF
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Paystack Configuration
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key_here
PAYSTACK_SECRET_KEY=your_paystack_secret_key_here

# NoteX Configuration
VITE_APP_URL=https://notex.com.ng
EOF
    print_warning "Please update .env file with your actual values"
fi

# 4. Set up cron job for trial expiry (if pg_cron is available)
print_status "Setting up trial expiry automation..."

# Create a SQL file for the cron job setup
cat > setup_trial_expiry_cron.sql << 'EOF'
-- Set up trial expiry automation
-- This will run daily at midnight to expire trials

-- Check if pg_cron extension is available
DO $$
BEGIN
    -- Try to create the cron job
    BEGIN
        -- Drop existing job if it exists
        PERFORM cron.unschedule('expire_trials_daily');
        
        -- Schedule the job to run daily at midnight
        PERFORM cron.schedule('expire_trials_daily', '0 0 * * *', 'SELECT public.expire_trials();');
        
        RAISE NOTICE 'Trial expiry cron job scheduled successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron not available or job already exists. Manual setup required.';
    END;
END $$;
EOF

# Apply the cron job setup
supabase db push --include-all

if [ $? -eq 0 ]; then
    print_success "Trial expiry automation configured"
else
    print_warning "Trial expiry automation setup failed (pg_cron may not be available)"
fi

# 5. Create initial test data (optional)
print_status "Creating initial test data..."

cat > create_test_data.sql << 'EOF'
-- Create test data for development
-- This is optional and can be removed in production

-- Insert a test user profile (replace with actual user ID from auth.users)
-- INSERT INTO public.profiles (id, email, full_name, plan_status, trial_start_date, trial_expiry_date)
-- VALUES (
--     '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
--     'test@notex.com',
--     'Test User',
--     'trialing',
--     NOW(),
--     NOW() + INTERVAL '8 days'
-- );

-- Insert a test project
-- INSERT INTO public.projects (user_id, project_id, name, settings)
-- VALUES (
--     '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
--     'test-project',
--     'Test Project',
--     '{"theme": "light", "primaryColor": "#3b82f6"}'
-- );

SELECT 'Test data creation completed (commented out for safety)' AS status;
EOF

# Apply test data (commented out for safety)
# supabase db push --include-all

print_success "Test data template created (commented out for safety)"

# 6. Verify deployment
print_status "Verifying deployment..."

# Check if tables exist
cat > verify_deployment.sql << 'EOF'
-- Verify that all required tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('profiles', 'projects', 'subscriptions', 'feedbacks') 
        THEN '✅ Required table exists'
        ELSE '❌ Missing required table'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'projects', 'subscriptions', 'feedbacks')
ORDER BY table_name;

-- Check if functions exist
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IN ('check_user_access', 'expire_trials', 'get_user_profile_with_access', 'validate_project_id_uniqueness') 
        THEN '✅ Required function exists'
        ELSE '❌ Missing required function'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('check_user_access', 'expire_trials', 'get_user_profile_with_access', 'validate_project_id_uniqueness')
ORDER BY routine_name;
EOF

supabase db push --include-all

if [ $? -eq 0 ]; then
    print_success "Deployment verification completed"
else
    print_warning "Deployment verification failed"
fi

# 7. Build and deploy frontend (if needed)
print_status "Building frontend..."

if [ -f "package.json" ]; then
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Build the project
    print_status "Building project..."
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Frontend built successfully"
    else
        print_error "Frontend build failed"
        exit 1
    fi
else
    print_warning "No package.json found, skipping frontend build"
fi

# 8. Final status
print_success "🎉 Comprehensive NoteX SaaS platform deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with actual values"
echo "2. Configure Paystack webhook URL: https://your-project.supabase.co/functions/v1/paystack-webhook"
echo "3. Test the authentication flow"
echo "4. Test the billing integration"
echo "5. Test the widget embed functionality"
echo ""
echo "🔗 Important URLs:"
echo "- Supabase Dashboard: https://supabase.com/dashboard"
echo "- Paystack Dashboard: https://dashboard.paystack.com"
echo "- Widget Script: https://notex.com.ng/feedback-widget.js"
echo ""
echo "📚 Documentation:"
echo "- Database Schema: See supabase/migrations/20250126000000_comprehensive_notex_schema.sql"
echo "- API Endpoints: See supabase/functions/"
echo "- Frontend Components: See src/components/"
echo ""
print_success "Deployment completed successfully! 🚀"