# Deploy Feedback API Function

## Issue
The feedback widget is not working because the `feedback-api` function is not deployed to Supabase.

## Solution

### Step 1: Login to Supabase CLI
```bash
npx supabase login
```

### Step 2: Deploy the Function
```bash
npx supabase functions deploy feedback-api
```

### Step 3: Verify Deployment
```bash
npx supabase functions list
```

## Alternative: Manual Deployment via Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/xjbrqeqizpoqdjkiyqzt
2. Navigate to "Edge Functions" in the sidebar
3. Click "Create a new function"
4. Name it `feedback-api`
5. Copy the code from `supabase/functions/feedback-api/index.ts`
6. Deploy the function

## Current Status
- ✅ Direct database insert works (test via `/test-feedback-submission`)
- ✅ Feedback page loads feedbacks correctly
- ❌ Widget API calls fail (function not deployed)
- ❌ Real-time updates may not work for widget submissions

## Workaround
Until the function is deployed, feedbacks can be submitted directly to the database and will appear on the Feedback page. The widget will not work until the API function is deployed.