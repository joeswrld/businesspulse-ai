# 🚨 Quick Fix Guide - "Analysis failed: failed to send request to edge functions"

## ⚡ Immediate Fix (5 minutes)

### Step 1: Deploy the Edge Function
```bash
# Deploy the stream-insights function
npx supabase functions deploy stream-insights --no-verify-jwt
```

### Step 2: Set Gemini API Key
```bash
# Set your Gemini API key
npx supabase secrets set GEMINI_API_KEY=your_api_key_here
```

### Step 3: Test the Function
```bash
# Run the test script
node scripts/test-edge-function.js
```

### Step 4: Verify in Browser
1. Open your app in browser
2. Open DevTools (F12)
3. Go to Network tab
4. Try uploading a file or pasting text
5. Look for POST request to `/functions/v1/stream-insights`
6. Check if status is 200 (success)

## 🔍 If Still Not Working

### Check 1: Function Deployment
```bash
# List all deployed functions
npx supabase functions list

# Should show: stream-insights
```

### Check 2: Environment Variables
```bash
# Check if Supabase URL and key are set
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Check if Gemini key is set
npx supabase secrets list
```

### Check 3: Function Logs
```bash
# Check function logs for errors
npx supabase functions logs stream-insights
```

## 🛠️ Manual Test

If the test script doesn't work, test manually:

```bash
# Test with curl (replace with your actual values)
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/stream-insights \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"content": "Our revenue increased by 15% this quarter", "source": "test"}'
```

## 🎯 Success Indicators

When fixed, you should see:
- ✅ Function deployed: `stream-insights`
- ✅ Test script passes
- ✅ Network request returns 200 status
- ✅ Insights generate successfully

## 📞 Still Broken?

If the issue persists:

1. **Check Supabase Dashboard** → Edge Functions → stream-insights → Logs
2. **Verify project linking**: `npx supabase status`
3. **Re-deploy everything**: `./scripts/deploy-edge-functions.sh`
4. **Check browser console** for specific error messages

The most common cause is the Edge Function not being deployed or the Gemini API key not being set correctly.