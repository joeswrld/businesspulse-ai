#!/bin/bash

# Deploy Global Project ID Uniqueness Migration
# This script ensures each project_id can only be used by one user globally

set -e

echo "🚀 Deploying Global Project ID Uniqueness Migration..."

# Check if we're in the right directory
if [ ! -f "migrate-global-project-id-unique.sql" ]; then
    echo "❌ Error: migrate-global-project-id-unique.sql not found in current directory"
    exit 1
fi

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Please install it first."
    echo "   Visit: https://supabase.com/docs/reference/cli"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Error: Not logged in to Supabase. Please run 'supabase login' first."
    exit 1
fi

echo "📋 Running migration script..."

# Run the migration
supabase db reset --linked

echo "✅ Migration completed successfully!"
echo ""
echo "🔒 Project ID changes implemented:"
echo "   • Project IDs are now globally unique across all users"
echo "   • New users start with empty Project ID field"
echo "   • Project ID is locked after first save"
echo "   • Project ID field is mandatory and validated"
echo "   • Real-time availability checking"
echo ""
echo "🌐 Your feedback system now ensures:"
echo "   • One Project ID per user globally"
echo "   • No duplicate Project IDs across different users"
echo "   • Secure Project ID locking mechanism"
echo ""
echo "🎉 Deployment complete! Users can now set unique Project IDs."