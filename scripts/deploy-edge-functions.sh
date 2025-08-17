#!/bin/bash

# Deploy Edge Functions Script
# This script ensures all Edge Functions are properly deployed

echo "🚀 Deploying Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if project is linked
if ! supabase status &> /dev/null; then
    echo "❌ Supabase project not linked. Please link your project first:"
    echo "supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "📦 Deploying stream-insights Edge Function..."

# Deploy the stream-insights function
supabase functions deploy stream-insights --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ stream-insights function deployed successfully!"
else
    echo "❌ Failed to deploy stream-insights function"
    exit 1
fi

echo "🔑 Setting up environment variables..."

# Set Gemini API key (you'll need to provide this)
echo "Please enter your Gemini API key:"
read -s GEMINI_API_KEY

if [ -n "$GEMINI_API_KEY" ]; then
    supabase secrets set GEMINI_API_KEY="$GEMINI_API_KEY"
    echo "✅ Gemini API key set successfully!"
else
    echo "⚠️  No Gemini API key provided. Please set it manually:"
    echo "supabase secrets set GEMINI_API_KEY=your_api_key_here"
fi

echo "📋 Listing deployed functions..."
supabase functions list

echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test the function: supabase functions serve stream-insights"
echo "2. Check logs: supabase functions logs stream-insights"
echo "3. Verify in dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT/functions"