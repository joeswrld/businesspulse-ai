# 🚀 Quick Start: Production Deployment

## **Ready to Go Live? Follow These Steps:**

### **Step 1: Get Your API Keys**

#### **Gemini AI Key**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key

#### **Supabase Keys**
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy both:
   - `anon` key (public)
   - `service_role` key (private)

### **Step 2: Set Up Environment Variables**

#### **In Supabase Dashboard:**
1. Go to Settings → Environment Variables
2. Add:
   ```
   GEMINI_API_KEY=your_gemini_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   SUPABASE_URL=https://your-project.supabase.co
   ```

#### **In Vercel (or your hosting platform):**
1. Go to your project settings
2. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

### **Step 3: Run Database Migration**

#### **In Supabase SQL Editor:**
```sql
-- Run this migration
\i create_insights_results_table_fixed.sql

-- Verify it worked
SELECT test_insights_results_table();
```

Expected output: `SUCCESS: insights_results table is properly configured`

### **Step 4: Deploy Edge Function**

#### **Option A: Using the Script (Recommended)**
```bash
# Make script executable (if not already)
chmod +x deploy-production.sh

# Run the deployment script
./deploy-production.sh
```

#### **Option B: Manual Deployment**
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy analyze-insights
```

### **Step 5: Deploy Frontend**

#### **Option A: Vercel (Recommended)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod
```

#### **Option B: Other Platforms**
```bash
# Build the app
npm run build

# Deploy the `dist` folder to your hosting platform
```

### **Step 6: Test Everything**

#### **Create a Test File:**
```csv
name,age,city,department
John,25,New York,Engineering
Jane,30,Los Angeles,Marketing
Bob,35,Chicago,Sales
```

#### **Test the Flow:**
1. ✅ Upload the CSV file
2. ✅ Watch progress bars complete
3. ✅ See AI analysis results
4. ✅ Check history tab
5. ✅ Test download functionality

### **Step 7: Monitor & Scale**

#### **Check These Daily:**
- [ ] File upload success rate
- [ ] Analysis completion rate
- [ ] Error rates
- [ ] API usage (Gemini)

#### **Set Up Alerts For:**
- High error rates
- API quota usage
- Database performance issues

## 🎯 **Production Checklist**

### **✅ Before Going Live:**
- [ ] Environment variables set
- [ ] Database migration run
- [ ] Edge Function deployed
- [ ] Frontend deployed
- [ ] Test file upload works
- [ ] AI analysis completes
- [ ] Results save to database
- [ ] History functionality works

### **✅ After Going Live:**
- [ ] Monitor for 24 hours
- [ ] Check error logs
- [ ] Verify performance
- [ ] Collect user feedback
- [ ] Scale if needed

## 🚨 **Common Issues & Quick Fixes**

### **"Edge Function not available"**
- ✅ This is normal - system uses demo analysis
- ✅ Check if function is deployed: `supabase functions list`
- ✅ Verify environment variables in Supabase

### **"Failed to save results"**
- ✅ Analysis still works, just not saved
- ✅ Check database permissions
- ✅ Verify RLS policies

### **"Authentication error"**
- ✅ Check if user is logged in
- ✅ Verify Supabase keys are correct
- ✅ Check CORS settings

## 📞 **Need Help?**

### **Debug Mode:**
1. Click "Debug" button in the app
2. Check all the information
3. Look for error messages

### **Console Logs:**
1. Open browser dev tools (F12)
2. Check Console tab
3. Look for error messages

### **Documentation:**
- `FILE_UPLOAD_TROUBLESHOOTING.md` - Detailed troubleshooting
- `DEPLOY_TO_PRODUCTION.md` - Complete deployment guide
- `INSIGHTS_SIMPLE_SETUP.md` - Setup documentation

## 🎉 **You're Ready!**

Once you've completed all steps:

1. **Announce the feature** to your users
2. **Monitor closely** for the first 24 hours
3. **Collect feedback** and iterate
4. **Scale as needed** based on usage

**Your AI-powered file analysis system is now live! 🚀**