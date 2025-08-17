# 🚀 Quick Setup Guide - Fix "Analysis failed" Error

## ⚡ 3-Step Fix (5 minutes)

### Step 1: Set Environment Variables
Create a `.env.local` file in your project root:

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit the file and add your actual values
nano .env.local
```

Add your actual values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 2: Get Your Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and paste it in `.env.local`

### Step 3: Test the Setup
```bash
# Start your development server
npm run dev

# In another terminal, test the API
node scripts/test-api.js
```

## 🎯 Success Indicators

When working correctly, you should see:
- ✅ Test script passes
- ✅ API returns insight data
- ✅ Frontend can upload files and generate insights
- ✅ No more "Analysis failed" errors

## 🔧 What I Fixed

### ✅ **Replaced Supabase Edge Function with Next.js API Route**
- **Problem**: Supabase Edge Function connection issues
- **Solution**: Created `/api/generate-insights` Next.js API route
- **Result**: Direct, reliable connection to Gemini AI

### ✅ **Simplified Architecture**
- **Before**: Frontend → Supabase Edge Function → Gemini AI
- **After**: Frontend → Next.js API Route → Gemini AI
- **Result**: Fewer moving parts, more reliable

### ✅ **Enhanced Error Handling**
- **Better validation** of input data
- **Specific error messages** for different issues
- **Fallback insights** when API fails
- **Detailed logging** for debugging

## 🛠️ Files Created/Updated

1. **`src/pages/api/generate-insights.ts`** - New API route
2. **`src/pages/AIInsights.tsx`** - Updated to use new API
3. **`.env.local.example`** - Environment variables template
4. **`scripts/test-api.js`** - Test script
5. **`SETUP_GUIDE.md`** - This guide

## 🚨 If Still Not Working

### Check 1: Environment Variables
```bash
# Verify your .env.local file exists and has values
cat .env.local
```

### Check 2: Development Server
```bash
# Make sure server is running
npm run dev
```

### Check 3: API Route
```bash
# Test the API directly
curl -X POST http://localhost:3000/api/generate-insights \
  -H "Content-Type: application/json" \
  -d '{"content": "test", "source": "test"}'
```

### Check 4: Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Try uploading a file
4. Look for error messages

## 📞 Common Issues

### "GEMINI_API_KEY not configured"
- **Fix**: Add your Gemini API key to `.env.local`

### "Network error"
- **Fix**: Make sure development server is running (`npm run dev`)

### "Invalid content"
- **Fix**: Check that you're uploading valid files or entering text

### "Analysis failed"
- **Fix**: Check browser console for specific error messages

## 🎉 Expected Results

After following this guide:
- ✅ File uploads work
- ✅ Text input works
- ✅ Insights generate immediately
- ✅ No more "Analysis failed" errors
- ✅ Insights save to database
- ✅ Real-time updates work

The system now uses a direct Next.js API route instead of Supabase Edge Functions, making it much more reliable and easier to debug!