# 🔧 Fix for "Database error saving new user" Issue

## 🚨 Problem
Users are getting "Database error saving new user" messages when trying to sign up or sign in.

## 🔍 Root Cause
The issue is caused by **failing database triggers** that automatically try to create billing profiles when new users sign up. These triggers are failing because:
- Required tables don't exist
- Permission issues with the database
- Trigger execution errors

## ✅ Solution
The fix removes the problematic triggers and creates the necessary tables with proper error handling.

## �� How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `fix-auth-db-error.sql`
4. Paste and run the SQL commands

### Option 2: Supabase CLI
```bash
# Reset the database (this will apply all migrations)
supabase db reset

# Or push specific changes
supabase db push
```

### Option 3: Manual SQL Execution
```bash
# If you have direct database access
psql -h your-db-host -U postgres -d postgres -f fix-auth-db-error.sql
```

## 📋 What the Fix Does
1. **Removes problematic triggers** that cause user creation to fail
2. **Creates necessary tables** if they don't exist:
   - `billing_profiles`
   - `usage_tracking` 
   - `feedback_settings`
3. **Sets up proper permissions** with Row Level Security (RLS)
4. **Creates basic policies** for user access

## ✅ Expected Results
After applying the fix:
- ✅ New users can sign up without errors
- ✅ Existing users can sign in normally
- ✅ No more "Database error saving new user" messages
- ✅ User profiles are created when needed

## 🔍 Verification
1. Try creating a new user account
2. Check that no database error messages appear
3. Verify the user can access the dashboard
4. Test existing user sign-in

## 📁 Files Created
- `fix-auth-db-error.sql` - The main fix file
- `apply-auth-fix.sh` - Helper script with instructions
- `AUTH_FIX_README.md` - This documentation

## 🆘 If Issues Persist
1. Check Supabase Dashboard > Database > Logs for specific errors
2. Verify your Supabase connection settings
3. Ensure all environment variables are set correctly
4. Try a complete database reset: `supabase db reset`
