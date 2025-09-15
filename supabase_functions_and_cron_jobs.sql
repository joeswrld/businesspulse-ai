-- Phase 5 Monetization - Supabase Functions and Cron Jobs
-- This script creates the necessary functions and cron jobs for usage tracking and billing

-- 1. Create function to reset monthly usage (for cron job)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID AS $$
DECLARE
  current_month VARCHAR(7) := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  reset_count INTEGER := 0;
BEGIN
  -- Reset usage_count in profiles table
  UPDATE profiles 
  SET usage_count = 0,
      monthly_usage_reset_date = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  -- Archive current month's usage data for historical tracking
  INSERT INTO usage_tracking_archive (user_id, feature_type, usage_count, month_year, archived_at)
  SELECT user_id, feature_type, usage_count, month_year, CURRENT_TIMESTAMP
  FROM usage_tracking
  WHERE month_year = current_month;
  
  -- Clear current month's usage tracking (will be recreated as needed)
  DELETE FROM usage_tracking WHERE month_year = current_month;
  
  -- Log the reset operation
  INSERT INTO system_logs (operation, details, created_at)
  VALUES (
    'monthly_usage_reset',
    jsonb_build_object(
      'reset_count', reset_count,
      'month', current_month,
      'archived_records', (SELECT COUNT(*) FROM usage_tracking WHERE month_year = current_month)
    ),
    CURRENT_TIMESTAMP
  );
  
  RAISE NOTICE 'Monthly usage reset completed for %. Reset % profiles.', current_month, reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create function to check and send usage warnings
CREATE OR REPLACE FUNCTION check_and_send_usage_warnings()
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
  usage_record RECORD;
  warning_sent BOOLEAN;
BEGIN
  -- Loop through all users with active subscriptions or trials
  FOR user_record IN 
    SELECT DISTINCT p.id, p.email, p.plan, pt.feedback_limit, pt.ai_insights_limit, pt.reports_limit
    FROM profiles p
    JOIN plan_tiers pt ON p.plan = pt.name
    WHERE p.subscription_status IN ('active', 'trial')
  LOOP
    -- Check each feature type
    FOR usage_record IN
      SELECT 
        'feedback' as feature_type,
        COALESCE(ut.usage_count, 0) as current_usage,
        user_record.feedback_limit as limit_amount
      FROM usage_tracking ut
      WHERE ut.user_id = user_record.id 
        AND ut.feature_type = 'feedback' 
        AND ut.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      UNION ALL
      SELECT 
        'ai_insights' as feature_type,
        COALESCE(ut.usage_count, 0) as current_usage,
        user_record.ai_insights_limit as limit_amount
      FROM usage_tracking ut
      WHERE ut.user_id = user_record.id 
        AND ut.feature_type = 'ai_insights' 
        AND ut.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
      UNION ALL
      SELECT 
        'reports' as feature_type,
        COALESCE(ut.usage_count, 0) as current_usage,
        user_record.reports_limit as limit_amount
      FROM usage_tracking ut
      WHERE ut.user_id = user_record.id 
        AND ut.feature_type = 'reports' 
        AND ut.month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
    LOOP
      -- Skip if unlimited
      IF usage_record.limit_amount = -1 THEN
        CONTINUE;
      END IF;
      
      -- Calculate usage percentage
      DECLARE
        usage_percentage INTEGER := (usage_record.current_usage * 100) / usage_record.limit_amount;
        notification_title VARCHAR(255);
        notification_message TEXT;
      BEGIN
        -- Only send warning if usage is above 80% and we haven't sent one recently
        IF usage_percentage >= 80 THEN
          -- Check if we've already sent a warning for this feature this month
          SELECT EXISTS(
            SELECT 1 FROM billing_notifications 
            WHERE user_id = user_record.id 
              AND notification_type = 'usage_warning'
              AND metadata->>'feature_type' = usage_record.feature_type
              AND created_at > CURRENT_DATE - INTERVAL '7 days'
          ) INTO warning_sent;
          
          IF NOT warning_sent THEN
            notification_title := 'Usage Warning: ' || INITCAP(REPLACE(usage_record.feature_type, '_', ' '));
            
            notification_message := 'You have used ' || usage_record.current_usage || ' of ' || usage_record.limit_amount || ' ' || 
                                  REPLACE(usage_record.feature_type, '_', ' ') || ' this month (' || usage_percentage || '%). ' ||
                                  CASE 
                                    WHEN usage_percentage >= 100 THEN 'You have reached your limit. Please upgrade your plan to continue.'
                                    ELSE 'Consider upgrading your plan to avoid hitting your limit.'
                                  END;
            
            -- Insert notification
            INSERT INTO billing_notifications (user_id, notification_type, title, message, metadata)
            VALUES (
              user_record.id,
              'usage_warning',
              notification_title,
              notification_message,
              jsonb_build_object(
                'feature_type', usage_record.feature_type,
                'current_usage', usage_record.current_usage,
                'limit_amount', usage_record.limit_amount,
                'usage_percentage', usage_percentage
              )
            );
          END IF;
        END IF;
      END;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to handle trial expiration
CREATE OR REPLACE FUNCTION handle_trial_expiration()
RETURNS VOID AS $$
DECLARE
  expired_trial_count INTEGER := 0;
BEGIN
  -- Update profiles where trial has expired
  UPDATE profiles 
  SET subscription_status = 'expired',
      plan = 'free',
      updated_at = CURRENT_TIMESTAMP
  WHERE subscription_status = 'trial' 
    AND trial_end_date < CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS expired_trial_count = ROW_COUNT;
  
  -- Send notifications to expired trial users
  INSERT INTO billing_notifications (user_id, notification_type, title, message, metadata)
  SELECT 
    p.id,
    'trial_expired',
    'Trial Period Ended',
    'Your free trial has ended. Upgrade to continue using all features.',
    jsonb_build_object(
      'trial_end_date', p.trial_end_date,
      'expired_at', CURRENT_TIMESTAMP
    )
  FROM profiles p
  WHERE p.subscription_status = 'expired' 
    AND p.trial_end_date < CURRENT_TIMESTAMP
    AND p.trial_end_date > CURRENT_TIMESTAMP - INTERVAL '1 day';
  
  -- Log the operation
  INSERT INTO system_logs (operation, details, created_at)
  VALUES (
    'trial_expiration_check',
    jsonb_build_object(
      'expired_count', expired_trial_count,
      'checked_at', CURRENT_TIMESTAMP
    ),
    CURRENT_TIMESTAMP
  );
  
  RAISE NOTICE 'Trial expiration check completed. % trials expired.', expired_trial_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to reconcile subscription status
CREATE OR REPLACE FUNCTION reconcile_subscription_status()
RETURNS VOID AS $$
DECLARE
  reconciled_count INTEGER := 0;
BEGIN
  -- Update profiles where subscription has ended but status is still active
  UPDATE profiles 
  SET subscription_status = 'expired',
      plan = 'free',
      updated_at = CURRENT_TIMESTAMP
  WHERE subscription_status = 'active' 
    AND subscription_end_date < CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS reconciled_count = ROW_COUNT;
  
  -- Send notifications to users whose subscriptions have expired
  INSERT INTO billing_notifications (user_id, notification_type, title, message, metadata)
  SELECT 
    p.id,
    'subscription_expired',
    'Subscription Expired',
    'Your subscription has expired. Please renew to continue using all features.',
    jsonb_build_object(
      'subscription_end_date', p.subscription_end_date,
      'expired_at', CURRENT_TIMESTAMP
    )
  FROM profiles p
  WHERE p.subscription_status = 'expired' 
    AND p.subscription_end_date < CURRENT_TIMESTAMP
    AND p.subscription_end_date > CURRENT_TIMESTAMP - INTERVAL '1 day';
  
  -- Log the operation
  INSERT INTO system_logs (operation, details, created_at)
  VALUES (
    'subscription_reconciliation',
    jsonb_build_object(
      'reconciled_count', reconciled_count,
      'checked_at', CURRENT_TIMESTAMP
    ),
    CURRENT_TIMESTAMP
  );
  
  RAISE NOTICE 'Subscription reconciliation completed. % subscriptions expired.', reconciled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create archive table for historical usage tracking
CREATE TABLE IF NOT EXISTS usage_tracking_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_type VARCHAR(50) NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  month_year VARCHAR(7) NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create system logs table for monitoring
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_archive_user_month ON usage_tracking_archive(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_archive_feature ON usage_tracking_archive(feature_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_operation ON system_logs(operation);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- 8. Enable RLS on new tables
ALTER TABLE usage_tracking_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
CREATE POLICY "Users can view own archived usage" ON usage_tracking_archive FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System logs are viewable by authenticated users" ON system_logs FOR SELECT USING (auth.role() = 'authenticated');

-- 10. Create comprehensive billing maintenance function
CREATE OR REPLACE FUNCTION run_billing_maintenance()
RETURNS VOID AS $$
DECLARE
  maintenance_start TIMESTAMP := CURRENT_TIMESTAMP;
  errors TEXT[] := '{}';
BEGIN
  -- Run all maintenance tasks
  BEGIN
    PERFORM reset_monthly_usage();
  EXCEPTION WHEN OTHERS THEN
    errors := array_append(errors, 'reset_monthly_usage: ' || SQLERRM);
  END;
  
  BEGIN
    PERFORM check_and_send_usage_warnings();
  EXCEPTION WHEN OTHERS THEN
    errors := array_append(errors, 'check_and_send_usage_warnings: ' || SQLERRM);
  END;
  
  BEGIN
    PERFORM handle_trial_expiration();
  EXCEPTION WHEN OTHERS THEN
    errors := array_append(errors, 'handle_trial_expiration: ' || SQLERRM);
  END;
  
  BEGIN
    PERFORM reconcile_subscription_status();
  EXCEPTION WHEN OTHERS THEN
    errors := array_append(errors, 'reconcile_subscription_status: ' || SQLERRM);
  END;
  
  -- Log the maintenance run
  INSERT INTO system_logs (operation, details, created_at)
  VALUES (
    'billing_maintenance',
    jsonb_build_object(
      'started_at', maintenance_start,
      'completed_at', CURRENT_TIMESTAMP,
      'duration_seconds', EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - maintenance_start)),
      'errors', errors,
      'success', array_length(errors, 1) IS NULL OR array_length(errors, 1) = 0
    ),
    CURRENT_TIMESTAMP
  );
  
  IF array_length(errors, 1) > 0 THEN
    RAISE WARNING 'Billing maintenance completed with errors: %', errors;
  ELSE
    RAISE NOTICE 'Billing maintenance completed successfully';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to get billing analytics
CREATE OR REPLACE FUNCTION get_billing_analytics()
RETURNS TABLE (
  total_users INTEGER,
  active_subscriptions INTEGER,
  trial_users INTEGER,
  expired_users INTEGER,
  total_revenue BIGINT,
  monthly_revenue BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM profiles) as total_users,
    (SELECT COUNT(*)::INTEGER FROM profiles WHERE subscription_status = 'active') as active_subscriptions,
    (SELECT COUNT(*)::INTEGER FROM profiles WHERE subscription_status = 'trial') as trial_users,
    (SELECT COUNT(*)::INTEGER FROM profiles WHERE subscription_status = 'expired') as expired_users,
    (SELECT COALESCE(SUM(sh.amount_paid), 0) FROM subscription_history sh WHERE sh.amount_paid IS NOT NULL) as total_revenue,
    (SELECT COALESCE(SUM(sh.amount_paid), 0) FROM subscription_history sh 
     WHERE sh.amount_paid IS NOT NULL 
       AND sh.created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant necessary permissions
GRANT EXECUTE ON FUNCTION reset_monthly_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_send_usage_warnings() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_trial_expiration() TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_subscription_status() TO authenticated;
GRANT EXECUTE ON FUNCTION run_billing_maintenance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_billing_analytics() TO authenticated;
GRANT SELECT ON usage_tracking_archive TO authenticated;
GRANT SELECT ON system_logs TO authenticated;

-- 13. Create trigger to automatically update usage when feedback is submitted
CREATE OR REPLACE FUNCTION trigger_feedback_usage_tracking()
RETURNS TRIGGER AS $$
DECLARE
  user_id_param UUID;
BEGIN
  -- Get the user_id from the feedback_settings table
  SELECT fs.user_id INTO user_id_param
  FROM feedback_settings fs
  WHERE fs.project_id = NEW.project_id;
  
  IF user_id_param IS NOT NULL THEN
    -- Increment usage for feedback
    PERFORM increment_usage(user_id_param, 'feedback', 1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS feedback_usage_tracking_trigger ON feedback;
CREATE TRIGGER feedback_usage_tracking_trigger
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION trigger_feedback_usage_tracking();

-- 14. Create trigger to automatically update usage when insights are generated
CREATE OR REPLACE FUNCTION trigger_insights_usage_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment usage for AI insights
  PERFORM increment_usage(NEW.user_id, 'ai_insights', 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS insights_usage_tracking_trigger ON insights_results;
CREATE TRIGGER insights_usage_tracking_trigger
  AFTER INSERT ON insights_results
  FOR EACH ROW
  EXECUTE FUNCTION trigger_insights_usage_tracking();

-- 15. Create trigger to automatically update usage when reports are generated
CREATE OR REPLACE FUNCTION trigger_reports_usage_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment usage for reports
  PERFORM increment_usage(NEW.user_id, 'reports', 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS reports_usage_tracking_trigger ON reports;
CREATE TRIGGER reports_usage_tracking_trigger
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_reports_usage_tracking();

-- 16. Create function to manually run cron jobs (for testing)
CREATE OR REPLACE FUNCTION run_cron_job(job_name TEXT)
RETURNS TEXT AS $$
BEGIN
  CASE job_name
    WHEN 'monthly_reset' THEN
      PERFORM reset_monthly_usage();
      RETURN 'Monthly usage reset completed';
    WHEN 'usage_warnings' THEN
      PERFORM check_and_send_usage_warnings();
      RETURN 'Usage warnings check completed';
    WHEN 'trial_expiration' THEN
      PERFORM handle_trial_expiration();
      RETURN 'Trial expiration check completed';
    WHEN 'subscription_reconciliation' THEN
      PERFORM reconcile_subscription_status();
      RETURN 'Subscription reconciliation completed';
    WHEN 'billing_maintenance' THEN
      PERFORM run_billing_maintenance();
      RETURN 'Billing maintenance completed';
    ELSE
      RETURN 'Unknown job name: ' || job_name;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to run cron jobs
GRANT EXECUTE ON FUNCTION run_cron_job(TEXT) TO authenticated;

-- 17. Create view for billing dashboard analytics
CREATE OR REPLACE VIEW billing_analytics_dashboard AS
SELECT 
  DATE_TRUNC('month', CURRENT_DATE) as current_month,
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE subscription_status = 'active') as active_subscriptions,
  (SELECT COUNT(*) FROM profiles WHERE subscription_status = 'trial') as trial_users,
  (SELECT COUNT(*) FROM profiles WHERE subscription_status = 'expired') as expired_users,
  (SELECT COUNT(*) FROM profiles WHERE plan = 'free') as free_users,
  (SELECT COUNT(*) FROM profiles WHERE plan = 'business') as business_users,
  (SELECT COUNT(*) FROM profiles WHERE plan = 'scale') as scale_users,
  (SELECT COALESCE(SUM(amount_paid), 0) FROM subscription_history WHERE amount_paid IS NOT NULL) as total_revenue,
  (SELECT COALESCE(SUM(amount_paid), 0) FROM subscription_history 
   WHERE amount_paid IS NOT NULL 
     AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue,
  (SELECT COALESCE(AVG(amount_paid), 0) FROM subscription_history 
   WHERE amount_paid IS NOT NULL 
     AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as average_monthly_revenue;

-- Grant access to the analytics view
GRANT SELECT ON billing_analytics_dashboard TO authenticated;

-- 18. Create RLS policy for the analytics view
CREATE POLICY "Analytics dashboard is viewable by authenticated users" ON billing_analytics_dashboard FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON FUNCTION reset_monthly_usage() IS 'Resets monthly usage counters for all users (run monthly)';
COMMENT ON FUNCTION check_and_send_usage_warnings() IS 'Checks usage limits and sends warning notifications (run daily)';
COMMENT ON FUNCTION handle_trial_expiration() IS 'Handles expired trials and sends notifications (run daily)';
COMMENT ON FUNCTION reconcile_subscription_status() IS 'Reconciles subscription status with end dates (run daily)';
COMMENT ON FUNCTION run_billing_maintenance() IS 'Runs all billing maintenance tasks (run daily)';
COMMENT ON FUNCTION get_billing_analytics() IS 'Returns billing analytics and metrics';
COMMENT ON FUNCTION run_cron_job(TEXT) IS 'Manually run specific cron jobs for testing';
COMMENT ON TABLE usage_tracking_archive IS 'Archived usage tracking data for historical analysis';
COMMENT ON TABLE system_logs IS 'System operation logs for monitoring and debugging';
COMMENT ON VIEW billing_analytics_dashboard IS 'Comprehensive billing analytics dashboard';