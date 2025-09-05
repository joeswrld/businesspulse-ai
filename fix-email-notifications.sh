#!/bin/bash

echo "🔧 Fixing Email Notifications for Feedback..."
echo "============================================="

# Check if we're in the right directory
if [ ! -f "supabase/functions/send-feedback-email/index.ts" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Found Edge Function file"

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Deploy the Edge Function
echo ""
echo "🚀 Deploying send-feedback-email Edge Function..."
supabase functions deploy send-feedback-email

if [ $? -eq 0 ]; then
    echo "✅ Edge Function deployed successfully"
else
    echo "❌ Failed to deploy Edge Function"
    exit 1
fi

# Check if user is logged in to Supabase
echo ""
echo "🔐 Checking Supabase authentication..."
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run: supabase login"
    exit 1
fi

echo "✅ Supabase authentication confirmed"

# Apply database trigger
echo ""
echo "📊 Applying database trigger..."
echo "Please run the following SQL in your Supabase SQL Editor:"
echo ""
echo "--- Copy and paste this SQL into Supabase SQL Editor ---"
cat feedback_webhook_trigger.sql
echo ""
echo "--- End of SQL ---"

echo ""
echo "🎉 Email notification fix complete!"
echo ""
echo "📋 Manual steps required:"
echo "   1. Go to your Supabase project dashboard"
echo "   2. Navigate to SQL Editor"
echo "   3. Copy and paste the SQL above"
echo "   4. Run the SQL to create the trigger"
echo "   5. Set RESEND_API_KEY in Edge Functions environment variables:"
echo "      - Go to Settings > Edge Functions"
echo "      - Add RESEND_API_KEY = your_resend_api_key"
echo ""
echo "🧪 Testing:"
echo "   1. Go to your feedback page"
echo "   2. Check browser console for 'Feedback webhook subscription status: SUBSCRIBED'"
echo "   3. Submit new feedback through your widget"
echo "   4. Check your email for the notification"
echo ""
echo "🔍 Debug if not working:"
echo "   1. Check browser console for errors"
echo "   2. Check Supabase logs: supabase functions logs send-feedback-email --follow"
echo "   3. Verify trigger exists: SELECT * FROM information_schema.triggers WHERE trigger_name = 'feedback_webhook_trigger';"