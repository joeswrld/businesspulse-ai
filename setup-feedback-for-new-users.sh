#!/bin/bash

# Setup Feedback System for New Users
# This script sets up the database functions needed for the feedback system

echo "Setting up feedback system for new users..."

# Check if we have the required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required"
    echo "Please set these variables and try again"
    exit 1
fi

# Run the SQL setup
echo "Creating database functions..."
psql "$SUPABASE_URL" -f create_feedback_settings_for_user.sql

if [ $? -eq 0 ]; then
    echo "✅ Feedback system setup completed successfully!"
    echo ""
    echo "The following functions have been created:"
    echo "- create_feedback_settings_for_user(UUID): Creates tables and default settings for new users"
    echo "- ensure_user_feedback_settings(UUID): Ensures a user has feedback settings"
    echo ""
    echo "New users will now be able to access the feedback settings page without errors."
else
    echo "❌ Error setting up feedback system"
    exit 1
fi