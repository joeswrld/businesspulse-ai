#!/bin/bash

echo "🚀 Deploying Feedback Management System..."

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

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    print_error "Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/config.toml" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting deployment..."

# 1. Deploy database migrations
print_status "Deploying database migrations..."
supabase db push

if [ $? -eq 0 ]; then
    print_success "Database migrations deployed successfully"
else
    print_error "Failed to deploy database migrations"
    exit 1
fi

# 2. Deploy Edge Functions
print_status "Deploying Edge Functions..."

# Deploy process-feedback function
print_status "Deploying process-feedback function..."
supabase functions deploy process-feedback

if [ $? -eq 0 ]; then
    print_success "process-feedback function deployed successfully"
else
    print_error "Failed to deploy process-feedback function"
    exit 1
fi

# 3. Update widget.js with correct Supabase URL and key
print_status "Updating widget.js with Supabase configuration..."

# Get Supabase URL and anon key from config
SUPABASE_URL=$(grep -o 'project_id = "[^"]*"' supabase/config.toml | cut -d'"' -f2)
if [ -z "$SUPABASE_URL" ]; then
    print_error "Could not find project_id in supabase/config.toml"
    exit 1
fi

# You'll need to manually update the widget.js file with your actual Supabase URL and anon key
print_warning "Please manually update the following in public/widget.js:"
echo "1. Replace 'https://your-project.supabase.co' with your actual Supabase URL"
echo "2. Replace 'your-anon-key' with your actual Supabase anon key"
echo ""
echo "You can find these values in your Supabase dashboard under Settings > API"

# 4. Build the application
print_status "Building the application..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Application built successfully"
else
    print_error "Failed to build application"
    exit 1
fi

# 5. Create deployment summary
print_status "Creating deployment summary..."

cat > FEEDBACK_SYSTEM_DEPLOYMENT.md << EOF
# Feedback Management System Deployment

## ✅ Deployment Completed Successfully

### What was deployed:

1. **Database Schema**
   - \`feedback\` table - stores all feedback submissions
   - \`feedback_settings\` table - stores widget customization settings
   - \`feedback_notifications\` table - stores notification records
   - Database triggers for automatic processing
   - Row Level Security (RLS) policies

2. **Edge Functions**
   - \`process-feedback\` - processes new feedback, analyzes sentiment, creates notifications

3. **Frontend Pages**
   - \`/feedback\` - Feedback management dashboard
   - \`/feedback-settings\` - Widget customization settings

4. **Embeddable Widget**
   - \`public/widget.js\` - JavaScript widget for embedding on websites

### Next Steps:

1. **Update Widget Configuration**
   - Edit \`public/widget.js\`
   - Replace \`https://your-project.supabase.co\` with your Supabase URL
   - Replace \`your-anon-key\` with your Supabase anon key

2. **Test the System**
   - Visit \`/feedback-settings\` to customize your widget
   - Copy the embed code and test on a website
   - Check \`/feedback\` to see submitted feedback

3. **Optional: Email Integration**
   - The system is ready for email service integration
   - Update the \`process-feedback\` function to send actual emails

### Widget Usage:

Add this code to any website:
\`\`\`html
<script src="https://notex.com.ng/widget.js" data-user-id="YOUR_USER_ID"></script>
\`\`\`

### Features Included:

- ✅ Real-time feedback collection
- ✅ Automatic sentiment analysis
- ✅ Priority detection for urgent issues
- ✅ Email notifications (ready for integration)
- ✅ Customizable widget appearance
- ✅ Export feedback to TXT format
- ✅ Mobile-responsive design
- ✅ Analytics tracking

### API Endpoints:

- \`POST /rest/v1/feedback\` - Submit new feedback
- \`GET /rest/v1/feedback\` - Get feedback (with RLS)
- \`GET /rest/v1/feedback_settings\` - Get widget settings
- \`POST /functions/v1/process-feedback\` - Process feedback (Edge Function)

EOF

print_success "Deployment completed successfully!"
print_success "Check FEEDBACK_SYSTEM_DEPLOYMENT.md for details"

echo ""
print_status "🎉 Your Feedback Management System is now ready!"
echo ""
print_status "Quick start:"
echo "1. Visit /feedback-settings to customize your widget"
echo "2. Copy the embed code and test it on a website"
echo "3. Check /feedback to see submitted feedback"
echo ""
print_warning "Don't forget to update the Supabase URL and anon key in public/widget.js!"