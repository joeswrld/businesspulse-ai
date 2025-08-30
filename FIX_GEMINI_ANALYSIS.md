# 🔧 Fix Gemini AI Analysis - Step by Step Guide

## 🚨 **Problem**: Getting Mock Analysis Instead of Real Gemini AI

Your app is falling back to mock analysis because the Edge Function isn't deployed or configured properly. Let's fix this!

## ✅ **Solution**: Deploy the Edge Function Properly

### **Step 1: Get Your API Keys**

#### **1.1 Get Gemini API Key**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key (it looks like: `AIzaSyC...`)

#### **1.2 Get Supabase Keys**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy:
   - `anon` key (for frontend)
   - `service_role` key (for Edge Function)

### **Step 2: Deploy Edge Function in Supabase Dashboard**

#### **2.1 Create the Function**
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click **"Create a new function"**
4. Set function name: `analyze-insights`
5. Click **"Create function"**

#### **2.2 Add the Code**
1. In the function editor, replace all code with the content from `supabase/functions/analyze-insights/index.ts`
2. Click **"Save"**

#### **2.3 Set Environment Variables**
1. In the function settings, add these environment variables:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   SUPABASE_URL=https://your-project.supabase.co
   ```
2. Click **"Save"**

#### **2.4 Deploy the Function**
1. Click **"Deploy"** button
2. Wait for deployment to complete
3. Note the function URL (should be something like: `https://your-project.supabase.co/functions/v1/analyze-insights`)

### **Step 3: Test the Edge Function**

#### **3.1 Test with cURL**
```bash
# Replace with your actual values
curl -X POST https://your-project.supabase.co/functions/v1/analyze-insights \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": "test data",
    "userId": "your-user-id",
    "fileType": "text/plain"
  }'
```

#### **3.2 Expected Response**
```json
{
  "success": true,
  "analysis": {
    "summary": "Real Gemini AI analysis...",
    "key_themes": ["Theme 1", "Theme 2"],
    "suggested_actions": ["Action 1", "Action 2"],
    "trends": ["Trend 1", "Trend 2"],
    "performance": {
      "metrics": ["Metric 1", "Metric 2"],
      "score": 85
    },
    "sentiment": {
      "positive": 70,
      "negative": 10,
      "neutral": 20,
      "overall": "positive"
    }
  }
}
```

### **Step 4: Update Frontend Environment Variables**

#### **4.1 In Your Hosting Platform (Vercel/Netlify/etc.)**
Add these environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

#### **4.2 Redeploy Frontend**
```bash
# If using Vercel
vercel --prod

# If using Netlify
netlify deploy --prod --dir=dist
```

### **Step 5: Test the Complete Flow**

#### **5.1 Create Test File**
Create a CSV file with this content:
```csv
name,age,city,department
John,25,New York,Engineering
Jane,30,Los Angeles,Marketing
Bob,35,Chicago,Sales
Alice,28,Boston,HR
```

#### **5.2 Test Upload**
1. Go to your deployed app
2. Navigate to `/insights-simple`
3. Upload the test CSV file
4. Watch the progress bars
5. **You should now see REAL Gemini AI analysis!**

## 🔍 **Debugging Steps**

### **If Still Getting Mock Analysis:**

#### **1. Check Browser Console (F12)**
Look for these messages:
- ✅ `"Edge Function failed, using mock analysis:"` - Function not deployed
- ✅ `"Edge Function error, using mock analysis:"` - Function deployed but failing

#### **2. Check Edge Function Logs**
1. Go to Supabase dashboard → Edge Functions
2. Click on `analyze-insights` function
3. Click **"Logs"** tab
4. Look for error messages

#### **3. Test Function Directly**
Use the cURL command above to test if the function works independently.

#### **4. Check Environment Variables**
1. Go to Supabase dashboard → Edge Functions
2. Click on `analyze-insights` function
3. Check **"Settings"** tab
4. Verify all environment variables are set correctly

### **Common Issues & Fixes:**

#### **Issue 1: "Unauthorized" Error**
- ✅ Check if `SUPABASE_SERVICE_ROLE_KEY` is correct
- ✅ Verify the JWT token is valid

#### **Issue 2: "Gemini API Error"**
- ✅ Check if `GEMINI_API_KEY` is correct
- ✅ Verify the API key has proper permissions

#### **Issue 3: "Function Not Found"**
- ✅ Make sure function is deployed
- ✅ Check the function URL is correct

#### **Issue 4: "CORS Error"**
- ✅ The function includes CORS headers
- ✅ Check if your domain is allowed

## 🎯 **Success Indicators**

### **✅ Real Gemini AI Analysis:**
- Summary will be detailed and contextual
- Key themes will be specific to your data
- Suggested actions will be actionable
- Performance metrics will be realistic
- Sentiment analysis will be accurate

### **✅ Mock Analysis (Fallback):**
- Generic summary mentioning "comprehensive analysis"
- Standard themes like "Data Structure Analysis"
- Generic actions like "Implement data validation"
- Fixed performance score of 87
- Fixed sentiment percentages

## 🚀 **Quick Fix Checklist**

- [ ] Get Gemini API key from Google AI Studio
- [ ] Get Supabase service role key
- [ ] Create Edge Function in Supabase dashboard
- [ ] Copy code from `supabase/functions/analyze-insights/index.ts`
- [ ] Set environment variables in function
- [ ] Deploy the function
- [ ] Test with cURL
- [ ] Update frontend environment variables
- [ ] Redeploy frontend
- [ ] Test file upload

## 🎉 **Expected Result**

After completing these steps, when you upload a file:
1. ✅ Progress bars will complete
2. ✅ You'll see **REAL Gemini AI analysis** (not mock)
3. ✅ Results will be specific to your data
4. ✅ Analysis will be saved to database
5. ✅ History will show real analysis results

**Your AI analysis will now use the real Gemini AI instead of mock data! 🚀**