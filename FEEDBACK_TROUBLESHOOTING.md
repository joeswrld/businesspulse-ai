# 🔧 Feedback System Troubleshooting Guide

## 🚨 Common Error: "Failed to load feedback"

### **Quick Fix Steps:**

#### **Step 1: Check if Database Tables Exist**

1. **Go to your Supabase Dashboard**
2. **Navigate to Database > Tables**
3. **Check if these tables exist:**
   - `feedback`
   - `feedback_settings`
   - `feedback_notifications`

#### **Step 2: If Tables Don't Exist - Manual Setup**

1. **Go to Supabase Dashboard > SQL Editor**
2. **Copy and paste the contents of `setup-feedback-db.sql`**
3. **Click "Run" to execute the script**
4. **Verify tables are created**

#### **Step 3: Check RLS Policies**

1. **Go to Database > Tables**
2. **Click on each table (`feedback`, `feedback_settings`, `feedback_notifications`)**
3. **Go to "Policies" tab**
4. **Ensure these policies exist:**
   - `Users can view their own feedback`
   - `Users can update their own feedback`
   - `Users can insert their own feedback`

#### **Step 4: Verify User Authentication**

1. **Check if you're logged in**
2. **Verify your user ID exists in `auth.users` table**
3. **Check browser console for authentication errors**

---

## 🔍 **Detailed Error Analysis**

### **Error Code: 42P01 (Table doesn't exist)**
**Solution:** Run the database setup script above

### **Error Code: 42501 (Permission denied)**
**Solution:** Check RLS policies and user authentication

### **Error Code: PGRST116 (No rows returned)**
**Solution:** This is normal for new users - the system will create default settings

---

## 🛠️ **Manual Database Setup**

If the automated setup doesn't work, follow these steps:

### **1. Create Tables Manually**

Run this in Supabase SQL Editor:

```sql
-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name VARCHAR(255),
  email VARCHAR(255),
  message TEXT NOT NULL,
  sentiment VARCHAR(50) DEFAULT 'neutral',
  status VARCHAR(50) DEFAULT 'new',
  priority VARCHAR(50) DEFAULT 'normal',
  category VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedback settings table
CREATE TABLE IF NOT EXISTS feedback_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  brand_colors JSONB DEFAULT '{"primary": "#3b82f6", "secondary": "#1e40af"}',
  greeting_text VARCHAR(500) DEFAULT 'How was your experience?',
  button_placement VARCHAR(50) DEFAULT 'bottom',
  widget_enabled BOOLEAN DEFAULT true,
  auto_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedback notifications table
CREATE TABLE IF NOT EXISTS feedback_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID REFERENCES feedback(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);
```

### **2. Enable RLS and Create Policies**

```sql
-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own feedback" ON feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON feedback
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback settings" ON feedback_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback settings" ON feedback_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback settings" ON feedback_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback notifications" ON feedback_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback notifications" ON feedback_notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback notifications" ON feedback_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### **3. Grant Permissions**

```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
```

---

## 🧪 **Testing After Fix**

### **1. Test Feedback Page**
- Visit `/feedback`
- Should load without errors
- Should show empty state if no feedback

### **2. Test Settings Page**
- Visit `/feedback-settings`
- Should load with default settings
- Should allow customization

### **3. Test Widget**
- Copy embed code from settings
- Test on a simple HTML page
- Submit test feedback

---

## 📞 **Still Having Issues?**

### **Check Browser Console**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for error messages
4. Share error details for support

### **Check Supabase Logs**
1. Go to Supabase Dashboard
2. Navigate to Logs
3. Check for database errors
4. Look for function execution logs

### **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| Tables don't exist | Run setup-feedback-db.sql |
| Permission denied | Check RLS policies |
| User not authenticated | Log out and log back in |
| Widget not loading | Check Supabase URL and key |
| Real-time not working | Check Realtime settings |

---

## 🎯 **Quick Commands**

### **If you have Supabase CLI:**
```bash
# Link to project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy database
supabase db push

# Deploy functions
supabase functions deploy process-feedback
```

### **If you don't have CLI:**
1. Use the manual SQL setup above
2. Copy the SQL to Supabase SQL Editor
3. Run the commands manually

---

**✅ After following these steps, your feedback system should work correctly!**