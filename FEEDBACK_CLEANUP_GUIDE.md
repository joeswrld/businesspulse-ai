# Complete Feedback System Cleanup Guide

## Overview
This guide provides comprehensive SQL scripts to safely remove all feedback-related data and configurations from your Supabase project. The cleanup includes tables, triggers, functions, policies, indexes, constraints, and views.

## Files Created
1. **`cleanup_feedback_system.sql`** - Complete cleanup script (use with caution)
2. **`safe_cleanup_feedback_system.sql`** - Safe cleanup with backup options (recommended)

## What Will Be Removed

### Tables
- `feedback` - Main feedback submissions table
- `feedbacks` - Alternative feedback table (if exists)
- `feedback_settings` - User feedback widget configurations
- `feedback_notifications` - Email notification records
- `feedback_tags` - Tags associated with feedback
- `widget_settings` - Widget configuration settings
- `notification_preferences` - User notification preferences
- `ai_insights_feedback` - AI insights feedback (if exists)

### Functions
- `notify_feedback_email()`
- `send_feedback_email_notification()`
- `insert_feedback_safe()`
- `set_feedback_created_at()`
- `process_new_feedback()`
- `log_feedback_analytics()`
- `detect_urgent_keywords()`
- `set_feedback_priority()`
- `create_feedback_settings_for_user()`
- `ensure_user_feedback_settings()`
- `can_access_feedback()`
- `analyze_feedback_sentiment()`
- `get_feedbacks_with_sentiment()`
- `retry_failed_notifications()`
- `update_feedback_tags_updated_at()`
- `update_widget_settings_updated_at()`
- `update_notification_preferences_updated_at()`

### Triggers
- `feedback_email_notification_trigger`
- `trigger_send_feedback_email_notification`
- `trigger_set_feedback_created_at`
- `trigger_process_feedback`
- `trigger_log_feedback_analytics`
- `trigger_update_feedback_tags_updated_at`
- `trigger_update_widget_settings_updated_at`
- `trigger_update_notification_preferences_updated_at`
- `update_feedback_updated_at`
- `update_feedback_settings_updated_at`
- `set_feedback_priority_trigger`

### Policies (RLS)
- All policies on feedback-related tables including:
  - User access policies
  - Service role policies
  - Project-based access policies
  - CRUD operation policies

### Indexes
- All performance indexes on feedback tables
- Unique constraints
- Foreign key indexes

### Views
- `notification_statistics`

### Other Objects
- Sequences
- Constraints
- Realtime publication entries

## Usage Instructions

### Option 1: Safe Cleanup (Recommended)
1. **Create Backups First**
   ```sql
   -- Uncomment the backup section in safe_cleanup_feedback_system.sql
   -- This creates timestamped backup tables
   ```

2. **Verify What Will Be Removed**
   ```sql
   -- Run the verification section to see what exists
   ```

3. **Perform Cleanup**
   ```sql
   -- Uncomment the complete cleanup section
   ```

### Option 2: Direct Cleanup
```sql
-- Run cleanup_feedback_system.sql directly
-- WARNING: This will permanently delete all feedback data
```

## Safety Features

### Backup Creation
- Creates timestamped backup tables before deletion
- Preserves all data in case restoration is needed
- Uses format: `table_name_backup_YYYY_MM_DD_HH24_MI_SS`

### Verification
- Counts existing feedback-related objects before cleanup
- Verifies successful removal after cleanup
- Provides detailed logging of what was removed

### Dependency Handling
- Proper ordering to avoid foreign key constraint errors
- CASCADE operations where appropriate
- IF EXISTS clauses to prevent errors on missing objects

## Edge Functions to Remove
After running the SQL cleanup, also remove these Edge Functions:
- `submit-feedback`
- `send-feedback-email`
- `feedback-api`
- `create-feedback`
- `send-feedback-notification`

## Frontend Components to Remove
- Feedback widget JavaScript files
- Feedback settings pages
- Feedback dashboard components
- Feedback-related API routes

## Verification Queries
After cleanup, you can run these queries to verify removal:

```sql
-- Check for remaining feedback tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%feedback%' 
   OR table_name LIKE '%widget%'
   OR table_name LIKE '%notification_preferences%'
ORDER BY table_name;

-- Check for remaining functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%feedback%' 
ORDER BY routine_name;

-- Check for remaining triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%feedback%' 
ORDER BY trigger_name, event_object_table;
```

## Recovery
If you need to restore feedback functionality:
1. Restore from backup tables if created
2. Re-run the original migration files
3. Redeploy Edge Functions
4. Restore frontend components

## Important Notes
- ⚠️ **This will permanently delete ALL feedback data**
- 🔄 **Create backups before running cleanup**
- ✅ **Test on a development environment first**
- 📋 **Verify cleanup was successful**
- 🚫 **This affects all users' feedback data**

## Support
If you encounter issues during cleanup:
1. Check the verification queries
2. Review error messages carefully
3. Ensure proper database permissions
4. Consider running cleanup in smaller sections