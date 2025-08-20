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
