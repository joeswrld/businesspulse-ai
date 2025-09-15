#!/bin/bash

# Phase 5 Monetization Deployment Script for NoteX
# This script deploys the complete monetization system with usage-based billing

set -e

echo "🚀 Starting Phase 5 Monetization Deployment for NoteX..."

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

print_status "Deploying Phase 5 Monetization System..."

# 1. Deploy database schema
print_status "Step 1: Deploying database schema..."
if [ -f "phase5_monetization_schema.sql" ]; then
    supabase db reset --linked
    supabase db push --linked
    print_success "Database schema deployed successfully"
else
    print_error "phase5_monetization_schema.sql not found"
    exit 1
fi

# 2. Deploy Supabase functions
print_status "Step 2: Deploying Supabase functions..."

# Deploy usage tracking function
if [ -f "supabase/functions/usage-tracking/index.ts" ]; then
    supabase functions deploy usage-tracking --linked
    print_success "Usage tracking function deployed"
else
    print_warning "Usage tracking function not found, skipping..."
fi

# Deploy enhanced Paystack webhook
if [ -f "supabase/functions/paystack-webhook-enhanced/index.ts" ]; then
    supabase functions deploy paystack-webhook-enhanced --linked
    print_success "Enhanced Paystack webhook deployed"
else
    print_warning "Enhanced Paystack webhook not found, skipping..."
fi

# Deploy billing maintenance functions
if [ -f "supabase_functions_and_cron_jobs.sql" ]; then
    supabase db push --linked
    print_success "Billing maintenance functions deployed"
else
    print_warning "Billing maintenance functions not found, skipping..."
fi

# 3. Set up environment variables
print_status "Step 3: Setting up environment variables..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found, creating template..."
    cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Paystack Configuration
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
    print_warning "Please update .env.local with your actual values"
fi

# 4. Install dependencies
print_status "Step 4: Installing dependencies..."
npm install

# 5. Build the application
print_status "Step 5: Building the application..."
npm run build

# 6. Set up cron jobs (if using a cron service)
print_status "Step 6: Setting up cron jobs..."

# Create a cron job configuration file
cat > cron_jobs.md << EOF
# Phase 5 Monetization Cron Jobs

## Required Cron Jobs

### 1. Monthly Usage Reset
- **Schedule**: 0 0 1 * * (1st of every month at midnight)
- **Function**: reset_monthly_usage()
- **Description**: Resets all usage counters for the new month

### 2. Daily Usage Warnings
- **Schedule**: 0 9 * * * (Every day at 9 AM)
- **Function**: check_and_send_usage_warnings()
- **Description**: Checks usage limits and sends warning notifications

### 3. Daily Trial Expiration Check
- **Schedule**: 0 10 * * * (Every day at 10 AM)
- **Function**: handle_trial_expiration()
- **Description**: Handles expired trials and sends notifications

### 4. Daily Subscription Reconciliation
- **Schedule**: 0 11 * * * (Every day at 11 AM)
- **Function**: reconcile_subscription_status()
- **Description**: Reconciles subscription status with end dates

### 5. Daily Billing Maintenance
- **Schedule**: 0 12 * * * (Every day at noon)
- **Function**: run_billing_maintenance()
- **Description**: Runs all billing maintenance tasks

## Manual Execution

You can manually run any cron job using:

\`\`\`sql
SELECT run_cron_job('job_name');
\`\`\`

Available job names:
- monthly_reset
- usage_warnings
- trial_expiration
- subscription_reconciliation
- billing_maintenance
EOF

print_success "Cron job configuration created (see cron_jobs.md)"

# 7. Create deployment checklist
print_status "Step 7: Creating deployment checklist..."

cat > deployment_checklist.md << EOF
# Phase 5 Monetization Deployment Checklist

## ✅ Database Schema
- [ ] Profiles table updated with plan and usage_count fields
- [ ] Plan tiers table created with Free, Business, Scale plans
- [ ] Usage tracking table created
- [ ] Subscription history table created
- [ ] Billing notifications table created
- [ ] Archive tables created for historical data
- [ ] RLS policies configured
- [ ] Indexes created for performance

## ✅ Supabase Functions
- [ ] Usage tracking function deployed
- [ ] Enhanced Paystack webhook deployed
- [ ] Billing maintenance functions deployed
- [ ] Database triggers created for automatic usage tracking

## ✅ Frontend Components
- [ ] UsageBar component created
- [ ] Enhanced BillingPage component created
- [ ] FeatureLock component created
- [ ] BillingNotifications component created
- [ ] Enhanced Dashboard with usage overview

## ✅ Hooks and Utilities
- [ ] Enhanced usage tracking hook created
- [ ] Feature access checking hook created
- [ ] Billing constants updated

## ✅ Environment Variables
- [ ] Supabase URL and keys configured
- [ ] Paystack public and secret keys configured
- [ ] Application URL configured

## ✅ Cron Jobs Setup
- [ ] Monthly usage reset scheduled
- [ ] Daily usage warnings scheduled
- [ ] Daily trial expiration check scheduled
- [ ] Daily subscription reconciliation scheduled
- [ ] Daily billing maintenance scheduled

## ✅ Testing
- [ ] Test user registration and trial creation
- [ ] Test feedback submission and usage tracking
- [ ] Test plan upgrade flow
- [ ] Test usage limit enforcement
- [ ] Test notification system
- [ ] Test Paystack webhook integration

## ✅ Production Deployment
- [ ] Deploy to production environment
- [ ] Configure production environment variables
- [ ] Set up production cron jobs
- [ ] Test production payment flow
- [ ] Monitor usage tracking accuracy
- [ ] Verify notification delivery

## Post-Deployment Tasks
1. Monitor usage tracking accuracy
2. Verify payment processing
3. Check notification delivery
4. Monitor system performance
5. Review billing analytics
6. Test customer support flows
EOF

print_success "Deployment checklist created (see deployment_checklist.md)"

# 8. Create integration guide
print_status "Step 8: Creating integration guide..."

cat > integration_guide.md << EOF
# Phase 5 Monetization Integration Guide

## Overview
This guide explains how to integrate the Phase 5 monetization system into your existing NoteX application.

## Key Components

### 1. Usage Tracking
The system automatically tracks usage for:
- Feedback submissions
- AI insights generation
- Report generation
- Team member additions

### 2. Plan Tiers
- **Free**: 50 feedback, 5 AI insights, 2 reports
- **Business**: 300 feedback, 50 AI insights, 20 reports
- **Scale**: Unlimited everything

### 3. Feature Locking
Features are automatically locked when users exceed their plan limits.

## Integration Steps

### 1. Update Dashboard
Replace your existing Dashboard component with DashboardEnhanced:

\`\`\`tsx
import DashboardEnhanced from '@/pages/DashboardEnhanced';

// Use DashboardEnhanced instead of Dashboard
\`\`\`

### 2. Update Settings Page
Replace your existing Settings component with EnhancedBillingPage:

\`\`\`tsx
import EnhancedBillingPage from '@/components/billing/EnhancedBillingPage';

// Use EnhancedBillingPage for billing management
\`\`\`

### 3. Add Usage Tracking to Forms
Use the enhanced usage tracking hook:

\`\`\`tsx
import { useFeedbackTracking } from '@/hooks/useUsageTrackingEnhanced';

const { trackFeedbackSubmission, canSubmitFeedback } = useFeedbackTracking();

const handleSubmitFeedback = async () => {
  const canSubmit = await trackFeedbackSubmission();
  if (canSubmit) {
    // Proceed with feedback submission
  }
};
\`\`\`

### 4. Add Feature Locking
Wrap components that should be locked:

\`\`\`tsx
import FeatureLock from '@/components/billing/FeatureLock';

<FeatureLock featureType="feedback" requiredAmount={1}>
  <YourFeedbackForm />
</FeatureLock>
\`\`\`

### 5. Add Notifications
Add billing notifications to your layout:

\`\`\`tsx
import BillingNotifications from '@/components/billing/BillingNotifications';

<BillingNotifications maxItems={5} />
\`\`\`

## Environment Variables Required

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Paystack
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# Application
NEXT_PUBLIC_APP_URL=your_app_url
\`\`\`

## Testing

### 1. Test User Registration
- Create a new user account
- Verify trial period is set correctly
- Check usage counters are initialized

### 2. Test Usage Tracking
- Submit feedback and verify usage increment
- Generate AI insights and verify usage increment
- Create reports and verify usage increment

### 3. Test Plan Limits
- Exceed free plan limits
- Verify features are locked
- Test upgrade flow

### 4. Test Payments
- Test Paystack integration
- Verify subscription activation
- Test webhook processing

## Monitoring

### 1. Usage Analytics
Monitor usage patterns and limits:
\`\`\`sql
SELECT * FROM user_billing_dashboard;
\`\`\`

### 2. Billing Analytics
Monitor revenue and subscriptions:
\`\`\`sql
SELECT * FROM billing_analytics_dashboard;
\`\`\`

### 3. System Logs
Monitor system operations:
\`\`\`sql
SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 100;
\`\`\`

## Troubleshooting

### Common Issues

1. **Usage not tracking**: Check database triggers are created
2. **Payments not processing**: Verify Paystack webhook configuration
3. **Notifications not sending**: Check notification preferences
4. **Features not locking**: Verify plan limits configuration

### Debug Commands

\`\`\`sql
-- Check user's current usage
SELECT * FROM get_user_current_usage('user_id');

-- Check user's plan limits
SELECT * FROM get_user_plan_limits('user_id');

-- Check if user can perform action
SELECT can_perform_action('user_id', 'feedback', 1);

-- Run manual cron job
SELECT run_cron_job('usage_warnings');
\`\`\`
EOF

print_success "Integration guide created (see integration_guide.md)"

# 9. Final status
print_status "Step 9: Final deployment status..."

echo ""
print_success "🎉 Phase 5 Monetization System Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Update your environment variables in .env.local"
echo "2. Review the deployment checklist (deployment_checklist.md)"
echo "3. Follow the integration guide (integration_guide.md)"
echo "4. Set up cron jobs as described in cron_jobs.md"
echo "5. Test the system thoroughly"
echo ""
echo "📚 Documentation Created:"
echo "- deployment_checklist.md"
echo "- integration_guide.md"
echo "- cron_jobs.md"
echo ""
echo "🔧 Manual Setup Required:"
echo "- Configure Paystack webhook URL"
echo "- Set up cron jobs (monthly/daily)"
echo "- Test payment flow"
echo "- Monitor usage tracking"
echo ""
print_success "Deployment completed successfully! 🚀"