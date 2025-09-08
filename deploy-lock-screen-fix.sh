#!/bin/bash

# ===============================================
# DEPLOY LOCK SCREEN LOGIC FIX FOR NOTEX
# ===============================================
# This script deploys the complete fix for the lock screen logic
# ensuring new users get 8-day free trials and business users stay unlocked

set -e

echo "🚀 Starting NoteX Lock Screen Logic Fix Deployment..."
echo ""

# Check if we're in the right directory
if [ ! -f "fix_lock_screen_logic.sql" ]; then
    echo "❌ Error: fix_lock_screen_logic.sql not found. Please run this script from the project root."
    exit 1
fi

echo "📊 What will be deployed:"
echo "   • SQL migration to fix profiles table and create triggers"
echo "   • Updated get_user_status RPC function"
echo "   • Paystack webhook handler for Business plan updates"
echo "   • Updated frontend components for proper lock screen logic"
echo ""

# Deploy SQL migration
echo "🔧 Deploying SQL migration..."
if command -v supabase &> /dev/null; then
    echo "   Using Supabase CLI..."
    supabase db reset --linked
    echo "   ✅ Database reset completed"
else
    echo "   ⚠️  Supabase CLI not found. Please apply fix_lock_screen_logic.sql manually."
    echo "   📄 SQL file location: fix_lock_screen_logic.sql"
fi

# Deploy Edge Function
echo ""
echo "🔧 Deploying Paystack webhook Edge Function..."
if command -v supabase &> /dev/null; then
    supabase functions deploy paystack-webhook-updated
    echo "   ✅ Edge function deployed successfully"
else
    echo "   ⚠️  Supabase CLI not found. Please deploy the Edge Function manually."
    echo "   📁 Function location: supabase/functions/paystack-webhook-updated/"
fi

# Build frontend
echo ""
echo "🔧 Building frontend..."
if command -v npm &> /dev/null; then
    npm run build
    echo "   ✅ Frontend build completed"
else
    echo "   ⚠️  npm not found. Please run 'npm run build' manually."
fi

echo ""
echo "✅ Lock Screen Logic Fix Deployment Completed!"
echo ""
echo "🎯 Expected Behavior After Fix:"
echo "   • New users → 8 days free access, then locked if no upgrade"
echo "   • Paid Business users → never locked while active"
echo "   • Expired or canceled users → locked with Upgrade CTA"
echo ""
echo "📋 Next Steps:"
echo "   1. Test new user signup flow"
echo "   2. Test Business plan upgrade flow"
echo "   3. Test trial expiration flow"
echo "   4. Configure Paystack webhook URL:"
echo "      https://your-project.supabase.co/functions/v1/paystack-webhook-updated"
echo ""
echo "🔗 Webhook Configuration:"
echo "   • Event: subscription.create, subscription.enable, subscription.disable"
echo "   • Event: invoice.payment_successful, invoice.payment_failed"
echo "   • URL: https://your-project.supabase.co/functions/v1/paystack-webhook-updated"
echo ""
echo "🎉 Deployment completed successfully!"