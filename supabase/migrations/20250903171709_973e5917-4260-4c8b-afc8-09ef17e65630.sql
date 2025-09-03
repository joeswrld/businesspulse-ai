-- CRITICAL SECURITY FIXES
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

-- Note: DELETE is intentionally not allowed for subscriptions for audit purposes

-- ========== PHASE 2: DATABASE FUNCTION SECURITY HARDENING ==========

-- Fix database functions to prevent search path manipulation attacks
-- Add SET search_path = public to all security definer functions

CREATE OR REPLACE FUNCTION public.ensure_user_feedback_settings(user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Create default feedback settings for the user if they don't exist
  IF NOT EXISTS (SELECT 1 FROM feedback_settings WHERE user_id = user_id_param) THEN
    INSERT INTO feedback_settings (
      user_id,
      project_id,
      project_id_locked,
      title,
      show_name,
      show_email,
      button_text,
      theme,
      brand_color,
      redirect_url,
      notify_email
    ) VALUES (
      user_id_param,
      '',
      false,
      'Share your thoughts with us',
      true,
      true,
      'Send Feedback',
      'dark',
      '#2563eb',
      null,
      null
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_project_id_availability(project_id_param text, current_user_id uuid)
 RETURNS TABLE(is_available boolean, taken_by_user_id uuid, taken_by_email text, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  existing_record RECORD;
BEGIN
  -- Check if the project ID is already used by any other user
  SELECT fs.user_id, u.email
  INTO existing_record
  FROM feedback_settings fs
  LEFT JOIN auth.users u ON fs.user_id = u.id
  WHERE fs.project_id = project_id_param
  AND fs.user_id != current_user_id
  AND fs.project_id IS NOT NULL
  AND fs.project_id != ''
  LIMIT 1;

  -- Return the result
  RETURN QUERY
  SELECT 
    CASE 
      WHEN existing_record.user_id IS NULL THEN TRUE 
      ELSE FALSE 
    END as is_available,
    existing_record.user_id as taken_by_user_id,
    existing_record.email as taken_by_email,
    CASE 
      WHEN existing_record.user_id IS NULL THEN 'Project ID is available'
      ELSE 'Project ID is already taken by another user'
    END as message;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_project_id(project_id_param text, current_user_id uuid)
 RETURNS TABLE(is_valid boolean, is_available boolean, error_message text, taken_by_user_id uuid, taken_by_email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  validation_result RECORD;
BEGIN
  -- Check if project ID is empty or too short
  IF project_id_param IS NULL OR project_id_param = '' THEN
    RETURN QUERY
    SELECT 
      FALSE as is_valid,
      FALSE as is_available,
      'Project ID cannot be empty' as error_message,
      NULL::UUID as taken_by_user_id,
      NULL::TEXT as taken_by_email;
    RETURN;
  END IF;

  -- Check if project ID is too short
  IF length(trim(project_id_param)) < 3 THEN
    RETURN QUERY
    SELECT 
      FALSE as is_valid,
      FALSE as is_available,
      'Project ID must be at least 3 characters long' as error_message,
      NULL::UUID as taken_by_user_id,
      NULL::TEXT as taken_by_email;
    RETURN;
  END IF;

  -- Check if project ID contains invalid characters (only alphanumeric, hyphens, and underscores allowed)
  IF project_id_param !~ '^[a-zA-Z0-9_-]+$' THEN
    RETURN QUERY
    SELECT 
      FALSE as is_valid,
      FALSE as is_available,
      'Project ID can only contain letters, numbers, hyphens, and underscores' as error_message,
      NULL::UUID as taken_by_user_id,
      NULL::TEXT as taken_by_email;
    RETURN;
  END IF;

  -- Check availability
  SELECT * INTO validation_result
  FROM check_project_id_availability(project_id_param, current_user_id);

  RETURN QUERY
  SELECT 
    TRUE as is_valid,
    validation_result.is_available,
    validation_result.message as error_message,
    validation_result.taken_by_user_id,
    validation_result.taken_by_email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.safe_create_user_profile(user_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    profile_exists_by_id BOOLEAN;
    profile_exists_by_user_id BOOLEAN;
    has_user_id_col BOOLEAN;
    has_email_col BOOLEAN;
    has_full_name_col BOOLEAN;
    primary_key_col TEXT;
BEGIN
    -- Check if profile already exists by id or user_id
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id_param) INTO profile_exists_by_id;
    SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = user_id_param) INTO profile_exists_by_user_id;
    
    -- Check which columns exist in profiles table
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) INTO has_user_id_col;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) INTO has_email_col;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'full_name'
        AND table_schema = 'public'
    ) INTO has_full_name_col;
    
    -- Determine the primary key column
    SELECT column_name INTO primary_key_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'profiles' 
        AND tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
    LIMIT 1;
    
    -- If profile doesn't exist by either id or user_id, create it
    IF NOT profile_exists_by_id AND NOT profile_exists_by_user_id THEN
        -- Build dynamic INSERT statement based on available columns and primary key
        IF has_user_id_col AND primary_key_col = 'user_id' THEN
            -- Insert with user_id as primary key
            EXECUTE format('INSERT INTO profiles (user_id) VALUES (%L)', user_id_param);
        ELSIF has_user_id_col AND primary_key_col = 'id' THEN
            -- Insert with both id and user_id
            EXECUTE format('INSERT INTO profiles (id, user_id) VALUES (%L, %L)', user_id_param, user_id_param);
        ELSE
            -- Insert with only id
            EXECUTE format('INSERT INTO profiles (id) VALUES (%L)', user_id_param);
        END IF;
    END IF;
    
    -- Update profile with user data if columns exist
    IF has_email_col OR has_full_name_col THEN
        -- Build dynamic UPDATE statement
        DECLARE
            update_sql TEXT := 'UPDATE profiles SET ';
            update_parts TEXT[] := ARRAY[]::TEXT[];
            where_clause TEXT;
        BEGIN
            IF has_email_col THEN
                update_parts := array_append(update_parts, 'email = auth_users.email');
            END IF;
            
            IF has_full_name_col THEN
                update_parts := array_append(update_parts, 'full_name = auth_users.raw_user_meta_data->>''full_name''');
            END IF;
            
            IF array_length(update_parts, 1) > 0 THEN
                -- Determine the WHERE clause based on which key exists
                IF profile_exists_by_id THEN
                    where_clause := 'profiles.id = auth_users.id';
                ELSIF profile_exists_by_user_id THEN
                    where_clause := 'profiles.user_id = auth_users.id';
                ELSE
                    where_clause := 'profiles.id = auth_users.id';
                END IF;
                
                update_sql := update_sql || array_to_string(update_parts, ', ') || 
                             ' FROM auth.users auth_users ' ||
                             'WHERE ' || where_clause || ' AND auth_users.id = ' || quote_literal(user_id_param);
                EXECUTE update_sql;
            END IF;
        END;
    END IF;
    
    RAISE NOTICE 'Profile handled successfully for user %', user_id_param;
END;
$function$;

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
CREATE TRIGGER audit_subscriptions 
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_subscriptions 
  AFTER INSERT OR UPDATE OR DELETE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

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

-- Log security fix completion
INSERT INTO audit_logs (action, table_name, new_values) 
VALUES ('SECURITY_FIXES_APPLIED', 'system', '{"phase": "critical_fixes", "timestamp": "' || now() || '"}');

-- Success message
SELECT 'Critical security fixes applied successfully!' as status;