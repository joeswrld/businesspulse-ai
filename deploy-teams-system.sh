#!/bin/bash

echo "🚀 Deploying Teams System..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    echo ""
    echo "📝 Manual deployment steps:"
    echo "1. Run the migration file: supabase/migrations/20241201000002_fix_teams_system.sql"
    echo "2. Or use the Supabase dashboard to run the SQL manually"
    exit 1
fi

# Deploy the database migration
echo "📊 Running database migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Teams system deployed successfully!"
    echo ""
    echo "🎉 Your Teams system is now ready!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Navigate to the Teams page in your app"
    echo "2. Create your first team"
    echo "3. Invite team members"
    echo "4. Enable real-time features"
    echo ""
    echo "🔧 Features available:"
    echo "• Team creation and management"
    echo "• Member invitations with roles"
    echo "• Real-time collaboration"
    echo "• Advanced search and filtering"
    echo "• Role-based access control"
else
    echo "❌ Migration failed. Please check the error messages above."
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Make sure you're connected to your Supabase project"
    echo "2. Check if the database is accessible"
    echo "3. Try running the migration manually in the Supabase dashboard"
fi