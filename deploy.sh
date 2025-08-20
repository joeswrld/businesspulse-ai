#!/bin/bash

# NoteX Feedback System Deployment Script
# This script deploys the complete feedback system including database, widgets, and application

set -e  # Exit on any error

echo "🚀 Starting NoteX Feedback System Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "git is not installed. Please install git first."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Run the safe database setup
    print_status "Running database setup..."
    if [ -f "setup-feedback-safe.sql" ]; then
        print_status "Using safe database setup script..."
        # Note: This would need to be run in Supabase dashboard
        print_warning "Please run setup-feedback-safe.sql in your Supabase SQL Editor"
        print_status "Visit: https://supabase.com/dashboard/project/xjbrqeqizpoqdjkiyqzt/sql"
        print_status "Copy and paste the SQL content and run it"
    else
        print_error "Database setup script not found"
        exit 1
    fi
    
    print_success "Database setup instructions provided"
}

# Build the application
build_application() {
    print_status "Building application..."
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Build the application
    print_status "Building application..."
    npm run build
    
    print_success "Application built successfully"
}

# Deploy widgets to CDN
deploy_widgets() {
    print_status "Deploying widgets..."
    
    # Create widgets directory if it doesn't exist
    mkdir -p public/widgets
    
    # Copy widget files to public directory
    if [ -f "widget.js" ]; then
        cp widget.js public/widgets/
        print_success "Widget 1.0 deployed to public/widgets/"
    fi
    
    if [ -f "widget-2.0.js" ]; then
        cp widget-2.0.js public/widgets/
        print_success "Widget 2.0 deployed to public/widgets/"
    fi
    
    # Create a simple widget loader
    cat > public/widgets/loader.js << 'EOF'
// Widget Loader for NoteX
(function() {
    'use strict';
    
    // Auto-detect which widget to load
    const script = document.currentScript;
    const userId = script.getAttribute('data-user-id');
    const version = script.getAttribute('data-version') || '2.0';
    
    if (!userId) {
        console.error('NoteX Widget: User ID is required');
        return;
    }
    
    // Load the appropriate widget version
    const widgetScript = document.createElement('script');
    widgetScript.src = `https://notex.com.ng/widgets/widget-${version}.js`;
    widgetScript.setAttribute('data-user-id', userId);
    widgetScript.async = true;
    
    document.head.appendChild(widgetScript);
})();
EOF
    
    print_success "Widget loader created"
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Deploy to Vercel
    print_status "Running Vercel deployment..."
    vercel --prod
    
    print_success "Application deployed to Vercel"
}

# Deploy to other platforms
deploy_alternatives() {
    print_status "Setting up alternative deployment options..."
    
    # Create Netlify configuration
    cat > netlify.toml << 'EOF'
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
EOF
    
    # Create GitHub Actions workflow
    mkdir -p .github/workflows
    cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'
EOF
    
    print_success "Alternative deployment configurations created"
}

# Create deployment documentation
create_docs() {
    print_status "Creating deployment documentation..."
    
    cat > DEPLOYMENT_GUIDE.md << 'EOF'
# NoteX Feedback System - Deployment Guide

## 🚀 Quick Deployment

### 1. Database Setup
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/xjbrqeqizpoqdjkiyqzt/sql
2. Open SQL Editor
3. Copy and paste the contents of `setup-feedback-safe.sql`
4. Run the script

### 2. Application Deployment

#### Option A: Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### Option B: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

#### Option C: Manual Deployment
```bash
# Build the application
npm run build

# Upload the dist/ folder to your web server
```

### 3. Widget Deployment

The widgets are automatically included in the build and available at:
- Widget 1.0: `https://your-domain.com/widgets/widget.js`
- Widget 2.0: `https://your-domain.com/widgets/widget-2.0.js`

### 4. Environment Variables

Make sure these environment variables are set in your deployment platform:

```env
VITE_SUPABASE_URL=https://xjbrqeqizpoqdjkiyqzt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84
```

## 🔧 Post-Deployment Checklist

- [ ] Database tables created successfully
- [ ] Application deployed and accessible
- [ ] Widgets loading correctly
- [ ] Feedback form working
- [ ] Real-time updates functioning
- [ ] Settings page accessible
- [ ] Analytics tracking working

## 📞 Support

If you encounter any issues during deployment, check:
1. Database connection in Supabase dashboard
2. Environment variables in your deployment platform
3. Console errors in browser developer tools
4. Network connectivity for widget loading

## 🔗 Useful Links

- Supabase Dashboard: https://supabase.com/dashboard/project/xjbrqeqizpoqdjkiyqzt
- Vercel Dashboard: https://vercel.com/dashboard
- Application URL: https://your-deployed-app.vercel.app
EOF
    
    print_success "Deployment documentation created"
}

# Main deployment function
main() {
    echo "🎯 NoteX Feedback System Deployment"
    echo "=================================="
    
    check_dependencies
    setup_database
    build_application
    deploy_widgets
    deploy_alternatives
    create_docs
    
    echo ""
    echo "🎉 Deployment setup completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Run the database setup script in Supabase dashboard"
    echo "2. Deploy to your preferred platform (Vercel/Netlify)"
    echo "3. Test the widgets and feedback system"
    echo ""
    echo "📚 See DEPLOYMENT_GUIDE.md for detailed instructions"
}

# Run the deployment
main "$@"