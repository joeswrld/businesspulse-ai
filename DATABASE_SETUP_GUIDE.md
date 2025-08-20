# Database Setup Guide - Fix Feedback Settings Error

## 🚨 **The Problem**
You're getting a database error in the Feedback Settings page because the required database tables don't exist in your Supabase database.

## ✅ **The Solution**
You need to create the feedback system tables in your Supabase database.

## 🔧 **Step-by-Step Fix**

### **Option 1: Manual Setup (Recommended)**

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `xjbrqeqizpoqdjkiyqzt`

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the SQL Script**
   - Copy the entire content from `setup-feedback-db.sql`
   - Paste it into the SQL Editor

4. **Run the Script**
   - Click "Run" button
   - Wait for the script to complete

5. **Verify Setup**
   - Go to "Table Editor" in the left sidebar
   - You should see these new tables:
     - `feedback`
     - `feedback_settings`
     - `feedback_notifications`

### **Option 2: Using the Setup Script**

1. **Install dependencies** (if not already installed):
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Get your Supabase Service Key**:
   - Go to your Supabase dashboard
   - Navigate to Settings > API
   - Copy the "service_role" key (not the anon key)

3. **Set environment variable**:
   ```bash
   export SUPABASE_SERVICE_KEY="your-service-key-here"
   ```

4. **Run the setup script**:
   ```bash
   node setup-database.js
   ```

## 📋 **What the Setup Creates**

### **Tables Created:**
1. **`feedback`** - Stores all feedback submissions
2. **`feedback_settings`** - Stores widget configuration
3. **`feedback_notifications`** - Stores notification data

### **Features Added:**
- Row Level Security (RLS) policies
- Automatic priority detection
- Timestamp triggers
- Performance indexes
- Default settings for existing users

## 🧪 **Test the Fix**

1. **Refresh your Feedback Settings page**
2. **You should see:**
   - No more database errors
   - Settings form loads properly
   - Save functionality works
   - Real-time updates work

## 🔍 **Verify Everything Works**

1. **Check Feedback Settings page** - Should load without errors
2. **Test widget on your website** - Should connect to database
3. **Submit test feedback** - Should appear in Feedback page
4. **Change settings** - Should update widget in real-time

## 🚀 **Production Ready**

After running the setup:
- ✅ Database tables created
- ✅ Security policies enabled
- ✅ Widget fully functional
- ✅ Real-time updates working
- ✅ Settings sync working

## 📞 **If You Still Have Issues**

1. **Check browser console** for specific error messages
2. **Verify Supabase connection** in your dashboard
3. **Check RLS policies** are properly set
4. **Ensure user authentication** is working

## 🔗 **Related Files**

- `setup-feedback-db.sql` - Complete database setup script
- `setup-database.js` - Automated setup script
- `widget.js` - Production widget file
- `src/pages/FeedbackSettings.tsx` - Settings page (now fixed)

---

**After completing this setup, your feedback system will be fully functional with real-time updates and database integration!**