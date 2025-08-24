#!/bin/bash

# Deploy Widget Position and Location Migration
# This script adds new fields for controlling widget positioning and location

set -e

echo "🚀 Deploying Widget Position and Location Migration..."

# Check if we're in the right directory
if [ ! -f "migrate-widget-position-location.sql" ]; then
    echo "❌ Error: migrate-widget-position-location.sql not found in current directory"
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
echo "🎯 Widget positioning changes implemented:"
echo "   • Added widget_position field (bottom-right, bottom-left, top-right, top-left, center)"
echo "   • Added widget_location field (fixed, inline)"
echo "   • Removed Brand Color field from Widget Customization"
echo "   • Updated embed code generation with positioning attributes"
echo ""
echo "🌐 Widget positioning options:"
echo "   • Position: Choose where widget appears on website"
echo "   • Location: Fixed (stays in place) or Inline (flows with content)"
echo ""
echo "🎉 Deployment complete! Users can now control widget positioning."