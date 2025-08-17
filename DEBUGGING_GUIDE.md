# 🔧 Debugging Guide - "Analysis failed" Error

## 🚨 Common Causes & Solutions

### 1. "Analysis failed: failed to send request to edge functions"

#### Symptoms
- User uploads file or pastes text
- Sees "Analysis failed: failed to send request to edge functions" error
- No insights generated
- Network tab shows failed request

#### Root Cause
This error occurs when the frontend cannot reach the Supabase Edge Function. The issue is typically:
- Edge Function not deployed
- Wrong endpoint URL
- CORS issues
- Authentication problems

#### Debug Steps

**Step 1: Check Edge Function Deployment**
```bash
# List deployed functions
npx supabase functions list

# If stream-insights is not listed, deploy it
npx supabase functions deploy stream-insights --no-verify-jwt
```

**Step 2: Test Edge Function Directly**
```bash
# Run the test script
node scripts/test-edge-function.js

# Or test manually
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/stream-insights \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"content": "test", "source": "test"}'
```

**Step 3: Check Browser Network Tab**
```javascript
// Open DevTools (F12) → Network tab
// Look for POST request to: /functions/v1/stream-insights
// Check:
// - Status code (should be 200, not 404 or 500)
// - Request URL (should be correct Supabase endpoint)
// - Request payload (should contain content and source)
```

**Step 4: Verify Environment Variables**
```bash
# Check if Supabase URL and key are set correctly
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Check if Gemini API key is set
npx supabase secrets list
```

#### Quick Fixes

**A. Deploy Edge Function**
```bash
# Deploy the function
npx supabase functions deploy stream-insights --no-verify-jwt

# Set Gemini API key
npx supabase secrets set GEMINI_API_KEY=your_api_key_here
```

**B. Check Frontend Code**
```typescript
// Make sure you're using the correct Supabase client call
const response = await supabase.functions.invoke('stream-insights', {
  body: {
    content: content,
    source: source
  }
});
```

**C. Verify CORS Headers**
```typescript
// Edge Function should include these headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### 2. "Analysis failed" Error (General)

#### Symptoms
- User uploads file or pastes text
- Sees "Analysis failed" popup
- No insights generated

#### Debug Steps

**Step 1: Check Browser Console**
```javascript
// Open DevTools (F12) → Console tab
// Look for these log messages:
🚀 Starting insight generation: { contentLength: 123, source: "file.csv" }
📥 Edge Function response: { data: {...}, error: null }
✅ Analysis result: { title: "...", priority: "High", ... }
```

**Step 2: Check Network Tab**
```javascript
// DevTools → Network tab
// Look for POST request to: /functions/v1/stream-insights
// Check:
// - Status code (should be 200)
// - Request payload (should contain content)
// - Response body (should contain insight data)
```

**Step 3: Check Supabase Dashboard**
```bash
# Go to Supabase Dashboard → Edge Functions → stream-insights → Logs
# Look for error messages or successful execution logs
```

#### Common Fixes

**A. Empty Content**
```javascript
// Problem: File is empty or text input is too short
// Solution: Add validation
if (content.length < 10) {
  throw new Error('Content too short for meaningful analysis');
}
```

**B. Invalid File Type**
```javascript
// Problem: Unsupported file format
// Solution: Check file validation
const validTypes = ['text/csv', 'application/pdf', 'text/plain'];
if (!validTypes.includes(file.type)) {
  throw new Error('Unsupported file type');
}
```

**C. Gemini API Key Missing**
```bash
# Problem: GEMINI_API_KEY not set
# Solution: Set environment variable
npx supabase secrets set GEMINI_API_KEY=your_api_key_here
```

**D. File Too Large**
```javascript
// Problem: File exceeds 10MB limit
// Solution: Add size validation
if (file.size > 10 * 1024 * 1024) {
  throw new Error('File too large (max 10MB)');
}
```

### 3. Edge Function Not Deployed

#### Symptoms
- 404 error in Network tab
- "Function not found" error

#### Solution
```bash
# Deploy the Edge Function
npx supabase functions deploy stream-insights

# Verify deployment
npx supabase functions list
```

### 4. CORS Issues

#### Symptoms
- CORS error in console
- Request blocked by browser

#### Solution
```typescript
// Edge Function should include CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### 5. Database Save Errors

#### Symptoms
- Insight generated but not saved
- Database error in console

#### Solution
```sql
-- Check if ai_insights table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'ai_insights';

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'ai_insights';
```

## 🔍 Step-by-Step Debugging

### 1. Test with Simple Text
```javascript
// Try with a simple text input first
const testContent = "Our company revenue increased by 15% this quarter. Customer satisfaction scores are at 85%. We need to focus on reducing churn.";
```

### 2. Check Environment Variables
```bash
# Verify Gemini API key is set
npx supabase secrets list

# Check if key is valid
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models"
```

### 3. Test Edge Function Directly
```bash
# Test the function locally
npx supabase functions serve stream-insights

# Then test with curl
curl -X POST http://localhost:54321/functions/v1/stream-insights \
  -H "Content-Type: application/json" \
  -d '{"content": "Test content", "source": "test"}'
```

### 4. Check File Processing
```javascript
// Add this to your file upload handler
console.log('File details:', {
  name: file.name,
  size: file.size,
  type: file.type,
  lastModified: file.lastModified
});
```

## 🛠️ Quick Fixes

### Fix 1: Add Better Error Handling
```typescript
// In your streamInsights function
try {
  const response = await supabase.functions.invoke('stream-insights', {
    body: { content, source }
  });
  
  if (response.error) {
    console.error('Edge Function error:', response.error);
    throw new Error(response.error.message);
  }
  
  if (!response.data) {
    throw new Error('No data returned');
  }
  
  // Process response...
} catch (error) {
  console.error('Streaming failed:', error);
  // Handle error...
}
```

### Fix 2: Validate Content Before Sending
```typescript
// Before calling streamInsights
if (!content || content.trim().length === 0) {
  throw new Error('No content to analyze');
}

if (content.length < 10) {
  throw new Error('Content too short for meaningful analysis');
}
```

### Fix 3: Add File Type Validation
```typescript
const isValidFileType = (file: File) => {
  const validTypes = [
    'text/csv',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  return validTypes.includes(file.type) || 
         file.name.match(/\.(csv|pdf|docx|txt)$/i);
};
```

## 📊 Monitoring & Logs

### Frontend Logs
```javascript
// Add these console.log statements
console.log('🚀 Upload started:', { file: uploadFile?.name, textLength: textInput.length });
console.log('📁 File processing:', { name: file.name, size: file.size });
console.log('📝 Content extracted:', { length: content.length });
console.log('🤖 AI processing started');
console.log('✅ Insight generated:', insight);
```

### Backend Logs
```typescript
// Edge Function logs
console.log('🚀 Function called with:', { contentLength: content.length, source });
console.log('🔑 API key status:', !!GEMINI_API_KEY);
console.log('📡 Gemini API call started');
console.log('📥 Gemini response:', response.status);
console.log('✅ Insight created:', insight);
```

### Database Logs
```sql
-- Check recent insights
SELECT * FROM ai_insights 
ORDER BY created_at DESC 
LIMIT 5;

-- Check for errors
SELECT * FROM ai_insights 
WHERE title = 'Analysis Failed' 
ORDER BY created_at DESC;
```

## 🚀 Performance Optimization

### 1. File Size Limits
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large');
}
```

### 2. Content Length Limits
```typescript
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 50000; // 50KB

if (content.length < MIN_CONTENT_LENGTH) {
  throw new Error('Content too short');
}

if (content.length > MAX_CONTENT_LENGTH) {
  content = content.substring(0, MAX_CONTENT_LENGTH);
}
```

### 3. Rate Limiting
```typescript
// Add rate limiting to prevent abuse
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
```

## 🎯 Success Indicators

When everything is working correctly, you should see:

1. **Frontend Console:**
   ```
   🚀 Starting insight generation: { contentLength: 1234, source: "data.csv" }
   📥 Edge Function response: { data: {...}, error: null }
   ✅ Analysis result: { title: "...", priority: "High", confidence: 85 }
   💾 Saving insight to database...
   ✅ Insight saved to database
   ```

2. **Network Tab:**
   - POST request to `/functions/v1/stream-insights`
   - Status: 200
   - Response contains insight data

3. **Supabase Dashboard:**
   - Edge Function logs show successful execution
   - Database shows new insight record

4. **User Experience:**
   - File uploads successfully
   - "Analyzing..." status appears
   - Insight card appears with content
   - Success toast notification

## 🚨 Emergency Fixes

### If Edge Function is Completely Broken

1. **Redeploy the function:**
   ```bash
   npx supabase functions deploy stream-insights --no-verify-jwt
   ```

2. **Check function logs:**
   ```bash
   npx supabase functions logs stream-insights
   ```

3. **Verify environment variables:**
   ```bash
   npx supabase secrets list
   ```

4. **Test with minimal payload:**
   ```javascript
   const testData = {
     content: "Test content",
     source: "test"
   };
   ```

## 📞 Getting Help

If you're still experiencing issues:

1. **Check the logs** in browser console and Supabase dashboard
2. **Verify environment variables** are set correctly
3. **Test with simple content** first
4. **Check file format** and size limits
5. **Review error messages** for specific issues
6. **Run the test script:** `node scripts/test-edge-function.js`

The debugging logs will help identify exactly where the process is failing and provide specific solutions.