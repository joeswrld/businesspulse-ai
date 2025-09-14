-- ============================================================================
-- REMOVE FEEDBACK_SETTINGS FEATURE
-- ============================================================================
-- This migration removes the entire feedback_settings feature from the platform:
-- - Database tables, functions, triggers, sequences
-- - RLS policies and constraints
-- - Realtime subscriptions
-- - All dependent objects using CASCADE
-- 
-- WARNING: This will permanently delete ALL feedback data and configurations.
-- Make sure you have backups if you need to restore this data later.
-- ============================================================================

-- ============================================================================
-- 1. DISABLE TRIGGERS AND FUNCTIONS FIRST (to avoid errors during cleanup)
-- ============================================================================

-- Drop all feedback-related triggers
DROP TRIGGER IF EXISTS feedback_email_notification_trigger ON feedbacks;
DROP TRIGGER IF EXISTS trigger_send_feedback_email_notification ON feedbacks;
DROP TRIGGER IF EXISTS trigger_set_feedback_created_at ON feedback;
DROP TRIGGER IF EXISTS trigger_process_feedback ON feedback;
DROP TRIGGER IF EXISTS trigger_log_feedback_analytics ON feedback;
DROP TRIGGER IF EXISTS trigger_update_feedback_tags_updated_at ON feedback_tags;
DROP TRIGGER IF EXISTS trigger_update_widget_settings_updated_at ON widget_settings;
DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON notification_preferences;
DROP TRIGGER IF EXISTS update_feedback_updated_at ON feedback;
DROP TRIGGER IF EXISTS update_feedback_settings_updated_at ON feedback_settings;
DROP TRIGGER IF EXISTS set_feedback_priority_trigger ON feedback;

-- ============================================================================
-- 2. DROP ALL FEEDBACK-RELATED FUNCTIONS
-- ============================================================================

-- Drop feedback-related functions
DROP FUNCTION IF EXISTS notify_feedback_email();
DROP FUNCTION IF EXISTS send_feedback_email_notification();
DROP FUNCTION IF EXISTS insert_feedback_safe(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS set_feedback_created_at();
DROP FUNCTION IF EXISTS process_new_feedback();
DROP FUNCTION IF EXISTS log_feedback_analytics();
DROP FUNCTION IF EXISTS detect_urgent_keywords(TEXT);
DROP FUNCTION IF EXISTS set_feedback_priority();
DROP FUNCTION IF EXISTS create_feedback_settings_for_user(UUID);
DROP FUNCTION IF EXISTS ensure_user_feedback_settings(UUID);
DROP FUNCTION IF EXISTS can_access_feedback(UUID);
DROP FUNCTION IF EXISTS analyze_feedback_sentiment(TEXT);
DROP FUNCTION IF EXISTS get_feedbacks_with_sentiment(TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS retry_failed_notifications();
DROP FUNCTION IF EXISTS update_feedback_tags_updated_at();
DROP FUNCTION IF EXISTS update_widget_settings_updated_at();
DROP FUNCTION IF EXISTS update_notification_preferences_updated_at();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_or_create_feedback_settings(UUID);
DROP FUNCTION IF EXISTS get_user_feedback_settings(UUID);

-- ============================================================================
-- 3. DROP ALL FEEDBACK-RELATED POLICIES
-- ============================================================================

-- Drop policies for feedback table
DROP POLICY IF EXISTS "Users can view their own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can read feedback for their projects" ON feedback;
DROP POLICY IF EXISTS "Anyone can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Users can update feedback for their projects" ON feedback;
DROP POLICY IF EXISTS "Service role can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Service role can read all feedback" ON feedback;

-- Drop policies for feedbacks table (alternative naming)
DROP POLICY IF EXISTS "feedbacks_select_project_owner" ON feedbacks;
DROP POLICY IF EXISTS "feedbacks_insert_project_owner" ON feedbacks;
DROP POLICY IF EXISTS "Users can view feedbacks for their projects" ON feedbacks;
DROP POLICY IF EXISTS "Anyone can insert feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can update feedbacks for their projects" ON feedbacks;

-- Drop policies for feedback_settings table
DROP POLICY IF EXISTS "Users can view their own feedback settings" ON feedback_settings;
DROP POLICY IF EXISTS "Users can update their own feedback settings" ON feedback_settings;
DROP POLICY IF EXISTS "Users can insert their own feedback settings" ON feedback_settings;
DROP POLICY IF EXISTS "Users can delete their own feedback settings" ON feedback_settings;
DROP POLICY IF EXISTS "Users can select their own feedback settings" ON feedback_settings;

-- Drop policies for feedback_notifications table
DROP POLICY IF EXISTS "Users can view their own feedback notifications" ON feedback_notifications;
DROP POLICY IF EXISTS "Users can update their own feedback notifications" ON feedback_notifications;
DROP POLICY IF EXISTS "Users can insert their own feedback notifications" ON feedback_notifications;
DROP POLICY IF EXISTS feedback_notifications_select_policy ON feedback_notifications;
DROP POLICY IF EXISTS feedback_notifications_insert_policy ON feedback_notifications;

-- Drop policies for feedback_tags table
DROP POLICY IF EXISTS "Users can view tags for their project feedbacks" ON feedback_tags;
DROP POLICY IF EXISTS "Users can insert tags for their project feedbacks" ON feedback_tags;
DROP POLICY IF EXISTS "Users can update tags for their project feedbacks" ON feedback_tags;
DROP POLICY IF EXISTS "Users can delete tags for their project feedbacks" ON feedback_tags;

-- Drop policies for widget_settings table
DROP POLICY IF EXISTS "Users can view their own widget settings" ON widget_settings;
DROP POLICY IF EXISTS "Users can insert their own widget settings" ON widget_settings;
DROP POLICY IF EXISTS "Users can update their own widget settings" ON widget_settings;
DROP POLICY IF EXISTS "Users can delete their own widget settings" ON widget_settings;

-- Drop policies for notification_preferences table
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS notification_preferences_select_policy ON notification_preferences;
DROP POLICY IF EXISTS notification_preferences_insert_policy ON notification_preferences;
DROP POLICY IF EXISTS notification_preferences_update_policy ON notification_preferences;
DROP POLICY IF EXISTS notification_preferences_delete_policy ON notification_preferences;

-- Drop policies for ai_insights_feedback table
DROP POLICY IF EXISTS "Users can view their own feedback" ON ai_insights_feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON ai_insights_feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON ai_insights_feedback;

-- ============================================================================
-- 4. DROP ALL FEEDBACK-RELATED VIEWS
-- ============================================================================

DROP VIEW IF EXISTS notification_statistics;
DROP VIEW IF EXISTS active_feedback_settings;

-- ============================================================================
-- 5. DROP ALL FEEDBACK-RELATED INDEXES
-- ============================================================================

-- Drop indexes for feedback table
DROP INDEX IF EXISTS idx_feedback_user_id;
DROP INDEX IF EXISTS idx_feedback_status;
DROP INDEX IF EXISTS idx_feedback_created_at;
DROP INDEX IF EXISTS idx_feedback_sentiment;
DROP INDEX IF EXISTS idx_feedback_priority;
DROP INDEX IF EXISTS idx_feedback_project_id;
DROP INDEX IF EXISTS idx_feedback_channel;
DROP INDEX IF EXISTS idx_feedback_name;
DROP INDEX IF EXISTS idx_feedback_email;

-- Drop indexes for feedbacks table
DROP INDEX IF EXISTS idx_feedbacks_project_id;
DROP INDEX IF EXISTS idx_feedbacks_timestamp;
DROP INDEX IF EXISTS idx_feedbacks_status;

-- Drop indexes for feedback_settings table
DROP INDEX IF EXISTS idx_feedback_settings_user_id;
DROP INDEX IF EXISTS idx_feedback_settings_project_id;
DROP INDEX IF EXISTS idx_feedback_settings_project_id_user_unique;
DROP INDEX IF EXISTS idx_feedback_settings_project_id_unique;
DROP INDEX IF EXISTS idx_feedback_settings_project_id_global_unique;
DROP INDEX IF EXISTS idx_feedback_settings_user_id_created_at;
DROP INDEX IF EXISTS idx_feedback_settings_active;

-- Drop indexes for feedback_notifications table
DROP INDEX IF EXISTS idx_feedback_notifications_user_id;
DROP INDEX IF EXISTS idx_feedback_notifications_feedback_id;
DROP INDEX IF EXISTS idx_feedback_notifications_status;
DROP INDEX IF EXISTS idx_feedback_notifications_created_at;
DROP INDEX IF EXISTS idx_feedback_notifications_project_id;

-- Drop indexes for feedback_tags table
DROP INDEX IF EXISTS idx_feedback_tags_feedback_id;
DROP INDEX IF EXISTS idx_feedback_tags_tag;
DROP INDEX IF EXISTS idx_feedback_tags_created_at;
DROP INDEX IF EXISTS idx_feedback_tags_unique;

-- Drop indexes for widget_settings table
DROP INDEX IF EXISTS idx_widget_settings_user_id;
DROP INDEX IF EXISTS idx_widget_settings_created_at;
DROP INDEX IF EXISTS idx_widget_settings_unique_user;

-- Drop indexes for notification_preferences table
DROP INDEX IF EXISTS idx_notification_preferences_user_id;
DROP INDEX IF EXISTS idx_notification_preferences_created_at;
DROP INDEX IF EXISTS idx_notification_preferences_unique_user;

-- ============================================================================
-- 6. DROP ALL FEEDBACK-RELATED CONSTRAINTS
-- ============================================================================

-- Drop constraints for feedback table
ALTER TABLE IF EXISTS feedback DROP CONSTRAINT IF EXISTS feedback_channel_check;

-- Drop constraints for feedback_settings table
ALTER TABLE IF EXISTS feedback_settings DROP CONSTRAINT IF EXISTS feedback_settings_project_id_locked_check;
ALTER TABLE IF EXISTS feedback_settings DROP CONSTRAINT IF EXISTS feedback_settings_project_id_not_empty;
ALTER TABLE IF EXISTS feedback_settings DROP CONSTRAINT IF EXISTS feedback_settings_user_id_unique;

-- Drop constraints for feedback_tags table
ALTER TABLE IF EXISTS feedback_tags DROP CONSTRAINT IF EXISTS feedback_tags_pkey;

-- Drop constraints for widget_settings table
ALTER TABLE IF EXISTS widget_settings DROP CONSTRAINT IF EXISTS widget_settings_pkey;

-- Drop constraints for notification_preferences table
ALTER TABLE IF EXISTS notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_pkey;

-- ============================================================================
-- 7. REMOVE TABLES FROM REALTIME PUBLICATION
-- ============================================================================

ALTER PUBLICATION IF EXISTS supabase_realtime DROP TABLE IF EXISTS feedback;
ALTER PUBLICATION IF EXISTS supabase_realtime DROP TABLE IF EXISTS feedbacks;
ALTER PUBLICATION IF EXISTS supabase_realtime DROP TABLE IF EXISTS feedback_settings;
ALTER PUBLICATION IF EXISTS supabase_realtime DROP TABLE IF EXISTS feedback_notifications;
ALTER PUBLICATION IF EXISTS supabase_realtime DROP TABLE IF EXISTS feedback_tags;
ALTER PUBLICATION IF EXISTS supabase_realtime DROP TABLE IF EXISTS widget_settings;
ALTER PUBLICATION IF EXISTS supabase_realtime DROP TABLE IF EXISTS notification_preferences;

-- ============================================================================
-- 8. DROP ALL FEEDBACK-RELATED TABLES (in dependency order)
-- ============================================================================

-- Drop dependent tables first
DROP TABLE IF EXISTS feedback_tags CASCADE;
DROP TABLE IF EXISTS feedback_notifications CASCADE;
DROP TABLE IF EXISTS notification_preferences CASCADE;
DROP TABLE IF EXISTS widget_settings CASCADE;

-- Drop main feedback tables
DROP TABLE IF EXISTS feedbacks CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS feedback_settings CASCADE;

-- Drop AI insights feedback table if it exists
DROP TABLE IF EXISTS ai_insights_feedback CASCADE;

-- Drop QR and email link tables if they exist
DROP TABLE IF EXISTS qr_links CASCADE;
DROP TABLE IF EXISTS email_links CASCADE;

-- ============================================================================
-- 9. CLEAN UP ANY REMAINING FEEDBACK-RELATED OBJECTS
-- ============================================================================

-- Drop any remaining sequences related to feedback
DROP SEQUENCE IF EXISTS feedback_id_seq CASCADE;
DROP SEQUENCE IF EXISTS feedbacks_id_seq CASCADE;
DROP SEQUENCE IF EXISTS feedback_settings_id_seq CASCADE;
DROP SEQUENCE IF EXISTS feedback_notifications_id_seq CASCADE;
DROP SEQUENCE IF EXISTS feedback_tags_id_seq CASCADE;
DROP SEQUENCE IF EXISTS widget_settings_id_seq CASCADE;
DROP SEQUENCE IF EXISTS notification_preferences_id_seq CASCADE;

-- ============================================================================
-- 10. VERIFICATION QUERIES
-- ============================================================================

-- Check if any feedback-related tables still exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%feedback%' 
   OR table_name LIKE '%widget%'
   OR table_name LIKE '%notification_preferences%'
   OR table_name LIKE '%qr_links%'
   OR table_name LIKE '%email_links%'
ORDER BY table_name;

-- Check if any feedback-related functions still exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%feedback%' 
ORDER BY routine_name;

-- Check if any feedback-related triggers still exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%feedback%' 
ORDER BY trigger_name, event_object_table;

-- ============================================================================
-- CLEANUP COMPLETE
-- ============================================================================
-- All feedback-related data and configurations have been removed from your database.
-- 
-- What was removed:
-- ✅ All feedback tables (feedback, feedbacks, feedback_settings, feedback_notifications, feedback_tags, widget_settings, notification_preferences, qr_links, email_links)
-- ✅ All feedback-related triggers
-- ✅ All feedback-related functions
-- ✅ All feedback-related RLS policies
-- ✅ All feedback-related indexes
-- ✅ All feedback-related constraints
-- ✅ All feedback-related views
-- ✅ All feedback-related sequences
-- ✅ Removed tables from realtime publication
-- 
-- Your database is now clean of all feedback system components.
-- ============================================================================