-- ========================================
-- COMPREHENSIVE SECURITY FIXES FOR NOTEX
-- ========================================

-- ========================================
-- 1. ENABLE RLS ON ALL SENSITIVE TABLES (EXCLUDING TEAM_INVITATIONS)
-- ========================================
DO $$
BEGIN
    -- WhatsApp links
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'whatsapp_links') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'whatsapp_links') THEN
            EXECUTE 'ALTER TABLE whatsapp_links ENABLE ROW LEVEL SECURITY';
        END IF;
    END IF;

    -- Subscriptions
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'subscriptions') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'subscriptions') THEN
            EXECUTE 'ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY';
        END IF;
    END IF;

    -- User subscriptions
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_subscriptions') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_subscriptions') THEN
            EXECUTE 'ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY';
        END IF;
    END IF;

    -- Usage counters
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'usage_counters') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'usage_counters') THEN
            EXECUTE 'ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY';
        END IF;
    END IF;

    -- Transactions
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'transactions') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'transactions') THEN
            EXECUTE 'ALTER TABLE transactions ENABLE ROW LEVEL SECURITY';
        END IF;
    END IF;

    -- Webhook events
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'webhook_events') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'webhook_events') THEN
            EXECUTE 'ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY';
        END IF;
    END IF;

    -- Auth events
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'auth_events') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'auth_events') THEN
            EXECUTE 'ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY';
        END IF;
    END IF;

    -- OTP tokens
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'otp_tokens') THEN
        IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'otp_tokens') THEN
            EXECUTE 'ALTER TABLE otp_tokens ENABLE ROW LEVEL SECURITY';
        END IF;
    END IF;
END $$;

-- ========================================
-- 2. REMOVE TEAM_INVITATIONS POLICIES
-- ========================================
-- Skipped since Teams feature is not live yet

-- ========================================
-- 3. FIX SEARCH_PATH FOR ALL FUNCTIONS
-- ========================================
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT p.oid AS function_oid
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.prokind = 'f'
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %s SET search_path = public, pg_temp',
            func_record.function_oid::regprocedure
        );
    END LOOP;
END $$;

-- ========================================
-- 4. SECURITY AUDIT FUNCTION
-- ========================================
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
        t.tablename::text AS table_name,
        t.rowsecurity AS rls_enabled,
        COALESCE(p.policy_count, 0) AS policies_count,
        CASE 
            WHEN NOT t.rowsecurity THEN ARRAY['RLS not enabled']
            WHEN COALESCE(p.policy_count, 0) = 0 THEN ARRAY['No RLS policies defined']
            WHEN t.tablename IN ('subscriptions', 'user_subscriptions', 'usage_counters', 'transactions', 'webhook_events', 'auth_events', 'otp_tokens') 
                 AND COALESCE(p.policy_count, 0) < 4 THEN ARRAY['Insufficient RLS policies for sensitive table']
            ELSE ARRAY[]::text[]
        END AS security_issues
    FROM pg_tables t
    LEFT JOIN (
        SELECT schemaname, tablename, COUNT(*) AS policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY schemaname, tablename
    ) p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
    WHERE t.schemaname = 'public' AND t.tablename NOT LIKE 'pg_%'
    ORDER BY t.tablename;
END;
$$;

-- ========================================
-- 5. OTP & LEAKED PASSWORDS
-- ========================================
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

CREATE TABLE IF NOT EXISTS leaked_passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password_hash TEXT NOT NULL UNIQUE,
    leak_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 6. SECURITY MONITORING VIEW
-- ========================================
DROP VIEW IF EXISTS security_monitoring;

CREATE VIEW security_monitoring AS
-- 1. RLS summary
SELECT
    'RLS Status' AS check_type,
    total_tables,
    rls_enabled_count,
    rls_disabled_count,
    issues_count
FROM (
    SELECT 
        COUNT(*) AS total_tables,
        COUNT(*) FILTER (WHERE rls_enabled) AS rls_enabled_count,
        COUNT(*) FILTER (WHERE NOT rls_enabled) AS rls_disabled_count,
        COUNT(*) FILTER (WHERE array_length(security_issues, 1) > 0) AS issues_count
    FROM audit_security_configuration()
) AS rls_summary

UNION ALL

-- 2. Failed auth attempts
SELECT
    'Failed Auth Attempts' AS check_type,
    COUNT(*) AS total_tables,
    NULL::bigint AS rls_enabled_count,
    NULL::bigint AS rls_disabled_count,
    COUNT(*) AS issues_count
FROM audit_logs
WHERE action = 'AUTH_FAILED'

UNION ALL

-- 3. Leaked passwords
SELECT
    'Leaked Passwords' AS check_type,
    COUNT(*) AS total_tables,
    NULL::bigint AS rls_enabled_count,
    NULL::bigint AS rls_disabled_count,
    COUNT(*) AS issues_count
FROM leaked_passwords;




-- ========================================
-- 7. GRANTS
-- ========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION audit_security_configuration() TO authenticated;
GRANT SELECT ON security_monitoring TO authenticated;

-- ========================================
-- 8. FINAL SECURITY VALIDATION
-- ========================================
DO $$
DECLARE
    security_issues INTEGER;
BEGIN
    SELECT COUNT(*) INTO security_issues
    FROM audit_security_configuration() AS sec
    WHERE array_length(sec.security_issues, 1) > 0;

    IF security_issues > 0 THEN
        RAISE WARNING 'Security audit found % issues that need attention', security_issues;
    ELSE
        RAISE NOTICE 'Security audit passed - all tables properly secured';
    END IF;
END $$;
