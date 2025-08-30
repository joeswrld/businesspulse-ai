#!/bin/bash

echo "🚀 Deploying Analytics Edge Functions..."

# Deploy the enhanced generateAnalytics function
echo "📊 Deploying generateAnalytics function..."
supabase functions deploy generateAnalytics

# Deploy the new deleteAnalytics function
echo "🗑️ Deploying deleteAnalytics function..."
supabase functions deploy deleteAnalytics

# Deploy the new exportAnalytics function
echo "📤 Deploying exportAnalytics function..."
supabase functions deploy exportAnalytics

echo "✅ Analytics functions deployed successfully!"

echo ""
echo "🔧 Next steps:"
echo "1. Run the database migration:"
echo "   supabase db push"
echo ""
echo "2. Set the GEMINI_API_KEY environment variable:"
echo "   supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here"
echo ""
echo "3. Test the analytics functionality in your app"
echo ""
echo "🎉 Analytics system is ready for real-time operation!"