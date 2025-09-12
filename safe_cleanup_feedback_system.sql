-- ============================================================================
-- SAFE FEEDBACK SYSTEM CLEANUP SCRIPT WITH BACKUP OPTIONS
-- ============================================================================
-- This script provides multiple options for cleaning up feedback-related data:
-- 1. Create backup tables before deletion
-- 2. Safe cleanup with verification
-- 3. Complete removal
-- 
-- Choose the appropriate section based on your needs.
-- ============================================================================

-- ============================================================================
-- OPTION 1: CREATE BACKUP TABLES (RECOMMENDED FIRST STEP)
-- ============================================================================
-- Uncomment this section to create backup tables before deletion

/*
-- Create backup tables with timestamp
DO $$
DECLARE
    backup_suffix TEXT := '_backup_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
BEGIN
    -- Backup feedback tables if they exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback') THEN
        EXECUTE format('CREATE TABLE feedback%s AS SELECT * FROM feedback', backup_suffix);
        RAISE NOTICE 'Created backup table: feedback%s', backup_suffix;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedbacks') THEN
        EXECUTE format('CREATE TABLE feedbacks%s AS SELECT * FROM feedbacks', backup_suffix);
        RAISE NOTICE 'Created backup table: feedbacks%s', backup_suffix;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback_settings') THEN
        EXECUTE format('CREATE TABLE feedback_settings%s AS SELECT * FROM feedback_settings', backup_suffix);
        RAISE NOTICE 'Created backup table: feedback_settings%s', backup_suffix;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback_notifications') THEN
        EXECUTE format('CREATE TABLE feedback_notifications%s AS SELECT * FROM feedback_notifications', backup_suffix);
        RAISE NOTICE 'Created backup table: feedback_notifications%s', backup_suffix;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback_tags') THEN
        EXECUTE format('CREATE TABLE feedback_tags%s AS SELECT * FROM feedback_tags', backup_suffix);
        RAISE NOTICE 'Created backup table: feedback_tags%s', backup_suffix;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'widget_settings') THEN
        EXECUTE format('CREATE TABLE widget_settings%s AS SELECT * FROM widget_settings', backup_suffix);
        RAISE NOTICE 'Created backup table: widget_settings%s', backup_suffix;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        EXECUTE format('CREATE TABLE notification_preferences%s AS SELECT * FROM notification_preferences', backup_suffix);
        RAISE NOTICE 'Created backup table: notification_preferences%s', backup_suffix;
    END IF;
    
    RAISE NOTICE 'Backup completed successfully. Backup suffix: %', backup_suffix;
END $$;
*/

-- ============================================================================
-- OPTION 2: SAFE CLEANUP WITH VERIFICATION (RECOMMENDED)
-- ============================================================================
-- This section performs cleanup with safety checks and verification

-- Check what feedback-related objects exist before cleanup
DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    trigger_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Count feedback-related tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name LIKE '%feedback%' 
       OR table_name LIKE '%widget_settings%'
       OR table_name LIKE '%notification_preferences%';
    
    -- Count feedback-related functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_name LIKE '%feedback%';
    
    -- Count feedback-related triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name LIKE '%feedback%';
    
    -- Count feedback-related policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename LIKE '%feedback%' 
       OR tablename LIKE '%widget_settings%'
       OR tablename LIKE '%notification_preferences%';
    
    RAISE NOTICE 'Found % feedback-related tables, % functions, % triggers, % policies', 
                 table_count, function_count, trigger_count, policy_count;
    
    IF table_count = 0 THEN
        RAISE NOTICE 'No feedback-related tables found. Cleanup may not be necessary.';
    END IF;
END $$;

-- ============================================================================
-- OPTION 3: COMPLETE CLEANUP (USE WITH CAUTION)
-- ============================================================================
-- Uncomment this section to perform complete cleanup

/*
-- ============================================================================
-- 1. DISABLE TRIGGERS AND FUNCTIONS FIRST
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

-- Drop policies for feedbacks table
DROP POLICY IF EXISTS "feedbacks_select_project_owner" ON feedbacks;
DROP POLICY IF EXISTS "feedbacks_insert_project_owner" ON feedbacks;
DROP POLICY IF EXISTS "Users can view feedbacks for their projects" ON feedbacks;
DROP POLICY IF EXISTS "Anyone can insert feedbacks" ON feedbacks;
DROP POLICY IF EXISTS "Users can update feedbacks for their projects" ON feedbacks;

-- Drop policies for feedback_settings table
DROP POLICY IF EXISTS "Users can view their own feedback settings" ON feedback_settings;
DROP POLICY IF EXISTS "Users can update their own feedback settings" ON feedback_settings;
DROP POLICY IF EXISTS "Users can insert their own feedback settings" ON feedback_settings;

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
-- 10. VERIFICATION AFTER CLEANUP
-- ============================================================================

-- Verify cleanup was successful
DO $$
DECLARE
    remaining_tables INTEGER;
    remaining_functions INTEGER;
    remaining_triggers INTEGER;
    remaining_policies INTEGER;
BEGIN
    -- Count remaining feedback-related objects
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables 
    WHERE table_name LIKE '%feedback%' 
       OR table_name LIKE '%widget_settings%'
       OR table_name LIKE '%notification_preferences%';
    
    SELECT COUNT(*) INTO remaining_functions
    FROM information_schema.routines 
    WHERE routine_name LIKE '%feedback%';
    
    SELECT COUNT(*) INTO remaining_triggers
    FROM information_schema.triggers 
    WHERE trigger_name LIKE '%feedback%';
    
    SELECT COUNT(*) INTO remaining_policies
    FROM pg_policies 
    WHERE tablename LIKE '%feedback%' 
       OR tablename LIKE '%widget_settings%'
       OR tablename LIKE '%notification_preferences%';
    
    IF remaining_tables = 0 AND remaining_functions = 0 AND remaining_triggers = 0 AND remaining_policies = 0 THEN
        RAISE NOTICE 'SUCCESS: All feedback-related objects have been completely removed.';
    ELSE
        RAISE NOTICE 'WARNING: Some feedback-related objects may still exist:';
        RAISE NOTICE '  Tables: %, Functions: %, Triggers: %, Policies: %', 
                     remaining_tables, remaining_functions, remaining_triggers, remaining_policies;
    END IF;
END $$;
*/

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================
-- 
-- 1. FIRST RUN: Uncomment Option 1 to create backup tables
-- 2. SECOND RUN: Uncomment Option 2 to see what will be cleaned up
-- 3. THIRD RUN: Uncomment Option 3 to perform the actual cleanup
-- 
-- This approach ensures you have backups and can verify what will be removed
-- before performing the actual cleanup.
-- 
-- ============================================================================