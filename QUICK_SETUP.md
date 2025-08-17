# Quick Setup Guide - AI Insights System

## 🚀 **Fast Setup (5 minutes)**

### **Step 1: Database Setup**
1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `scripts/create_ai_insights_table.sql`
3. Click **Run** to create the `ai_insights` table

### **Step 2: Deploy Edge Function**
```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy generate_insights
```

### **Step 3: Set Environment Variables**
1. Go to **Supabase Dashboard** → **Settings** → **Edge Functions**
2. Add environment variable:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Get your Gemini API key from: https://makersuite.google.com/app/apikey

### **Step 4: Add Routes to Your App**
```tsx
// In your router configuration
import DataUploadRealTime from './pages/DataUploadRealTime';
import AIInsightsRealTime from './pages/AIInsightsRealTime';

// Add these routes
<Route path="/upload" element={<DataUploadRealTime />} />
<Route path="/ai-insights" element={<AIInsightsRealTime />} />
```

### **Step 5: Test the System**
1. Start your dev server: `npm run dev`
2. Go to `/upload`
3. Upload a file or enter text
4. Check `/ai-insights` for real-time updates

## ✅ **What You Get**

- **Real-time file upload** with drag & drop
- **AI-powered insights** generated automatically
- **Live updates** on the AI Insights page
- **Professional UI** with mobile responsiveness
- **Error handling** and user feedback

## 🔧 **Files Created**

- `src/pages/DataUploadRealTime.tsx` - Upload page
- `src/pages/AIInsightsRealTime.tsx` - Insights display
- `supabase/functions/generate_insights/index.ts` - AI processing
- `scripts/create_ai_insights_table.sql` - Database setup

## 🎯 **Supported Features**

- **File Types**: CSV, PDF, DOCX, TXT
- **Text Input**: Direct text entry
- **Real-time Updates**: Live insight generation
- **Search & Filter**: Advanced filtering options
- **Mobile Responsive**: Works on all devices

## 🚨 **Troubleshooting**

### **Edge Function Not Working**
- Check environment variables in Supabase Dashboard
- Verify Gemini API key is valid
- Check Edge Function logs in Supabase Dashboard

### **Database Errors**
- Ensure `ai_insights` table is created
- Check RLS policies are enabled
- Verify real-time is enabled for the table

### **Real-time Not Working**
- Check Supabase realtime is enabled
- Verify user authentication
- Check browser console for errors

## 📞 **Need Help?**

1. Check the full `REALTIME_UPLOAD_README.md`
2. Run the automated setup: `./scripts/build_and_deploy.sh`
3. Check Supabase logs for errors
4. Verify all environment variables are set

---

**Status**: ✅ Ready for production use
**Time to Deploy**: ~5 minutes