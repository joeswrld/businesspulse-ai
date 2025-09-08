#!/bin/bash

echo "🚀 Deploying Feedback Usage Limits System..."
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "supabase/functions/create-feedback/index.ts" ]; then
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
echo "🚀 Deploying create-feedback Edge Function..."
supabase functions deploy create-feedback

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

# Apply database schema
echo ""
echo "📊 Applying database schema..."
echo "Please run the following SQL in your Supabase SQL Editor:"
echo ""
echo "--- Copy and paste this SQL into Supabase SQL Editor ---"
cat usage_counters_schema.sql
echo ""
echo "--- End of SQL ---"

echo ""
echo "🎉 Feedback Usage Limits System deployment complete!"
echo ""
echo "📋 Manual steps required:"
echo "   1. Go to your Supabase project dashboard"
echo "   2. Navigate to SQL Editor"
echo "   3. Copy and paste the SQL above"
echo "   4. Run the SQL to create the usage_counters table"
echo ""
echo "🔧 Plan Limits:"
echo "   • Free Plan: 50 feedbacks per month"
echo "   • Pro Plan: 300 feedbacks per month"
echo "   • Business Plan: Unlimited feedbacks"
echo ""
echo "🧪 Testing:"
echo "   1. Go to your feedback page"
echo "   2. Check the usage display component"
echo "   3. Submit feedback through your widget"
echo "   4. Verify usage limits are enforced"
echo ""
echo "📝 API Usage:"
echo "   POST /functions/v1/create-feedback"
echo "   Headers: Authorization: Bearer <token>"
echo "   Body: { project_id, message, name?, email?, sentiment?, tags? }"
echo ""
echo "✨ Usage limits are now active for all feedback submissions!"