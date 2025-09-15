-- NoteX: 30-day rolling free plan implementation
-- - Adds cycle_start to usage_counters for per-user rolling windows
-- - Reworks ensure/get/increment/enforcement to use 30-day cycle
-- - Updates free plan limits per requirements

-- 1) Schema updates: usage_counters add cycle_start and index/uniq
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'usage_counters' AND column_name = 'cycle_start'
  ) THEN
    ALTER TABLE usage_counters ADD COLUMN cycle_start DATE;
  END IF;
END $$;

-- Backfill cycle_start from month_start if present; else default to today
UPDATE usage_counters 
SET cycle_start = COALESCE(cycle_start, month_start, CURRENT_DATE)
WHERE cycle_start IS NULL;

-- Unique constraint on (user_id, cycle_start)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
      AND table_name = 'usage_counters' 
      AND constraint_name = 'usage_counters_user_cycle_unique'
  ) THEN
    ALTER TABLE usage_counters
    ADD CONSTRAINT usage_counters_user_cycle_unique UNIQUE (user_id, cycle_start);
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_cycle ON usage_counters(user_id, cycle_start);

-- 2) Helper: get current rolling cycle start for a user (30-day window)
CREATE OR REPLACE FUNCTION get_current_cycle_start(user_uuid UUID)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cycle_start DATE;
BEGIN
  SELECT uc.cycle_start
  INTO v_cycle_start
  FROM usage_counters uc
  WHERE uc.user_id = user_uuid
  ORDER BY uc.cycle_start DESC
  LIMIT 1;

  IF v_cycle_start IS NULL THEN
    RETURN CURRENT_DATE; -- first use starts today
  END IF;

  IF CURRENT_DATE >= (v_cycle_start + INTERVAL '30 days') THEN
    RETURN CURRENT_DATE; -- start a new 30-day cycle
  END IF;

  RETURN v_cycle_start; -- still within current cycle
END;
$$;

-- 3) Ensure there is a usage row for the current rolling cycle
CREATE OR REPLACE FUNCTION ensure_current_cycle_usage(user_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  cycle_start DATE,
  feedback_count INTEGER,
  insights_count INTEGER,
  analytics_count INTEGER,
  reports_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cycle_start DATE := get_current_cycle_start(user_uuid);
  rec RECORD;
BEGIN
  -- If past cycle expired, start a new one with zeroed counters
  SELECT * INTO rec
  FROM usage_counters
  WHERE user_id = user_uuid AND cycle_start = v_cycle_start
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO usage_counters (
      user_id, cycle_start, month_start, feedback_count, insights_count, analytics_count, reports_count, created_at, updated_at
    ) VALUES (
      user_uuid, v_cycle_start, DATE_TRUNC('month', v_cycle_start)::DATE, 0, 0, 0, 0, NOW(), NOW()
    )
    ON CONFLICT (user_id, cycle_start) DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT uc.user_id, uc.cycle_start, COALESCE(uc.feedback_count, 0), COALESCE(uc.insights_count, 0), COALESCE(uc.analytics_count, 0), COALESCE(uc.reports_count, 0), uc.created_at, uc.updated_at
  FROM usage_counters uc
  WHERE uc.user_id = user_uuid AND uc.cycle_start = v_cycle_start
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_current_cycle_usage(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_current_cycle_start(UUID) TO authenticated, service_role;

-- 4) Update get_plan_limits to reflect new free plan limits
--    Free: Feedback 50, AI Insights 5, Reports 5. Others unchanged.
CREATE OR REPLACE FUNCTION get_plan_limits(plan_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    limits JSONB;
BEGIN
    CASE plan_code
        WHEN 'free' THEN
            limits := jsonb_build_object(
              'feedback', 50,
              'insights', 5,
              'analytics', 0,
              'reports', 5
            );
        WHEN 'pro' THEN  
            limits := jsonb_build_object(
              'feedback', 300,
              'insights', 50,
              'analytics', 50,
              'reports', 20
            );
        WHEN 'business' THEN
            limits := jsonb_build_object(
              'feedback', -1,
              'insights', -1,
              'analytics', -1,
              'reports', -1
            );
        ELSE
            limits := jsonb_build_object(
              'feedback', 50,
              'insights', 5,
              'analytics', 0,
              'reports', 5
            );
    END CASE;
    RETURN limits;
END;
$$;

GRANT EXECUTE ON FUNCTION get_plan_limits(TEXT) TO authenticated, service_role;

-- 5) can_use_feature: now uses rolling cycle
CREATE OR REPLACE FUNCTION can_use_feature(user_uuid UUID, feature_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cycle_start DATE := get_current_cycle_start(user_uuid);
  usage_record RECORD;
  plan_limits JSONB;
  limit_value INT;
  current_usage INT;
  user_plan_code TEXT;
BEGIN
  PERFORM ensure_current_cycle_usage(user_uuid);

  SELECT uc.*, COALESCE(bp.plan, 'free') as plan_code
  INTO usage_record
  FROM usage_counters uc
  LEFT JOIN billing_profiles bp ON bp.id = uc.user_id
  WHERE uc.user_id = user_uuid AND uc.cycle_start = v_cycle_start
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  plan_limits := get_plan_limits(usage_record.plan_code);

  CASE feature_name
    WHEN 'feedback' THEN
      current_usage := COALESCE(usage_record.feedback_count, 0);
      limit_value := (plan_limits->>'feedback')::INT;
    WHEN 'insights' THEN
      current_usage := COALESCE(usage_record.insights_count, 0);
      limit_value := (plan_limits->>'insights')::INT;
    WHEN 'analytics' THEN
      current_usage := COALESCE(usage_record.analytics_count, 0);
      limit_value := (plan_limits->>'analytics')::INT;
    WHEN 'reports' THEN
      current_usage := COALESCE(usage_record.reports_count, 0);
      limit_value := (plan_limits->>'reports')::INT;
    ELSE
      RETURN FALSE;
  END CASE;

  IF limit_value = -1 THEN
    RETURN TRUE;
  END IF;

  RETURN current_usage < limit_value;
END;
$$;

GRANT EXECUTE ON FUNCTION can_use_feature(UUID, TEXT) TO authenticated, service_role;

-- 6) increment_usage_with_check: now uses rolling cycle and returns JSONB
CREATE OR REPLACE FUNCTION increment_usage_with_check(user_uuid UUID, feature_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cycle_start DATE := get_current_cycle_start(user_uuid);
  can_use BOOLEAN;
  result JSONB;
BEGIN
  -- Ensure current cycle exists and check
  PERFORM ensure_current_cycle_usage(user_uuid);
  can_use := can_use_feature(user_uuid, feature_name);
  IF NOT can_use THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usage limit exceeded for ' || feature_name, 'feature', feature_name);
  END IF;

  -- Increment appropriate counter
  CASE feature_name
    WHEN 'feedback' THEN
      UPDATE usage_counters SET feedback_count = COALESCE(feedback_count,0) + 1, updated_at = NOW()
      WHERE user_id = user_uuid AND cycle_start = v_cycle_start;
    WHEN 'insights' THEN
      UPDATE usage_counters SET insights_count = COALESCE(insights_count,0) + 1, updated_at = NOW()
      WHERE user_id = user_uuid AND cycle_start = v_cycle_start;
    WHEN 'analytics' THEN
      UPDATE usage_counters SET analytics_count = COALESCE(analytics_count,0) + 1, updated_at = NOW()
      WHERE user_id = user_uuid AND cycle_start = v_cycle_start;
    WHEN 'reports' THEN
      UPDATE usage_counters SET reports_count = COALESCE(reports_count,0) + 1, updated_at = NOW()
      WHERE user_id = user_uuid AND cycle_start = v_cycle_start;
  END CASE;

  -- Return updated snapshot
  SELECT jsonb_build_object(
    'success', true,
    'feature', feature_name,
    'current_usage', CASE feature_name
      WHEN 'feedback' THEN uc.feedback_count
      WHEN 'insights' THEN uc.insights_count
      WHEN 'analytics' THEN uc.analytics_count
      WHEN 'reports' THEN uc.reports_count
    END,
    'plan', COALESCE(bp.plan, 'free'),
    'cycle_start', uc.cycle_start,
    'cycle_end', (uc.cycle_start + INTERVAL '30 days')::date
  ) INTO result
  FROM usage_counters uc
  LEFT JOIN billing_profiles bp ON bp.id = uc.user_id
  WHERE uc.user_id = user_uuid AND uc.cycle_start = v_cycle_start
  LIMIT 1;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_usage_with_check(UUID, TEXT) TO authenticated, service_role;

-- 7) Optional: utility to compute days remaining in current cycle
CREATE OR REPLACE FUNCTION get_cycle_days_remaining(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cycle_start DATE := get_current_cycle_start(user_uuid);
  days_left INT;
BEGIN
  days_left := GREATEST(0, (v_cycle_start + INTERVAL '30 days')::date - CURRENT_DATE);
  RETURN days_left;
END;
$$;

GRANT EXECUTE ON FUNCTION get_cycle_days_remaining(UUID) TO authenticated, service_role;

-- 8) Notes:
-- - Existing calendar-month functions remain for compatibility but are superseded by rolling-cycle versions above.
-- - Frontend should display cycle window [cycle_start, cycle_start+30d) and updated free limits.
-- - Data retention for free users (8 days) to be enforced at application layer or via separate cleanup job.

-- 9) Optional notifications: get users nearing limits or cycle reset
CREATE OR REPLACE FUNCTION get_users_near_free_limits(threshold_percent INT DEFAULT 90)
RETURNS TABLE (
  user_id UUID,
  feature TEXT,
  current_usage INT,
  limit_value INT,
  percentage INT,
  cycle_days_remaining INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lims JSONB;
  v_cycle_start DATE;
  days_left INT;
BEGIN
  FOR user_id IN SELECT DISTINCT user_id FROM usage_counters LOOP
    v_cycle_start := get_current_cycle_start(user_id);
    days_left := GREATEST(0, (v_cycle_start + INTERVAL '30 days')::date - CURRENT_DATE);
    SELECT get_plan_limits(COALESCE(bp.plan, 'free')) INTO lims
    FROM billing_profiles bp WHERE bp.id = user_id;
    IF lims IS NULL THEN lims := get_plan_limits('free'); END IF;

    RETURN QUERY
    WITH uc AS (
      SELECT * FROM usage_counters WHERE user_id = get_users_near_free_limits.user_id AND cycle_start = v_cycle_start
    )
    SELECT get_users_near_free_limits.user_id, feat.feature, feat.current_usage, feat.limit_value,
           CASE WHEN feat.limit_value = -1 THEN 0 ELSE (feat.current_usage * 100 / GREATEST(feat.limit_value,1)) END as percentage,
           days_left
    FROM (
      SELECT 'feedback'::text as feature, COALESCE(u.feedback_count,0) as current_usage, (lims->>'feedback')::int as limit_value FROM uc u
      UNION ALL
      SELECT 'insights', COALESCE(u.insights_count,0), (lims->>'insights')::int FROM uc u
      UNION ALL
      SELECT 'analytics', COALESCE(u.analytics_count,0), (lims->>'analytics')::int FROM uc u
      UNION ALL
      SELECT 'reports', COALESCE(u.reports_count,0), (lims->>'reports')::int FROM uc u
    ) feat
    WHERE feat.limit_value <> -1
      AND (feat.current_usage * 100 / GREATEST(feat.limit_value,1)) >= threshold_percent;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION get_users_near_free_limits(INT) TO service_role;

