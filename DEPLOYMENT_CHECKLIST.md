# 🚀 Feedback System Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Node.js 16+ installed
- [ ] npm installed
- [ ] Supabase CLI installed globally (`npm install -g supabase`)
- [ ] Git repository cloned and up to date
- [ ] Working directory is project root

### 2. Supabase Project Setup
- [ ] Supabase account created
- [ ] New project created in Supabase dashboard
- [ ] Project reference ID copied
- [ ] Supabase CLI logged in (`supabase login`)

### 3. Local Development
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables configured
- [ ] Local development server runs (`npm run dev`)

---

## 🔧 Step-by-Step Deployment Process

### Step 1: Link to Supabase Project
```bash
# Replace YOUR_PROJECT_ID with your actual project ID
supabase link --project-ref YOUR_PROJECT_ID
```

**Expected Output:**
```
Finished supabase link.
```

### Step 2: Deploy Database Schema
```bash
supabase db push
```

**Expected Output:**
```
Applying migration 20240101000001_create_feedback_system.sql...
Applying migration 20240101000002_create_feedback_triggers.sql...
Finished supabase db push.
```

**Verify in Supabase Dashboard:**
- [ ] Go to Database > Tables
- [ ] Check that `feedback` table exists
- [ ] Check that `feedback_settings` table exists
- [ ] Check that `feedback_notifications` table exists

### Step 3: Deploy Edge Function
```bash
supabase functions deploy process-feedback
```

**Expected Output:**
```
Deployed function process-feedback (https://your-project.supabase.co/functions/v1/process-feedback)
```

**Verify in Supabase Dashboard:**
- [ ] Go to Edge Functions
- [ ] Check that `process-feedback` function is listed
- [ ] Status should be "Active"

### Step 4: Get Supabase Configuration
1. **Go to Supabase Dashboard > Settings > API**
2. **Copy the following values:**
   - Project URL (e.g., `https://abcdefghijklmnop.supabase.co`)
   - Anon public key (starts with `eyJ...`)

### Step 5: Update Widget Configuration
1. **Edit `public/widget.js`**
2. **Update these lines:**
   ```javascript
   let config = {
     userId: null,
     apiUrl: 'https://YOUR_PROJECT_ID.supabase.co', // Replace with your URL
     supabaseKey: 'YOUR_ANON_KEY', // Replace with your anon key
     // ... rest of config
   };
   ```

### Step 6: Update Environment Variables
1. **Create or edit `.env` file:**
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```

### Step 7: Build Application
```bash
npm run build
```

**Expected Output:**
```
✓ built in X.XXs
```

### Step 8: Deploy Frontend
**Choose your hosting platform:**

#### Option A: Vercel
```bash
npm install -g vercel
vercel --prod
```

#### Option B: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Option C: Manual Upload
- Upload `dist` folder contents to your web server

---

## 🧪 Post-Deployment Testing

### 1. Test Feedback Settings Page
- [ ] Visit `https://your-domain.com/feedback-settings`
- [ ] Verify page loads without errors
- [ ] Test color picker functionality
- [ ] Test greeting text input
- [ ] Test button placement selection
- [ ] Copy embed code

### 2. Test Widget Embedding
- [ ] Create a test HTML file:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Widget Test</title>
   </head>
   <body>
       <h1>Test Page</h1>
       <p>This is a test page for the feedback widget.</p>
       
       <!-- Replace with your actual embed code -->
       <script src="https://your-domain.com/widget.js" data-user-id="YOUR_USER_ID"></script>
   </body>
   </html>
   ```
- [ ] Open test file in browser
- [ ] Verify widget button appears
- [ ] Click widget button
- [ ] Fill out feedback form
- [ ] Submit feedback

### 3. Test Feedback Management
- [ ] Visit `https://your-domain.com/feedback`
- [ ] Verify submitted feedback appears
- [ ] Check sentiment analysis worked
- [ ] Check priority detection worked
- [ ] Test status updates
- [ ] Test filtering and search
- [ ] Test export functionality

### 4. Test Notifications
- [ ] Submit feedback with negative keywords
- [ ] Submit feedback with urgent keywords
- [ ] Check notifications tab in feedback page
- [ ] Verify notifications are created
- [ ] Test marking notifications as read

### 5. Test Real-time Features
- [ ] Open feedback page in two browser tabs
- [ ] Submit feedback from one tab
- [ ] Verify feedback appears in other tab automatically
- [ ] Test status updates propagate in real-time

---

## 🔍 Troubleshooting Common Issues

### Issue: "Supabase link failed"
**Solution:**
- Verify project reference ID is correct
- Ensure you're logged into Supabase CLI
- Check internet connection

### Issue: "Database migration failed"
**Solution:**
- Check Supabase project is active
- Verify you have proper permissions
- Check migration files for syntax errors

### Issue: "Edge Function deployment failed"
**Solution:**
- Check function code for syntax errors
- Verify Supabase project is linked
- Check function name matches exactly

### Issue: "Widget not appearing"
**Solution:**
- Check browser console for errors
- Verify Supabase URL and key are correct
- Ensure widget.js is accessible via HTTPS
- Check CORS settings

### Issue: "Feedback not saving"
**Solution:**
- Check RLS policies are correct
- Verify user authentication
- Check database permissions
- Review Edge Function logs

### Issue: "Notifications not working"
**Solution:**
- Check Edge Function is deployed
- Verify database triggers are active
- Check notification settings
- Review function logs

---

## 📊 Verification Checklist

### Database Verification
- [ ] All tables created successfully
- [ ] RLS policies active
- [ ] Triggers working
- [ ] Indexes created

### Function Verification
- [ ] Edge Function deployed
- [ ] Function accessible via URL
- [ ] CORS headers configured
- [ ] Error handling working

### Frontend Verification
- [ ] Pages load without errors
- [ ] Real-time subscriptions working
- [ ] Forms submit successfully
- [ ] Export functionality works

### Widget Verification
- [ ] Widget loads on test page
- [ ] Form submission works
- [ ] Success message displays
- [ ] Mobile responsive

### Integration Verification
- [ ] Feedback triggers processing
- [ ] Sentiment analysis working
- [ ] Notifications created
- [ ] Analytics events logged

---

## 🎯 Final Steps

### 1. Update Documentation
- [ ] Update README with production URLs
- [ ] Document any custom configurations
- [ ] Update deployment scripts if needed

### 2. Set Up Monitoring
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up performance monitoring
- [ ] Configure uptime monitoring

### 3. Security Review
- [ ] Verify RLS policies are secure
- [ ] Check API keys are not exposed
- [ ] Review CORS settings
- [ ] Test authentication flows

### 4. Performance Optimization
- [ ] Enable CDN for widget.js
- [ ] Optimize database queries
- [ ] Configure caching if needed
- [ ] Monitor response times

---

## 📞 Support

If you encounter issues during deployment:

1. **Check the troubleshooting section above**
2. **Review Supabase documentation**
3. **Check function logs in Supabase dashboard**
4. **Open an issue on GitHub**
5. **Contact the development team**

---

**🎉 Congratulations! Your Feedback Management System is now deployed and ready to use!**