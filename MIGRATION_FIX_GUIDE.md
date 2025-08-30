# How to Fix "relation already exists" Error

The error you're seeing means that some billing tables already exist in your database. Here's how to fix it:

## 🔧 **Quick Fix Options**

### **Option 1: Run the Safe Migration Script**
```bash
# Make the script executable and run it
chmod +x run-safe-migration.sh
./run-safe-migration.sh
```

### **Option 2: Manual Migration (Recommended)**

1. **Go to your Supabase Dashboard**
   - Navigate to your Supabase project
   - Go to **SQL Editor**

2. **Copy and paste the safe migration**
   - Copy the entire contents of `safe-billing-migration.sql`
   - Paste it into the SQL Editor
   - Click **Run**

3. **Verify the migration worked**
   - Check the **Tables** section in your Supabase dashboard
   - You should see: `billing_profiles`, `user_subscriptions`, `transactions`, `usage_tracking`

### **Option 3: Check What Exists First**

Run this query in your Supabase SQL Editor to see what tables already exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('billing_profiles', 'user_subscriptions', 'transactions', 'usage_tracking');
```

## 🚀 **What the Safe Migration Does**

The safe migration script:

✅ **Checks if tables exist** before creating them  
✅ **Creates missing tables** with proper structure  
✅ **Adds all necessary indexes** for performance  
✅ **Sets up RLS policies** for security  
✅ **Creates triggers** for automatic profile creation  
✅ **Adds default data** for existing users  
✅ **Handles conflicts gracefully** with `ON CONFLICT DO NOTHING`  

## 📊 **Expected Output**

When you run the migration, you should see messages like:

```
NOTICE: billing_profiles table already exists
NOTICE: Created user_subscriptions table
NOTICE: transactions table already exists
NOTICE: Created usage_tracking table
```

## 🧪 **Test the Migration**

After running the migration, test that everything works:

1. **Check your billing page**: Navigate to `/billing` in your app
2. **Verify data exists**: Check that users have billing profiles
3. **Test usage tracking**: Try using features to see if counters update

## 🔍 **Troubleshooting**

### **If you still get errors:**

1. **Check table structure**:
```sql
\d billing_profiles
\d user_subscriptions
\d transactions
\d usage_tracking
```

2. **Check RLS policies**:
```sql
SELECT * FROM pg_policies WHERE tablename IN ('billing_profiles', 'user_subscriptions', 'transactions', 'usage_tracking');
```

3. **Check triggers**:
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%billing%';
```

### **If tables are corrupted:**

You can drop and recreate them (⚠️ **This will delete data**):

```sql
-- Only run this if you're okay losing data
DROP TABLE IF EXISTS billing_profiles CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS usage_tracking CASCADE;

-- Then run the safe migration again
```

## ✅ **Success Indicators**

After successful migration, you should see:

- ✅ No more "relation already exists" errors
- ✅ All 4 billing tables exist in your database
- ✅ RLS policies are active
- ✅ Triggers are working
- ✅ Billing page loads without errors
- ✅ Users have default trial profiles

## 🎉 **Next Steps**

Once the migration is successful:

1. **Test the billing page** at `/billing`
2. **Set up Paystack integration** for payments
3. **Add usage tracking** to your features
4. **Test the complete upgrade flow**

Your billing system will be fully functional! 🚀