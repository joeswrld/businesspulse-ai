# 🚨 User Creation Database Error - COMPLETE FIX GUIDE

## ❌ **Problem Identified:**

The error "database error saving new users" is caused by a **trigger function failure** when trying to automatically create billing profiles for new users. The trigger is attempting to insert into tables that may not exist or have permission issues.

## 🔍 **Root Cause Analysis:**

### **1. Trigger Function Issues:**
- **`create_billing_profile()`** function runs after user creation
- **Fails silently** when billing tables don't exist
- **Blocks user creation** due to trigger execution failure
- **No error handling** for missing tables or permissions

### **2. Database State Problems:**
- Billing tables may not exist yet
- RLS policies might be too restrictive
- Foreign key constraints failing
- Trigger execution order issues

## 🚀 **Solution Options (Choose One):**

### **Option 1: Complete Database Reset (Recommended)**
```bash
# 1. Reset the entire database
supabase db reset

# 2. Run the safe migration
supabase db push

# 3. Or manually run the SQL file
psql -h your-db-host -U postgres -d postgres -f safe-billing-migration.sql
```

### **Option 2: Apply the Fix Script**
```bash
# Run the improved trigger function
psql -h your-db-host -U postgres -d postgres -f fix-user-creation-error.sql
```

### **Option 3: Manual Dashboard Fix**
1. Go to Supabase Dashboard
2. Database > Tables
3. Create missing tables manually
4. Disable problematic triggers

## 🔧 **Immediate Fix (Recommended):**

### **Step 1: Disable the Problematic Trigger**
```sql
-- Connect to your Supabase database and run:
DROP TRIGGER IF EXISTS trigger_create_billing_profile ON auth.users;
DROP FUNCTION IF EXISTS create_billing_profile();
```

### **Step 2: Create Tables Manually**
```sql
-- Create billing_profiles table
CREATE TABLE IF NOT EXISTS billing_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  plan TEXT CHECK (plan IN ('trial','pro','business')) DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  subscription_status TEXT CHECK (subscription_status IN ('trial','active','past_due','cancelled','expired')) DEFAULT 'trial',
  paystack_customer_id TEXT,
  paystack_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code VARCHAR(255) NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT CHECK (status IN ('success','failed','pending')) DEFAULT 'pending',
  description TEXT,
  paystack_reference TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  feedback_count INTEGER DEFAULT 0,
  analytics_count INTEGER DEFAULT 0,
  reports_count INTEGER DEFAULT 0,
  insights_count INTEGER DEFAULT 0,
  teams_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Step 3: Enable RLS and Create Policies**
```sql
-- Enable RLS on all tables
ALTER TABLE billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for billing_profiles
CREATE POLICY "users can read own billing profile"
  ON billing_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users can update own billing profile"
  ON billing_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "users can insert own billing profile"
  ON billing_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create policies for user_subscriptions
CREATE POLICY "users can read own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can update own subscriptions"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own subscriptions"
  ON user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for transactions
CREATE POLICY "users can read own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policies for usage_tracking
CREATE POLICY "users can read own usage"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users can update own usage"
  ON usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users can insert own usage"
  ON usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### **Step 4: Create Manual Profile Creation Function**
```sql
-- Create a function to manually create profiles (safer than triggers)
CREATE OR REPLACE FUNCTION create_user_billing_profile(user_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Create billing profile
  INSERT INTO billing_profiles (id, plan, trial_ends_at, subscription_status)
  VALUES (
    user_uuid,
    'trial',
    NOW() + INTERVAL '8 days',
    'trial'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create usage tracking
  INSERT INTO usage_tracking (id, user_id, feedback_count, analytics_count, reports_count, insights_count, teams_count)
  VALUES (
    user_uuid,
    user_uuid,
    0,
    0,
    0,
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create user subscription
  INSERT INTO user_subscriptions (user_id, plan_code, plan_name, status)
  VALUES (
    user_uuid,
    'trial',
    'Free Trial (8 days)',
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'Created billing profile for user %', user_uuid;
END;
$$ LANGUAGE plpgsql;
```

## 🧪 **Testing the Fix:**

### **1. Test User Creation:**
```bash
# Try to create a new user through your app
# Check if the error is gone
```

### **2. Verify Tables Exist:**
```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('billing_profiles', 'user_subscriptions', 'transactions', 'usage_tracking');
```

### **3. Test Manual Profile Creation:**
```sql
-- Test the manual function
SELECT create_user_billing_profile('test-user-uuid');
```

## 🔄 **Alternative Approach - Lazy Profile Creation:**

Instead of automatic triggers, create profiles when users first access the billing page:

```typescript
// In your useBillingSystem hook
const loadBillingData = async () => {
  try {
    // Try to load existing data
    const { data: profile } = await supabase
      .from('billing_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      // Create profile on first access
      await createUserBillingProfile(user.id);
    }
  } catch (error) {
    console.warn('Billing profile creation failed:', error);
  }
};
```

## 📋 **Prevention Steps:**

### **1. Always Check Table Existence:**
```sql
-- Before creating triggers, ensure tables exist
IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'billing_profiles') THEN
  -- Create table first
END IF;
```

### **2. Use Error Handling in Triggers:**
```sql
-- Wrap trigger logic in exception handlers
BEGIN
  -- Your logic here
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Trigger failed: %', SQLERRM;
  RETURN NEW; -- Don't fail the main operation
END;
```

### **3. Test Triggers in Development:**
```bash
# Always test database changes in development first
supabase db reset --linked
# Test user creation
# Verify triggers work correctly
```

## 🎯 **Expected Result:**

After applying the fix:
- ✅ **New users can be created** without database errors
- ✅ **Billing profiles are created** when needed
- ✅ **No more trigger failures** blocking user creation
- ✅ **Clean error handling** for missing tables
- ✅ **Manual profile creation** as fallback

## 🚨 **If Problems Persist:**

### **1. Check Supabase Logs:**
- Go to Dashboard > Database > Logs
- Look for specific error messages
- Check trigger execution logs

### **2. Verify Environment Variables:**
```bash
# Check if Supabase connection is working
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

### **3. Test Database Connection:**
```bash
# Test if you can connect to the database
psql -h your-db-host -U postgres -d postgres -c "SELECT version();"
```

## ✨ **Summary:**

The user creation error is caused by **failing database triggers**. The solution is to:

1. **Disable problematic triggers** immediately
2. **Create tables manually** if they don't exist
3. **Use manual profile creation** instead of automatic triggers
4. **Implement proper error handling** for all database operations

This approach ensures **user creation always succeeds** while maintaining the billing system functionality! 🚀