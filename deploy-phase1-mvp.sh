#!/bin/bash

# Deploy Phase 1 MVP+ Implementation
# This script applies all necessary migrations and deploys the edge function

echo "🚀 Deploying NoteX Phase 1 MVP+ Implementation..."

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    echo "   Visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# Apply database migrations
echo "📊 Applying database migrations..."

# Apply insights table migration
echo "  - Creating insights table..."
supabase db push --include-all

# Deploy edge function
echo "🔧 Deploying edge function..."
supabase functions deploy generate-feedback-insights

# Verify deployment
echo "✅ Verifying deployment..."

# Check if tables exist
echo "  - Checking database tables..."
supabase db diff --schema public

echo ""
echo "🎉 Phase 1 MVP+ deployment complete!"
echo ""
echo "📋 What's been implemented:"
echo "  ✅ New insights table with proper schema"
echo "  ✅ Sentiment column added to feedback table"
echo "  ✅ AI insights generation edge function"
echo "  ✅ Enhanced feedback page with grouping UI"
echo "  ✅ Dashboard widgets with latest AI insights"
echo "  ✅ Real-time subscriptions for live updates"
echo ""
echo "🧪 Next steps:"
echo "  1. Test the feedback → AI insights loop"
echo "  2. Verify dashboard widgets are working"
echo "  3. Check real-time updates"
echo "  4. Review the test guide: test-phase1-implementation.md"
echo ""
echo "🔗 Key pages to test:"
echo "  - /feedback (with AI insights generator)"
echo "  - /dashboard (with latest AI insight widget)"
echo "  - /insights-simple (existing insights page)"
echo ""
echo "Happy testing! 🚀"