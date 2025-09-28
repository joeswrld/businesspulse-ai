# Project Auto-Creation Bug Fix

## Overview

This document describes the comprehensive fix for the project auto-creation bug in the NoteX app. The fix addresses multiple issues that were causing project creation failures and console errors.

## Issues Fixed

### 1. Database Schema Issues
- **Problem**: `ON CONFLICT` specification error due to missing unique constraint
- **Solution**: Added `UNIQUE` constraint on `projects.user_id` to ensure one project per user
- **Files**: `fix_project_auto_creation.sql`

### 2. Supabase Function Issues
- **Problem**: `create_project_with_settings` function failing with constraint errors
- **Solution**: Updated function to handle existing projects gracefully with `ON CONFLICT` logic
- **Files**: `fix_project_auto_creation.sql`

### 3. Frontend Error Handling
- **Problem**: Poor error handling for network and RPC errors
- **Solution**: Added retry logic, JWT refresh, and better error messages
- **Files**: `src/utils/projectUtils.ts`, `src/contexts/AuthContext.tsx`

### 4. Browser Extension Errors
- **Problem**: Console cluttered with MetaMask/Web3 extension errors
- **Solution**: Filtered out browser extension errors in console
- **Files**: `src/main.tsx`

## Files Modified

### Database Files
- `fix_project_auto_creation.sql` - Main database migration
- `deploy-project-fixes.sh` - Deployment script

### Frontend Files
- `src/main.tsx` - Browser extension error filtering
- `src/utils/projectUtils.ts` - Improved error handling and retry logic
- `src/contexts/AuthContext.tsx` - Better project creation error handling

## Database Changes

### 1. Unique Constraint
```sql
ALTER TABLE public.projects 
ADD CONSTRAINT IF NOT EXISTS projects_user_id_unique UNIQUE (user_id);
```

### 2. Updated Function
```sql
CREATE OR REPLACE FUNCTION public.create_project_with_settings(
  p_user_id uuid,
  p_name text,
  p_logo_url text DEFAULT NULL
)
-- Handles existing projects gracefully
```

### 3. Helper Function
```sql
CREATE OR REPLACE FUNCTION public.get_or_create_user_project(p_user_id uuid)
-- Simplified project retrieval/creation
```

## Frontend Improvements

### 1. Browser Extension Error Filtering
```typescript
// Filter out MetaMask/Web3 errors
if (message.includes('Failed to set window.ethereum') || 
    message.includes('MetaMask') || 
    message.includes('Web3')) {
  console.debug('Browser extension error (filtered):', ...args);
  return;
}
```

### 2. Enhanced Error Handling
```typescript
// Retry logic for JWT expiration
if (error.message.includes('JWT expired') && !isRetry) {
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (!refreshError) {
    return attemptCreate(true);
  }
}
```

### 3. Network Error Handling
```typescript
// Specific handling for network errors
if (error.message.includes('ERR_INTERNET_DISCONNECTED')) {
  throw new Error('Network error. Please check your internet connection and try again.');
}
```

## Deployment Instructions

### 1. Apply Database Fixes
```bash
# Run the deployment script
./deploy-project-fixes.sh
```

### 2. Manual Database Application
```bash
# If you prefer to apply manually
supabase db push --linked
```

### 3. Verify Fixes
```bash
# Test the functions
supabase db push --linked
```

## Testing the Fix

### 1. Sign In Test
1. Sign in to the app
2. Check console for project creation logs
3. Verify no "Failed to set window.ethereum" errors
4. Confirm project is created automatically

### 2. Error Handling Test
1. Disconnect internet during sign-in
2. Verify graceful error handling
3. Reconnect and verify retry works

### 3. Database Test
1. Try to create multiple projects for same user
2. Verify only one project exists
3. Check for constraint violations

## Expected Behavior After Fix

### ✅ What Should Work
- Users automatically get a project on sign-in
- No duplicate projects created
- Clean console without extension errors
- Graceful handling of network issues
- Proper error messages for users

### ❌ What Should Be Fixed
- ~~"Failed to set window.ethereum" console errors~~
- ~~"ON CONFLICT specification" database errors~~
- ~~"Unexpected token '<'" JSON parsing errors~~
- ~~"ERR_INTERNET_DISCONNECTED" network errors~~
- ~~Multiple projects per user~~

## Troubleshooting

### If Database Migration Fails
```bash
# Check Supabase connection
supabase status

# Reset and reapply
supabase db reset --linked
```

### If Frontend Errors Persist
1. Clear browser cache
2. Check console for new error patterns
3. Verify Supabase URL and keys
4. Test with different browsers

### If Project Creation Still Fails
1. Check database constraints
2. Verify function permissions
3. Test with fresh user account
4. Check Supabase logs

## Monitoring

### Console Logs to Watch
- `🔍 Ensuring user has a project:` - Project check starting
- `✅ User project ensured successfully:` - Project creation success
- `⚠️ Network error during project creation` - Network issues (retry will happen)

### Database Queries to Monitor
```sql
-- Check for duplicate projects
SELECT user_id, COUNT(*) FROM projects GROUP BY user_id HAVING COUNT(*) > 1;

-- Check constraint exists
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'projects' AND constraint_type = 'UNIQUE';
```

## Rollback Instructions

If issues occur, you can rollback:

### 1. Database Rollback
```sql
-- Remove unique constraint
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_user_id_unique;

-- Revert to old function (if needed)
-- Restore from backup
```

### 2. Frontend Rollback
```bash
# Revert main.tsx changes
git checkout HEAD~1 src/main.tsx

# Revert projectUtils.ts changes  
git checkout HEAD~1 src/utils/projectUtils.ts
```

## Success Metrics

After applying these fixes, you should see:

1. **Zero** "Failed to set window.ethereum" errors in console
2. **Zero** "ON CONFLICT specification" database errors
3. **Zero** "Unexpected token '<'" JSON parsing errors
4. **One** project per user (enforced by database constraint)
5. **Automatic** project creation on sign-in
6. **Graceful** error handling for network issues

## Support

If you encounter issues after applying these fixes:

1. Check the console logs for specific error patterns
2. Verify database constraints are applied
3. Test with a fresh user account
4. Check Supabase project settings and permissions

The fixes are designed to be robust and handle edge cases, but monitoring the first few sign-ins after deployment is recommended.