-- ========================================
-- FEEDBACK EMAIL NOTIFICATIONS SYSTEM
-- ========================================

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

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_preferences' AND policyname='notification_preferences_select_policy') THEN
        CREATE POLICY notification_preferences_select_policy ON notification_preferences
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_preferences' AND policyname='notification_preferences_insert_policy') THEN
        CREATE POLICY notification_preferences_insert_policy ON notification_preferences
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_preferences' AND policyname='notification_preferences_update_policy') THEN
        CREATE POLICY notification_preferences_update_policy ON notification_preferences
        FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notification_preferences' AND policyname='notification_preferences_delete_policy') THEN
        CREATE POLICY notification_preferences_delete_policy ON notification_preferences
        FOR DELETE USING (auth.uid() = user_id);
    END IF;
END$$;

-- ========================================
-- 2. CREATE FEEDBACK NOTIFICATIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS feedback_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id TEXT,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'webhook', 'sms')) DEFAULT 'email',
    recipient_email TEXT,
    webhook_url TEXT,
    phone_number TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE feedback_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feedback_notifications' AND policyname='feedback_notifications_select_policy') THEN
        CREATE POLICY feedback_notifications_select_policy ON feedback_notifications
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='feedback_notifications' AND policyname='feedback_notifications_insert_policy') THEN
        CREATE POLICY feedback_notifications_insert_policy ON feedback_notifications
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END$$;

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

    IF NOT FOUND THEN
        INSERT INTO notification_preferences (user_id, email_notifications_enabled, instant_notifications)
        VALUES (NEW.user_id, true, true);
        notification_prefs.email_notifications_enabled := true;
        notification_prefs.instant_notifications := true;
    END IF;

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

    -- Placeholder for sending email (Edge Function)
    -- PERFORM net.http_post(...)

    -- Update notification status
    UPDATE feedback_notifications
    SET status = 'sent', sent_at = NOW()
    WHERE id = notification_id;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        UPDATE feedback_notifications
        SET status = 'failed', error_message = SQLERRM
        WHERE id = notification_id;
        RETURN NEW;
END;
$$;

-- ========================================
-- 4. CREATE TRIGGER FOR FEEDBACK NOTIFICATIONS
-- ========================================

DROP TRIGGER IF EXISTS trigger_send_feedback_email_notification ON feedbacks;

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
        SELECT jsonb_build_object(
            'message', f.message,
            'rating', f.rating,
            'sender_name', f.sender_name,
            'sender_email', f.sender_email,
            'created_at', f.created_at::text
        ) INTO feedback_data
        FROM feedbacks f
        WHERE f.id = notification_record.feedback_id;

        UPDATE feedback_notifications
        SET retry_count = retry_count + 1,
            status = 'pending'
        WHERE id = notification_record.id;

        -- PERFORM net.http_post(...) placeholder

        retry_count := retry_count + 1;
    END LOOP;

    RETURN retry_count;
END;
$$;

-- ========================================
-- 6. CREATE NOTIFICATION STATISTICS VIEW
-- ========================================

CREATE OR REPLACE VIEW notification_statistics AS
SELECT 
    user_id,
    project_id,
    COUNT(*) AS total_notifications,
    COUNT(*) FILTER (WHERE status = 'sent') AS sent_count,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
    AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) AS avg_delivery_time_seconds,
    MAX(sent_at) AS last_notification_sent
FROM feedback_notifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, project_id;

-- ========================================
-- 7. INITIAL DATA SETUP
-- ========================================

INSERT INTO notification_preferences (user_id, email_notifications_enabled, instant_notifications)
SELECT 
    p.user_id,
    true,
    true
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences np 
    WHERE np.user_id = p.user_id
);

-- ========================================
-- 8. INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_feedback_notifications_user_id ON feedback_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_feedback_id ON feedback_notifications(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_status ON feedback_notifications(status);
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_created_at ON feedback_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_notifications_project_id ON feedback_notifications(project_id);
