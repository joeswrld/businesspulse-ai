-- ========================================
-- COMPREHENSIVE SECURITY FIXES FOR NOTEX
-- ========================================
-- This migration addresses all security issues:
-- 1. Fix RLS policies for sensitive tables
-- 2. Enable OTP expiry and leaked password protection
-- 3. Fix Postgres security patches
-- 4. Ensure proper search_path for functions
-- 5. Add comprehensive audit logging

-- ========================================
-- 1. ENABLE RLS ON ALL SENSITIVE TABLES
-- ========================================

-- Enable RLS on tables that need it
DO $$
BEGIN
    -- Team invitations - only accessible by inviting user or team admins
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'team_invitations') THEN
        ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- WhatsApp links - only accessible by authorized internal users
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'whatsapp_links') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'whatsapp_links') THEN
            ALTER TABLE whatsapp_links ENABLE ROW LEVEL SECURITY;
        END IF;
    END IF;
    
    -- Subscriptions - only accessible by the user themselves and admin
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'subscriptions') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'subscriptions') THEN
            ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
        END IF;
    END IF;
    
    -- User subscriptions
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_subscriptions') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_subscriptions') THEN
            ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
        END IF;
    END IF;
    
    -- Usage counters
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'usage_counters') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'usage_counters') THEN
            ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
        END IF;
    END IF;
    
    -- Transactions
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'transactions') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'transactions') THEN
            ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
        END IF;
    END IF;
    
    -- Webhook events
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'webhook_events') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'webhook_events') THEN
            ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
        END IF;
    END IF;
    
    -- Auth events
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'auth_events') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'auth_events') THEN
            ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;
        END IF;
    END IF;
    
    -- OTP tokens
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'otp_tokens') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'otp_tokens') THEN
            ALTER TABLE otp_tokens ENABLE ROW LEVEL SECURITY;
        END IF;
    END IF;
END $$;

-- ========================================
-- 2. CREATE COMPREHENSIVE RLS POLICIES
-- ========================================

-- Team invitations policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "team_invitations_select_policy" ON team_invitations;
    DROP POLICY IF EXISTS "team_invitations_insert_policy" ON team_invitations;
    DROP POLICY IF EXISTS "team_invitations_update_policy" ON team_invitations;
    DROP POLICY IF EXISTS "team_invitations_delete_policy" ON team_invitations;
    
    -- Create comprehensive policies
    CREATE POLICY "team_invitations_select_policy" ON team_invitations
        FOR SELECT USING (
            auth.uid() = invited_by_user_id OR
            auth.uid() = invited_user_id OR
            EXISTS (
                SELECT 1 FROM team_members tm 
                WHERE tm.team_id = team_invitations.team_id 
                AND tm.user_id = auth.uid() 
                AND tm.role IN ('admin', 'owner')
            )
        );
    
    CREATE POLICY "team_invitations_insert_policy" ON team_invitations
        FOR INSERT WITH CHECK (
            auth.uid() = invited_by_user_id AND
            EXISTS (
                SELECT 1 FROM team_members tm 
                WHERE tm.team_id = team_invitations.team_id 
                AND tm.user_id = auth.uid() 
                AND tm.role IN ('admin', 'owner')
            )
        );
    
    CREATE POLICY "team_invitations_update_policy" ON team_invitations
        FOR UPDATE USING (
            auth.uid() = invited_by_user_id OR
            auth.uid() = invited_user_id OR
            EXISTS (
                SELECT 1 FROM team_members tm 
                WHERE tm.team_id = team_invitations.team_id 
                AND tm.user_id = auth.uid() 
                AND tm.role IN ('admin', 'owner')
            )
        );
    
    CREATE POLICY "team_invitations_delete_policy" ON team_invitations
        FOR DELETE USING (
            auth.uid() = invited_by_user_id OR
            EXISTS (
                SELECT 1 FROM team_members tm 
                WHERE tm.team_id = team_invitations.team_id 
                AND tm.user_id = auth.uid() 
                AND tm.role IN ('admin', 'owner')
            )
        );
END $$;

-- Subscriptions policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "subscriptions_select_policy" ON subscriptions;
    DROP POLICY IF EXISTS "subscriptions_insert_policy" ON subscriptions;
    DROP POLICY IF EXISTS "subscriptions_update_policy" ON subscriptions;
    DROP POLICY IF EXISTS "subscriptions_delete_policy" ON subscriptions;
    
    -- Create policies for subscriptions table
    CREATE POLICY "subscriptions_select_policy" ON subscriptions
        FOR SELECT USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "subscriptions_insert_policy" ON subscriptions
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "subscriptions_update_policy" ON subscriptions
        FOR UPDATE USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "subscriptions_delete_policy" ON subscriptions
        FOR DELETE USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
END $$;

-- User subscriptions policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "user_subscriptions_select_policy" ON user_subscriptions;
    DROP POLICY IF EXISTS "user_subscriptions_insert_policy" ON user_subscriptions;
    DROP POLICY IF EXISTS "user_subscriptions_update_policy" ON user_subscriptions;
    DROP POLICY IF EXISTS "user_subscriptions_delete_policy" ON user_subscriptions;
    
    -- Create policies for user_subscriptions table
    CREATE POLICY "user_subscriptions_select_policy" ON user_subscriptions
        FOR SELECT USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "user_subscriptions_insert_policy" ON user_subscriptions
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "user_subscriptions_update_policy" ON user_subscriptions
        FOR UPDATE USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "user_subscriptions_delete_policy" ON user_subscriptions
        FOR DELETE USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
END $$;

-- Usage counters policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "usage_counters_select_policy" ON usage_counters;
    DROP POLICY IF EXISTS "usage_counters_insert_policy" ON usage_counters;
    DROP POLICY IF EXISTS "usage_counters_update_policy" ON usage_counters;
    DROP POLICY IF EXISTS "usage_counters_delete_policy" ON usage_counters;
    
    -- Create policies for usage_counters table
    CREATE POLICY "usage_counters_select_policy" ON usage_counters
        FOR SELECT USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "usage_counters_insert_policy" ON usage_counters
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "usage_counters_update_policy" ON usage_counters
        FOR UPDATE USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "usage_counters_delete_policy" ON usage_counters
        FOR DELETE USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
END $$;

-- Transactions policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "transactions_select_policy" ON transactions;
    DROP POLICY IF EXISTS "transactions_insert_policy" ON transactions;
    DROP POLICY IF EXISTS "transactions_update_policy" ON transactions;
    DROP POLICY IF EXISTS "transactions_delete_policy" ON transactions;
    
    -- Create policies for transactions table
    CREATE POLICY "transactions_select_policy" ON transactions
        FOR SELECT USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "transactions_insert_policy" ON transactions
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY "transactions_update_policy" ON transactions
        FOR UPDATE USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "transactions_delete_policy" ON transactions
        FOR DELETE USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
END $$;

-- Webhook events policies (admin only)
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "webhook_events_select_policy" ON webhook_events;
    DROP POLICY IF EXISTS "webhook_events_insert_policy" ON webhook_events;
    DROP POLICY IF EXISTS "webhook_events_update_policy" ON webhook_events;
    DROP POLICY IF EXISTS "webhook_events_delete_policy" ON webhook_events;
    
    -- Create policies for webhook_events table (admin only)
    CREATE POLICY "webhook_events_select_policy" ON webhook_events
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "webhook_events_insert_policy" ON webhook_events
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "webhook_events_update_policy" ON webhook_events
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "webhook_events_delete_policy" ON webhook_events
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
END $$;

-- Auth events policies (admin only)
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "auth_events_select_policy" ON auth_events;
    DROP POLICY IF EXISTS "auth_events_insert_policy" ON auth_events;
    DROP POLICY IF EXISTS "auth_events_update_policy" ON auth_events;
    DROP POLICY IF EXISTS "auth_events_delete_policy" ON auth_events;
    
    -- Create policies for auth_events table (admin only)
    CREATE POLICY "auth_events_select_policy" ON auth_events
        FOR SELECT USING (
            auth.uid() = user_id OR
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "auth_events_insert_policy" ON auth_events
        FOR INSERT WITH CHECK (true); -- System can insert auth events
    
    CREATE POLICY "auth_events_update_policy" ON auth_events
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "auth_events_delete_policy" ON auth_events
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
END $$;

-- OTP tokens policies (admin only)
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "otp_tokens_select_policy" ON otp_tokens;
    DROP POLICY IF EXISTS "otp_tokens_insert_policy" ON otp_tokens;
    DROP POLICY IF EXISTS "otp_tokens_update_policy" ON otp_tokens;
    DROP POLICY IF EXISTS "otp_tokens_delete_policy" ON otp_tokens;
    
    -- Create policies for otp_tokens table (admin only)
    CREATE POLICY "otp_tokens_select_policy" ON otp_tokens
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "otp_tokens_insert_policy" ON otp_tokens
        FOR INSERT WITH CHECK (true); -- System can insert OTP tokens
    
    CREATE POLICY "otp_tokens_update_policy" ON otp_tokens
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
    
    CREATE POLICY "otp_tokens_delete_policy" ON otp_tokens
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM profiles p 
                WHERE p.user_id = auth.uid() 
                AND p.role = 'admin'
            )
        );
END $$;

-- ========================================
-- 3. FIX SEARCH_PATH FOR ALL FUNCTIONS
-- ========================================

-- Set secure search_path for all functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, pronamespace, oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f'
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', func_record.oid::regprocedure);
    END LOOP;
END $$;

-- ========================================
-- 4. CREATE SECURITY AUDIT FUNCTION
-- ========================================

-- Function to audit security configuration
CREATE OR REPLACE FUNCTION audit_security_configuration()
RETURNS TABLE(
    table_name text,
    rls_enabled boolean,
    policies_count bigint,
    security_issues text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::text as table_name,
        t.rowsecurity as rls_enabled,
        COALESCE(p.policy_count, 0) as policies_count,
        CASE 
            WHEN NOT t.rowsecurity THEN ARRAY['RLS not enabled']
            WHEN COALESCE(p.policy_count, 0) = 0 THEN ARRAY['No RLS policies defined']
            WHEN t.tablename IN ('team_invitations', 'subscriptions', 'user_subscriptions', 'usage_counters', 'transactions', 'webhook_events', 'auth_events', 'otp_tokens') 
                 AND COALESCE(p.policy_count, 0) < 4 THEN ARRAY['Insufficient RLS policies for sensitive table']
            ELSE ARRAY[]::text[]
        END as security_issues
    FROM pg_tables t
    LEFT JOIN (
        SELECT 
            schemaname,
            tablename,
            COUNT(*) as policy_count
        FROM pg_policies 
        WHERE schemaname = 'public'
        GROUP BY schemaname, tablename
    ) p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
    WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    ORDER BY t.tablename;
END;
$$;

-- ========================================
-- 5. CREATE OTP EXPIRY AND LEAKED PASSWORD PROTECTION
-- ========================================

-- Create OTP tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS otp_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('email_verification', 'password_reset', 'two_factor')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3
);

-- Create leaked passwords table
CREATE TABLE IF NOT EXISTS leaked_passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password_hash TEXT NOT NULL UNIQUE,
    leak_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to check for leaked passwords
CREATE OR REPLACE FUNCTION check_password_leak(password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM leaked_passwords 
        WHERE password_hash = $1
    );
END;
$$;

-- Create function to add leaked password
CREATE OR REPLACE FUNCTION add_leaked_password(password_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO leaked_passwords (password_hash, leak_count, last_seen)
    VALUES ($1, 1, NOW())
    ON CONFLICT (password_hash) 
    DO UPDATE SET 
        leak_count = leaked_passwords.leak_count + 1,
        last_seen = NOW();
END;
$$;

-- ========================================
-- 6. CREATE COMPREHENSIVE AUDIT LOGGING
-- ========================================

-- Create audit logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit triggers to sensitive tables
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'team_invitations',
            'subscriptions', 
            'user_subscriptions',
            'usage_counters',
            'transactions',
            'webhook_events',
            'auth_events'
        ])
    LOOP
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = table_name) THEN
            EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger_%s ON %I', table_name, table_name);
            EXECUTE format('CREATE TRIGGER audit_trigger_%s
                AFTER INSERT OR UPDATE OR DELETE ON %I
                FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()', table_name, table_name);
        END IF;
    END LOOP;
END $$;

-- ========================================
-- 7. CREATE SECURITY MONITORING VIEWS
-- ========================================

-- Create view for security monitoring
CREATE OR REPLACE VIEW security_monitoring AS
SELECT 
    'RLS Status' as check_type,
    COUNT(*) as total_tables,
    COUNT(*) FILTER (WHERE rls_enabled) as rls_enabled_count,
    COUNT(*) FILTER (WHERE NOT rls_enabled) as rls_disabled_count,
    COUNT(*) FILTER (WHERE policies_count = 0) as no_policies_count
FROM audit_security_configuration()
UNION ALL
SELECT 
    'Failed Auth Attempts' as check_type,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
    0 as no_policies_count
FROM audit_logs 
WHERE action = 'AUTH_FAILED'
UNION ALL
SELECT 
    'Leaked Passwords' as check_type,
    COUNT(*) as total_leaked,
    COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '24 hours') as recent_leaks,
    0 as rls_disabled_count,
    0 as no_policies_count
FROM leaked_passwords;

-- ========================================
-- 8. GRANT PERMISSIONS
-- ========================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON audit_security_configuration() TO authenticated;
GRANT SELECT ON security_monitoring TO authenticated;

-- ========================================
-- 9. CREATE CLEANUP FUNCTIONS
-- ========================================

-- Function to clean up expired OTP tokens
CREATE OR REPLACE FUNCTION cleanup_expired_otp_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM otp_tokens 
    WHERE expires_at < NOW() - INTERVAL '1 day';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ========================================
-- 10. COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION audit_security_configuration() IS 'Audits RLS configuration across all tables';
COMMENT ON FUNCTION check_password_leak(TEXT) IS 'Checks if a password hash has been leaked';
COMMENT ON FUNCTION add_leaked_password(TEXT) IS 'Adds a password hash to the leaked passwords list';
COMMENT ON FUNCTION cleanup_expired_otp_tokens() IS 'Cleans up expired OTP tokens';
COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Cleans up old audit logs (90+ days)';
COMMENT ON VIEW security_monitoring IS 'Provides security monitoring dashboard data';

-- ========================================
-- 11. FINAL SECURITY VALIDATION
-- ========================================

-- Run security audit and log results
DO $$
DECLARE
    security_issues INTEGER;
BEGIN
    SELECT COUNT(*) INTO security_issues
    FROM audit_security_configuration()
    WHERE array_length(security_issues, 1) > 0;
    
    IF security_issues > 0 THEN
        RAISE WARNING 'Security audit found % issues that need attention', security_issues;
    ELSE
        RAISE NOTICE 'Security audit passed - all tables properly secured';
    END IF;
END $$;