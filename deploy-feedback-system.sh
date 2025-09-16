#!/bin/bash

# Deploy Feedback System to Supabase
echo "🚀 Deploying Feedback System to Supabase..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first."
    echo "Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Please login to Supabase CLI first:"
    echo "supabase login"
    exit 1
fi

echo "📋 Deploying database schema..."

# Deploy the schema
supabase db push --file feedback_system_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema deployed successfully!"
else
    echo "❌ Failed to deploy database schema"
    exit 1
fi

echo "🎉 Feedback system deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update the API key in public/widget.js with your actual Supabase anon key"
echo "2. Update the API URL in public/widget.js with your actual Supabase URL"
echo "3. Test the feedback system by visiting /feedback-settings in your app"
echo ""
echo "🔗 Available pages:"
echo "- /feedback-settings - Configure your widget"
echo "- /feedback - View all feedback entries"
echo "- /widget - Preview and get embed code"