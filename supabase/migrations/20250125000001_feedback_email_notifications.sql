-- ========================================
-- FEEDBACK EMAIL NOTIFICATIONS SYSTEM
-- ========================================
-- This migration sets up real-time email notifications for new feedback

-- ========================================
-- 1. CREATE NOTIFICATION PREFERENCES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email_notifications_enabled BOOLEAN DEFAULT true,
    instant_notifications BOOLEAN DEFAULT true,
    digest_notifications BOOLEAN DEFAULT false,
    digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly', 'monthly')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "notification_preferences_select_policy" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_insert_policy" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_preferences_update_policy" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notification_preferences_delete_policy" ON notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- 2. CREATE FEEDBACK NOTIFICATIONS LOG TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS feedback_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'webhook', 'sms')),
    recipient_email TEXT,
    webhook_url TEXT,
    phone_number TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

-- Enable RLS
ALTER TABLE feedback_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "feedback_notifications_select_policy" ON feedback_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "feedback_notifications_insert_policy" ON feedback_notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- 3. CREATE EMAIL NOTIFICATION FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION send_feedback_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    user_profile RECORD;
    project_settings RECORD;
    notification_prefs RECORD;
    feedback_data JSONB;
    notification_id UUID;
BEGIN
    -- Get user profile
    SELECT email, first_name, last_name, company_name
    INTO user_profile
    FROM profiles
    WHERE user_id = NEW.user_id;
    
    IF NOT FOUND THEN
        RAISE WARNING 'User profile not found for user_id: %', NEW.user_id;
        RETURN NEW;
    END IF;
    
    -- Get project settings
    SELECT project_name, project_description, notification_email
    INTO project_settings
    FROM feedback_settings
    WHERE user_id = NEW.user_id AND project_id = NEW.project_id;
    
    IF NOT FOUND THEN
        RAISE WARNING 'Project settings not found for user_id: % and project_id: %', NEW.user_id, NEW.project_id;
        RETURN NEW;
    END IF;
    
    -- Get notification preferences
    SELECT email_notifications_enabled, instant_notifications
    INTO notification_prefs
    FROM notification_preferences
    WHERE user_id = NEW.user_id;
    
    -- If no preferences found, create default ones
    IF NOT FOUND THEN
        INSERT INTO notification_preferences (user_id, email_notifications_enabled, instant_notifications)
        VALUES (NEW.user_id, true, true);
        
        notification_prefs.email_notifications_enabled := true;
        notification_prefs.instant_notifications := true;
    END IF;
    
    -- Check if notifications are enabled
    IF NOT notification_prefs.email_notifications_enabled THEN
        RAISE NOTICE 'Email notifications disabled for user_id: %', NEW.user_id;
        RETURN NEW;
    END IF;
    
    -- Prepare feedback data
    feedback_data := jsonb_build_object(
        'message', NEW.message,
        'rating', NEW.rating,
        'sender_name', NEW.sender_name,
        'sender_email', NEW.sender_email,
        'created_at', NEW.created_at::text
    );
    
    -- Create notification record
    INSERT INTO feedback_notifications (
        feedback_id,
        user_id,
        project_id,
        notification_type,
        recipient_email,
        status
    ) VALUES (
        NEW.id,
        NEW.user_id,
        NEW.project_id,
        'email',
        COALESCE(project_settings.notification_email, user_profile.email),
        'pending'
    ) RETURNING id INTO notification_id;
    
    -- Call the Edge Function to send email
    PERFORM net.http_post(
        url := (SELECT url FROM pg_net.http_request(
            method := 'POST',
            url := (SELECT 'https://' || project_id || '.supabase.co/functions/v1/send-feedback-notification'),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
            ),
            body := jsonb_build_object(
                'feedback_id', NEW.id::text,
                'user_id', NEW.user_id::text,
                'project_id', NEW.project_id,
                'feedback_data', feedback_data
            )
        )),
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
            'feedback_id', NEW.id::text,
            'user_id', NEW.user_id::text,
            'project_id', NEW.project_id,
            'feedback_data', feedback_data
        )
    );
    
    -- Update notification status
    UPDATE feedback_notifications
    SET status = 'sent', sent_at = NOW()
    WHERE id = notification_id;
    
    RAISE NOTICE 'Email notification queued for feedback_id: %', NEW.id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and update notification status
        UPDATE feedback_notifications
        SET status = 'failed', error_message = SQLERRM
        WHERE id = notification_id;
        
        RAISE WARNING 'Failed to send email notification for feedback_id: % - %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- ========================================
-- 4. CREATE TRIGGER FOR FEEDBACK NOTIFICATIONS
-- ========================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_send_feedback_email_notification ON feedbacks;

-- Create trigger
CREATE TRIGGER trigger_send_feedback_email_notification
    AFTER INSERT ON feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION send_feedback_email_notification();

-- ========================================
-- 5. CREATE RETRY MECHANISM FOR FAILED NOTIFICATIONS
-- ========================================

CREATE OR REPLACE FUNCTION retry_failed_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    notification_record RECORD;
    retry_count INTEGER := 0;
    feedback_data JSONB;
BEGIN
    -- Get failed notifications that haven't exceeded max retries
    FOR notification_record IN
        SELECT fn.*, p.email, p.first_name, p.last_name, p.company_name,
               fs.project_name, fs.project_description, fs.notification_email
        FROM feedback_notifications fn
        JOIN profiles p ON p.user_id = fn.user_id
        JOIN feedback_settings fs ON fs.user_id = fn.user_id AND fs.project_id = fn.project_id
        WHERE fn.status = 'failed'
        AND fn.retry_count < fn.max_retries
        AND fn.notification_type = 'email'
        ORDER BY fn.sent_at
        LIMIT 10
    LOOP
        -- Prepare feedback data
        SELECT jsonb_build_object(
            'message', f.message,
            'rating', f.rating,
            'sender_name', f.sender_name,
            'sender_email', f.sender_email,
            'created_at', f.created_at::text
        ) INTO feedback_data
        FROM feedbacks f
        WHERE f.id = notification_record.feedback_id;
        
        -- Update retry count
        UPDATE feedback_notifications
        SET retry_count = retry_count + 1,
            status = 'pending'
        WHERE id = notification_record.id;
        
        -- Call the Edge Function to retry sending email
        PERFORM net.http_post(
            url := (SELECT 'https://' || notification_record.project_id || '.supabase.co/functions/v1/send-feedback-notification'),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key', true))
            ),
            body := jsonb_build_object(
                'feedback_id', notification_record.feedback_id::text,
                'user_id', notification_record.user_id::text,
                'project_id', notification_record.project_id,
                'feedback_data', feedback_data
            )
        );
        
        retry_count := retry_count + 1;
    END LOOP;
    
    RETURN retry_count;
END;
$$;

-- ========================================
-- 6. CREATE NOTIFICATION PREFERENCES MANAGEMENT FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION update_notification_preferences(
    p_user_id UUID,
    p_email_notifications_enabled BOOLEAN DEFAULT NULL,
    p_instant_notifications BOOLEAN DEFAULT NULL,
    p_digest_notifications BOOLEAN DEFAULT NULL,
    p_digest_frequency TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Insert or update notification preferences
    INSERT INTO notification_preferences (
        user_id,
        email_notifications_enabled,
        instant_notifications,
        digest_notifications,
        digest_frequency,
        updated_at
    ) VALUES (
        p_user_id,
        COALESCE(p_email_notifications_enabled, true),
        COALESCE(p_instant_notifications, true),
        COALESCE(p_digest_notifications, false),
        COALESCE(p_digest_frequency, 'daily')
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        email_notifications_enabled = COALESCE(p_email_notifications_enabled, notification_preferences.email_notifications_enabled),
        instant_notifications = COALESCE(p_instant_notifications, notification_preferences.instant_notifications),
        digest_notifications = COALESCE(p_digest_notifications, notification_preferences.digest_notifications),
        digest_frequency = COALESCE(p_digest_frequency, notification_preferences.digest_frequency),
        updated_at = NOW();
END;
$$;

-- ========================================
-- 7. CREATE NOTIFICATION STATISTICS VIEW
-- ========================================

CREATE OR REPLACE VIEW notification_statistics AS
SELECT 
    user_id,
    project_id,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_delivery_time_seconds,
    MAX(sent_at) as last_notification_sent
FROM feedback_notifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, project_id;

-- ========================================
-- 8. GRANT PERMISSIONS
-- ========================================

-- Grant permissions for notification preferences
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT SELECT ON feedback_notifications TO authenticated;
GRANT SELECT ON notification_statistics TO authenticated;

-- Grant execute permissions for functions
GRANT EXECUTE ON FUNCTION update_notification_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION retry_failed_notifications() TO authenticated;

-- ========================================
-- 9. COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON TABLE notification_preferences IS 'User notification preferences for feedback alerts';
COMMENT ON TABLE feedback_notifications IS 'Log of all feedback notifications sent to users';
COMMENT ON FUNCTION send_feedback_email_notification() IS 'Trigger function to send email notifications for new feedback';
COMMENT ON FUNCTION retry_failed_notifications() IS 'Retry mechanism for failed email notifications';
COMMENT ON FUNCTION update_notification_preferences(UUID, BOOLEAN, BOOLEAN, BOOLEAN, TEXT) IS 'Update user notification preferences';
COMMENT ON VIEW notification_statistics IS 'Statistics on notification delivery performance';

-- ========================================
-- 10. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Indexes for notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Indexes for feedback_notifications
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_user_id ON feedback_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_feedback_id ON feedback_notifications(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_status ON feedback_notifications(status);
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_sent_at ON feedback_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_created_at ON feedback_notifications(created_at);

-- ========================================
-- 11. INITIAL DATA SETUP
-- ========================================

-- Create notification preferences for existing users
INSERT INTO notification_preferences (user_id, email_notifications_enabled, instant_notifications)
SELECT 
    p.user_id,
    true as email_notifications_enabled,
    true as instant_notifications
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences np 
    WHERE np.user_id = p.user_id
)
ON CONFLICT (user_id) DO NOTHING;