#!/bin/bash

# Deploy NoteX Feedback Widget
# This script builds and deploys the widget.js file to make it publicly available

echo "🚀 Deploying NoteX Feedback Widget..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if widget.js exists
if [ ! -f "public/widget.js" ]; then
    echo "❌ Error: widget.js not found in public directory"
    exit 1
fi

# Get the actual Supabase anon key from environment or config
echo "📋 Getting Supabase configuration..."

# Try to get the anon key from environment variables
if [ -f ".env.local" ]; then
    SUPABASE_ANON_KEY=$(grep "VITE_SUPABASE_ANON_KEY" .env.local | cut -d '=' -f2 | tr -d '"')
elif [ -f ".env" ]; then
    SUPABASE_ANON_KEY=$(grep "VITE_SUPABASE_ANON_KEY" .env | cut -d '=' -f2 | tr -d '"')
else
    echo "⚠️  Warning: No environment file found. Using placeholder key."
    echo "   Please update the widget.js file with the correct Supabase anon key."
    SUPABASE_ANON_KEY="PLACEHOLDER_KEY"
fi

# Update widget.js with the actual anon key
if [ "$SUPABASE_ANON_KEY" != "PLACEHOLDER_KEY" ] && [ ! -z "$SUPABASE_ANON_KEY" ]; then
    echo "🔑 Updating widget.js with Supabase anon key..."
    sed -i.bak "s/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0NzQ4NzQsImV4cCI6MjA1MTA1MDg3NH0\.placeholder/$SUPABASE_ANON_KEY/g" public/widget.js
    rm -f public/widget.js.bak
    echo "✅ Widget updated with Supabase configuration"
else
    echo "⚠️  Warning: Using placeholder key. Widget may not work properly."
fi

# Build the project to ensure everything is up to date
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed"
    exit 1
fi

# Copy widget.js to the build output
echo "📦 Copying widget.js to build output..."
cp public/widget.js dist/widget.js

# Check if Vercel CLI is available
if command -v vercel &> /dev/null; then
    echo "🚀 Deploying to Vercel..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo "✅ Widget deployed successfully!"
        echo "🌐 Widget is now available at: https://notex.com.ng/widget.js"
        echo "📝 Test page available at: https://notex.com.ng/widget-test.html"
    else
        echo "❌ Error: Vercel deployment failed"
        exit 1
    fi
else
    echo "⚠️  Vercel CLI not found. Please deploy manually:"
    echo "   1. Run: npm run build"
    echo "   2. Deploy the dist/ folder to your hosting provider"
    echo "   3. Ensure widget.js is accessible at https://notex.com.ng/widget.js"
fi

echo "🎉 Deployment process completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the widget at: https://notex.com.ng/widget-test.html"
echo "   2. Update your feedback settings in the NoteX dashboard"
echo "   3. Copy the embed code and test it on external websites"
echo ""
echo "🔗 Embed code format:"
echo "   <script src=\"https://notex.com.ng/widget.js\" data-project-id=\"YOUR_PROJECT_ID\"></script>"