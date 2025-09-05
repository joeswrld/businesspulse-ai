#!/bin/bash

echo "🚀 Deploying Feedback Email Notifications..."
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

# Apply database triggers
echo ""
echo "📊 Applying database triggers..."

# Apply the realtime notification trigger
echo "Applying realtime notification trigger..."
supabase db reset --linked

# Note: You'll need to manually run the SQL files in your Supabase dashboard
# or use the SQL editor to apply the triggers

echo ""
echo "🎉 Feedback Email Notifications deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Set up your Resend API key in Supabase:"
echo "      - Go to your Supabase project dashboard"
echo "      - Navigate to Settings > Edge Functions"
echo "      - Add RESEND_API_KEY to your environment variables"
echo ""
echo "   2. Apply the database triggers:"
echo "      - Go to your Supabase SQL Editor"
echo "      - Run the SQL from feedback_realtime_notification.sql"
echo ""
echo "   3. Add the hook to your feedback page:"
echo "      - Import useFeedbackEmailNotifications in your feedback page"
echo "      - Call the hook to enable email notifications"
echo ""
echo "   4. Test the functionality:"
echo "      - Insert a test feedback entry"
echo "      - Check that an email is sent to the user"
echo "      - Check Supabase logs for any errors"
echo ""
echo "✨ Email notifications will now be sent automatically for new feedback!"