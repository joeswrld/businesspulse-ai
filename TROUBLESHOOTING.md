# Feedback System Troubleshooting Guide

## Common Issues and Solutions

### 1. Foreign Key Constraint Error

**Error:** `42703: column "project_id" referenced in foreign key constraint does not exist`

**Cause:** The database tables were created in the wrong order or with missing columns.

**Solutions:**

#### Option A: Fresh Setup (Recommended for new installations)
```sql
-- Run this in Supabase SQL Editor
-- This will drop existing tables and create fresh ones
-- WARNING: This will delete all existing data

-- Copy and paste the contents of setup-feedback-system.sql
```

#### Option B: Safe Migration (Preserves existing data)
```sql
-- Run this in Supabase SQL Editor
-- This will add missing columns without dropping data

-- Copy and paste the contents of migrate-feedback-system.sql
```

#### Option C: Check Current State
```sql
-- Run this in Supabase SQL Editor to see what's wrong
-- Copy and paste the contents of check-database-state.sql
```

### 2. "Failed to load settings" Error

**Error:** "Failed to load settings. Please try again" in Feedback Settings page

**Cause:** Database tables don't exist, permissions issues, or connection problems.

**Solutions:**

#### Step 1: Test Database Connection
```sql
-- Run this in Supabase SQL Editor to diagnose the issue
-- Copy and paste the contents of test-database-connection.sql
```

#### Step 2: Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Visit the Feedback Settings page
4. Look for detailed error messages in the console

#### Step 3: Common Fixes
- **Tables don't exist:** Run `setup-feedback-system.sql`
- **Permission denied:** Check RLS policies
- **Connection issues:** Verify Supabase URL and keys

#### Step 4: Manual Settings Creation
```sql
-- Create settings for a specific user (replace USER_ID)
INSERT INTO feedback_settings (
  user_id,
  project_id,
  project_id_locked,
  title,
  show_name,
  show_email,
  button_text,
  theme,
  brand_color
) VALUES (
  'YOUR_USER_ID_HERE',
  'project-' || substr(md5(random()::text), 1, 12),
  false,
  'Share your thoughts with us',
  true,
  true,
  'Send Feedback',
  'light',
  '#2563eb'
);
```

### 3. React Hook Dependency Warnings

**Error:** `React Hook useEffect has missing dependencies`

**Solution:** ✅ **FIXED** - The feedback pages now use `useCallback` for proper dependency management.

### 4. Build Errors

**Error:** `npm run build` fails

**Solutions:**
1. Run `npm install` to ensure all dependencies are installed
2. Check for TypeScript errors: `npx tsc --noEmit`
3. Clear build cache: `rm -rf dist && npm run build`

### 5. Supabase Function Deployment Issues

**Error:** Function deployment fails

**Solutions:**
1. Ensure Supabase CLI is installed: `npm install -g supabase`
2. Login to Supabase: `supabase login`
3. Link your project: `supabase link --project-ref YOUR_PROJECT_REF`
4. Deploy: `supabase functions deploy feedback-api`

### 6. Real-time Updates Not Working

**Issue:** New feedback doesn't appear in real-time

**Solutions:**
1. Check Supabase Realtime is enabled in your project settings
2. Verify the subscription is set up correctly in `Feedback.tsx`
3. Check browser console for connection errors

### 7. Widget Not Loading

**Issue:** The feedback widget doesn't appear on external websites

**Solutions:**
1. Ensure the widget file is uploaded to your CDN
2. Check the script URL in the embed code
3. Verify the `data-project-id` attribute is set correctly
4. Check browser console for JavaScript errors

### 8. Widget Submission Error

**Error:** "⚠️ Something went wrong. Please try again." when submitting feedback

**Cause:** API endpoint issues, database problems, or network errors.

**Solutions:**

#### Step 1: Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Submit feedback through the widget
4. Look for "NoteX Feedback Widget:" messages

#### Step 2: Test API Endpoint
```bash
# Run the test script
./test-feedback-api.sh
```

#### Step 3: Common Fixes
- **401 Error (Authentication):** Deploy with public access: `./deploy-feedback-api.sh`
- **404 Error:** Deploy the function: `supabase functions deploy feedback-api`
- **500 Error:** Check function logs: `supabase functions logs feedback-api`
- **Database Error:** Run database setup: `setup-feedback-system.sql`
- **Invalid Project ID:** Verify project ID in NoteX dashboard

#### Step 4: Test Locally
1. Open `test-widget.html` in a browser
2. Replace `YOUR_PROJECT_ID` with actual project ID
3. Test the widget submission
4. Check console for detailed logs

#### Step 5: Verify Function Deployment
```bash
# Check if function is deployed
supabase functions list

# View function logs
supabase functions logs feedback-api --follow

# Redeploy if needed
supabase functions deploy feedback-api
```

### 9. API Endpoint Not Responding

**Error:** 404 or 500 errors from the feedback API

**Solutions:**
1. Verify the function is deployed: `supabase functions list`
2. Check function logs: `supabase functions logs feedback-api`
3. Test the endpoint directly with curl:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/feedback-api \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "project_id=test&name=Test&email=test@example.com&message=Test message"
   ```

### 10. Permission Denied Errors

**Error:** RLS (Row Level Security) blocking access

**Solutions:**
1. Ensure RLS policies are created correctly
2. Check that the user is authenticated
3. Verify the user has the correct permissions

### 11. Email Notifications Not Working

**Issue:** Email notifications not being sent

**Solutions:**
1. Check if `notify_email` is set in feedback settings
2. Verify the email function is deployed: `supabase functions deploy send-email`
3. Check function logs for email errors

### 12. Project ID Locking Issues

**Issue:** Project ID not locking after first save

**Solutions:**
1. Check the `project_id_locked` column in the database
2. Verify the save function is working correctly
3. Check browser console for JavaScript errors

## Database Schema Verification

Run this query to verify your database is set up correctly:

```sql
-- Check table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('feedback_settings', 'feedbacks')
ORDER BY table_name, ordinal_position;

-- Check foreign key constraints
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('feedback_settings', 'feedbacks');
```

## Testing Checklist

Before going live, verify:

- [ ] Database tables created successfully
- [ ] RLS policies are in place
- [ ] Supabase function is deployed and accessible
- [ ] Widget file is uploaded to CDN
- [ ] Feedback settings page works
- [ ] Feedback management page works
- [ ] Real-time updates work
- [ ] Export functionality works
- [ ] Email notifications work (if configured)
- [ ] Widget works on external websites

## Getting Help

If you're still experiencing issues:

1. Check the browser console for JavaScript errors
2. Check Supabase function logs
3. Verify database schema with the check script
4. Test each component individually
5. Review the `FEEDBACK_SYSTEM_README.md` for detailed documentation

## Quick Fix Commands

```bash
# Reinstall dependencies
npm install

# Clear build cache
rm -rf dist

# Rebuild application
npm run build

# Deploy Supabase function
supabase functions deploy feedback-api

# Check function logs
supabase functions logs feedback-api

# Link Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```