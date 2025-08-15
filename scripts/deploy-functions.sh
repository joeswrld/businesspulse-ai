#!/bin/bash

# Deploy Supabase Edge Functions
echo "🚀 Deploying Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if project is linked
if ! supabase status &> /dev/null; then
    echo "❌ Project not linked. Please link your project first:"
    echo "supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

# Deploy all functions
echo "📦 Deploying process-upload function..."
supabase functions deploy process-upload --no-verify-jwt

echo "📦 Deploying generate-report function..."
supabase functions deploy generate-report --no-verify-jwt

echo "📦 Deploying paystack-webhook function..."
supabase functions deploy paystack-webhook --no-verify-jwt

echo "✅ All Edge Functions deployed successfully!"

# List deployed functions
echo "📋 Deployed functions:"
supabase functions list

echo "🎉 Deployment complete!"