-- CRITICAL SECURITY FIXES (CORRECTED)
-- This migration addresses the most critical security vulnerabilities identified in the security review

-- ========== PHASE 1: CRITICAL SECURITY FIXES ==========

-- 1. Enable RLS and create policies for user_insights_history table (CRITICAL - currently exposed)
ALTER TABLE user_insights_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_insights_history
CREATE POLICY "Users can view their own insights history" ON user_insights_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights history" ON user_insights_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights history" ON user_insights_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights history" ON user_insights_history
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Add comprehensive policies for subscriptions table
DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;

CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- ========== AUDIT AND MONITORING ==========

-- Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create a security function to get current user role (prevents infinite recursion in RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS TEXT 
 LANGUAGE SQL 
 SECURITY DEFINER 
 STABLE 
 SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Only admins can view audit logs (using the secure function)
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (get_current_user_role() = 'admin');

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Log the operation
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
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_subscriptions ON subscriptions;
CREATE TRIGGER audit_subscriptions 
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_user_subscriptions ON user_subscriptions;
CREATE TRIGGER audit_user_subscriptions 
  AFTER INSERT OR UPDATE OR DELETE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_transactions ON transactions;
CREATE TRIGGER audit_transactions 
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ========== SECURITY VALIDATION ==========

-- Create function to validate all RLS policies
CREATE OR REPLACE FUNCTION public.validate_security_policies()
 RETURNS TABLE(table_name text, rls_enabled boolean, policies_count bigint, issues text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    t.rowsecurity as rls_enabled,
    COALESCE(p.policy_count, 0) as policies_count,
    CASE 
      WHEN NOT t.rowsecurity THEN ARRAY['RLS not enabled']
      WHEN COALESCE(p.policy_count, 0) = 0 THEN ARRAY['No RLS policies defined']
      ELSE ARRAY[]::text[]
    END as issues
  FROM pg_tables t
  LEFT JOIN (
    SELECT 
      schemaname, 
      tablename, 
      COUNT(*) as policy_count
    FROM pg_policies 
    GROUP BY schemaname, tablename
  ) p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$function$;

COMMENT ON FUNCTION validate_security_policies() IS 'Validates RLS configuration across all tables';

-- Log security fix completion with proper JSONB casting
INSERT INTO audit_logs (action, table_name, new_values) 
VALUES ('SECURITY_FIXES_APPLIED', 'system', '{"phase": "critical_fixes", "timestamp": "2025-01-25T17:00:00Z"}'::jsonb);

-- Success message
SELECT 'Critical security fixes applied successfully!' as status;