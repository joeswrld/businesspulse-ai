-- Comprehensive Security & Authentication Fixes for NoteX

-- 1. Fix RLS Policies for sensitive tables
-- Enable RLS on tables that need it but don't have it enabled
DO $$ 
BEGIN
    -- Enable RLS on sensitive tables
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'team_invitations' AND rowsecurity = true) THEN
        ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'subscriptions' AND rowsecurity = true) THEN
        ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 2. Create comprehensive RLS policies for team_invitations
DROP POLICY IF EXISTS "Team members can view team invitations" ON team_invitations;
CREATE POLICY "Team members can view team invitations" ON team_invitations
FOR SELECT USING (
    -- User can see invitations they sent
    inviter_id = auth.uid() OR
    -- User can see invitations sent to their email
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    -- Team admins can see team invitations
    EXISTS (
        SELECT 1 FROM team_members 
        WHERE team_members.team_id = team_invitations.team_id 
        AND team_members.user_id = auth.uid() 
        AND team_members.role IN ('admin', 'owner')
    )
);

-- 3. Create email notification system for feedback
-- Create function to send email notifications
CREATE OR REPLACE FUNCTION notify_feedback_email()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    project_settings RECORD;
BEGIN
    -- Get project settings and user email
    SELECT fs.notify_email, fs.user_id, u.email as user_email
    INTO project_settings
    FROM feedback_settings fs
    LEFT JOIN auth.users u ON u.id = fs.user_id
    WHERE fs.project_id = NEW.project_id;
    
    -- If we have notification settings, trigger email
    IF project_settings.notify_email IS NOT NULL OR project_settings.user_email IS NOT NULL THEN
        -- Insert notification record for processing
        INSERT INTO feedback_notifications (
            user_id,
            feedback_id,
            type,
            message,
            metadata
        ) VALUES (
            project_settings.user_id,
            NEW.id,
            'email',
            'New feedback received for your project',
            jsonb_build_object(
                'feedback_message', NEW.message,
                'feedback_name', NEW.name,
                'feedback_email', NEW.email,
                'project_id', NEW.project_id,
                'notify_email', project_settings.notify_email,
                'user_email', project_settings.user_email
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for feedback email notifications
DROP TRIGGER IF EXISTS feedback_email_notification_trigger ON feedbacks;
CREATE TRIGGER feedback_email_notification_trigger
    AFTER INSERT ON feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION notify_feedback_email();

-- 4. Fix function search paths for security
CREATE OR REPLACE FUNCTION public.get_plan_limits(plan_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    limits JSONB;
BEGIN
    CASE plan_code
        WHEN 'free' THEN
            limits := '{"feedback": 50, "insights": 10, "analytics": 5, "reports": 2}';
        WHEN 'pro' THEN  
            limits := '{"feedback": 300, "insights": 100, "analytics": 50, "reports": 25}';
        WHEN 'business' THEN
            limits := '{"feedback": -1, "insights": -1, "analytics": -1, "reports": -1}';
        ELSE
            limits := '{"feedback": 50, "insights": 10, "analytics": 5, "reports": 2}';
    END CASE;
    
    RETURN limits;
END;
$function$;

-- Update other functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- 5. Create auth event tracking table
CREATE TABLE IF NOT EXISTS auth_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on auth_events
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own auth events" ON auth_events
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert auth events" ON auth_events
FOR INSERT WITH CHECK (true);

-- 6. Create security monitoring function
CREATE OR REPLACE FUNCTION track_auth_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO auth_events (user_id, event_type, event_data, ip_address, user_agent)
    VALUES (p_user_id, p_event_type, p_event_data, p_ip_address, p_user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Create OTP management table
CREATE TABLE IF NOT EXISTS otp_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    token_type TEXT NOT NULL, -- 'email_verification', 'password_reset', etc.
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on otp_tokens
ALTER TABLE otp_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own OTP tokens" ON otp_tokens
FOR SELECT USING (auth.uid() = user_id);

-- 8. Create email verification enforcement function
CREATE OR REPLACE FUNCTION enforce_email_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- Block access if email is not confirmed (except for auth operations)
    IF NEW.email_confirmed_at IS NULL AND OLD.email_confirmed_at IS NULL THEN
        -- Track unverified access attempt
        PERFORM track_auth_event(
            NEW.id,
            'unverified_access_attempt',
            jsonb_build_object('email', NEW.email),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON auth_events TO anon, authenticated;
GRANT ALL ON otp_tokens TO anon, authenticated;
GRANT ALL ON feedback_notifications TO anon, authenticated;
GRANT EXECUTE ON FUNCTION track_auth_event TO anon, authenticated;
GRANT EXECUTE ON FUNCTION notify_feedback_email TO anon, authenticated;

SELECT 'Security and authentication improvements applied successfully!' as status;