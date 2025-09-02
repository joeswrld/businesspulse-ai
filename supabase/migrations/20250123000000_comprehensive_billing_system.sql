-- ========== COMPREHENSIVE BILLING SYSTEM MIGRATION ==========
-- This migration implements the complete SaaS billing flow with Paystack integration

-- ========== ENUMS ==========
CREATE TYPE IF NOT EXISTS subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'non_renewing', 'canceled', 'completed', 'attention'
);

CREATE TYPE IF NOT EXISTS plan_tier AS ENUM ('free', 'pro', 'business');

-- ========== PLANS TABLE ==========
CREATE TABLE IF NOT EXISTS plans (
  code TEXT PRIMARY KEY,          -- Paystack plan_code or 'free'
  name TEXT NOT NULL,
  tier plan_tier NOT NULL,
  interval TEXT NOT NULL DEFAULT 'monthly',
  price_kobo INTEGER NOT NULL DEFAULT 0,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb, -- {feedback:300, insights:50, reports:20, retention_days:365}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== USER SUBSCRIPTIONS TABLE ==========
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES plans(code),
  plan_tier plan_tier NOT NULL,
  status subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  paystack_subscription_code TEXT,   -- SUB_xxx
  paystack_email_token TEXT,         -- for enable/disable
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== USAGE COUNTERS TABLE ==========
CREATE TABLE IF NOT EXISTS usage_counters (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  feedback_count INTEGER NOT NULL DEFAULT 0,
  insights_count INTEGER NOT NULL DEFAULT 0,
  reports_count INTEGER NOT NULL DEFAULT 0,
  last_reset TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== TRANSACTIONS TABLE ==========
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_kobo INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL,                -- success | failed | pending
  reference TEXT UNIQUE,               -- Paystack transaction reference
  invoice_url TEXT,
  description TEXT,
  raw JSONB,                           -- full webhook payload for audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== WEBHOOK EVENTS TABLE ==========
CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGSERIAL PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'paystack',
  event TEXT NOT NULL,
  signature TEXT,
  payload JSONB NOT NULL,
  seen_hash TEXT UNIQUE,               -- sha256(payload) to avoid reprocessing
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_tier ON user_subscriptions(plan_tier);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_seen_hash ON webhook_events(seen_hash);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_event ON webhook_events(provider, event);

-- ========== SEED DEFAULT PLANS ==========
INSERT INTO plans (code, name, tier, interval, price_kobo, limits)
VALUES
  ('free', 'Free Trial', 'free', 'trial', 0, jsonb_build_object('feedback',50,'insights',5,'reports',2,'retention_days',30)),
  ('PLN_4z2wpgmw41w2k7r', 'Pro', 'pro', 'monthly', 3500000, jsonb_build_object('feedback',300,'insights',50,'reports',20,'retention_days',365)),
  ('PLN_esryg99ztsy9xc8', 'Business', 'business', 'monthly', 5300000, jsonb_build_object('feedback',-1,'insights',-1,'reports',-1,'retention_days',null))
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  interval = EXCLUDED.interval,
  price_kobo = EXCLUDED.price_kobo,
  limits = EXCLUDED.limits,
  created_at = NOW();

-- ========== TRIGGER FUNCTIONS ==========

-- Function to initialize trial on signup
CREATE OR REPLACE FUNCTION _init_trial_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create free trial subscription for 8 days
  INSERT INTO user_subscriptions (
    user_id, plan_code, plan_tier, status, current_period_start, current_period_end
  )
  VALUES (
    NEW.id, 'free', 'free', 'trialing', NOW(), NOW() + INTERVAL '8 days'
  );

  -- Init usage window according to free limits (8-day window to match trial)
  INSERT INTO usage_counters (user_id, period_start, period_end)
  VALUES (NEW.id, NOW(), NOW() + INTERVAL '8 days');

  RETURN NEW;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; 
$$;

-- ========== TRIGGERS ==========
DROP TRIGGER IF EXISTS _on_auth_user_created ON auth.users;
CREATE TRIGGER _on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION _init_trial_on_signup();

DROP TRIGGER IF EXISTS _sub_updated_at ON user_subscriptions;
CREATE TRIGGER _sub_updated_at
BEFORE UPDATE ON user_subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS _usage_updated_at ON usage_counters;
CREATE TRIGGER _usage_updated_at
BEFORE UPDATE ON usage_counters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========== RLS POLICIES ==========
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- User can view only their stuff
CREATE POLICY "users can select their subs"
  ON user_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users can select their usage"
  ON usage_counters FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users can select their txns"
  ON transactions FOR SELECT
  USING (user_id = auth.uid());

-- Block direct inserts/updates/deletes by clients
CREATE POLICY "no write from anon/auth on subs"
  ON user_subscriptions FOR ALL
  USING (FALSE) WITH CHECK (FALSE);

CREATE POLICY "no write from anon/auth on usage"
  ON usage_counters FOR ALL
  USING (FALSE) WITH CHECK (FALSE);

CREATE POLICY "no write from anon/auth on txns"
  ON transactions FOR ALL
  USING (FALSE) WITH CHECK (FALSE);

CREATE POLICY "service can do everything"
  ON user_subscriptions FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service can do everything usage"
  ON usage_counters FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service can do everything txns"
  ON transactions FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "service can write webhook_events"
  ON webhook_events FOR ALL
  TO service_role
  USING (TRUE) WITH CHECK (TRUE);

-- ========== CRON FUNCTIONS ==========

-- Function: mark expired trials & non-renewed subs
CREATE OR REPLACE FUNCTION billing_cron_enforce_status()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Expire trials past end date
  UPDATE user_subscriptions s
    SET status = 'canceled'
  WHERE s.plan_tier = 'free'
    AND s.status IN ('trialing','active')
    AND NOW() > s.current_period_end;

  -- Auto-downgrade past_due older than 3 days
  UPDATE user_subscriptions s
    SET status = 'canceled'
  WHERE s.status = 'past_due'
    AND NOW() > (s.current_period_end + INTERVAL '3 days');
END; 
$$;

-- Function: monthly reset for Pro, keep Business unlimited (no caps)
CREATE OR REPLACE FUNCTION billing_cron_reset_usage()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Roll the window for non-free users monthly
  UPDATE usage_counters u
  SET
    period_start = date_trunc('day', NOW()),
    period_end = date_trunc('day', NOW()) + INTERVAL '30 days',
    feedback_count = 0,
    insights_count = 0,
    reports_count = 0,
    last_reset = NOW()
  WHERE EXISTS (
    SELECT 1 FROM user_subscriptions s
    WHERE s.user_id = u.user_id
      AND s.status = 'active'
      AND s.plan_tier IN ('pro','business')
  );
END; 
$$;

-- Function: data retention purge (Free=30d, Pro=12mo, Business=∞)
CREATE OR REPLACE FUNCTION billing_cron_purge_data()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Free: purge > 30 days (example for feedbacks table)
  -- Uncomment when you have the actual tables to purge
  /*
  DELETE FROM feedbacks f
  USING user_subscriptions s
  WHERE s.user_id = f.user_id
    AND s.plan_tier = 'free'
    AND f.created_at < NOW() - INTERVAL '30 days';

  -- Pro: purge > 12 months
  DELETE FROM feedbacks f2
  USING user_subscriptions s2
  WHERE s2.user_id = f2.user_id
    AND s2.plan_tier = 'pro'
    AND f2.created_at < NOW() - INTERVAL '12 months';
  */
  -- Business: keep all (no delete)
END; 
$$;

-- ========== RPC HELPERS ==========

-- Read current limits for a user (server can enforce)
CREATE OR REPLACE FUNCTION get_current_limits(p_user_id UUID)
RETURNS JSONB LANGUAGE SQL STABLE AS $$
  SELECT p.limits
  FROM user_subscriptions s
  JOIN plans p ON p.code = s.plan_code
  WHERE s.user_id = p_user_id
  ORDER BY s.updated_at DESC
  LIMIT 1;
$$;

-- Increment usage atomically with limit check; returns boolean allowed
CREATE OR REPLACE FUNCTION try_consume_usage(p_user_id UUID, p_kind TEXT, p_amount INT DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  lim JSONB;
  max_allowed INT;
  cur_val INT;
BEGIN
  SELECT get_current_limits(p_user_id) INTO lim;
  IF lim IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_kind = 'feedback' THEN
    max_allowed := COALESCE((lim->>'feedback')::int, 0);
    SELECT feedback_count INTO cur_val FROM usage_counters WHERE user_id = p_user_id FOR UPDATE;
    IF max_allowed = -1 OR cur_val + p_amount <= max_allowed THEN
      UPDATE usage_counters SET feedback_count = feedback_count + p_amount, updated_at = NOW()
      WHERE user_id = p_user_id;
      RETURN TRUE;
    ELSE RETURN FALSE; END IF;
  ELSIF p_kind = 'insights' THEN
    max_allowed := COALESCE((lim->>'insights')::int, 0);
    SELECT insights_count INTO cur_val FROM usage_counters WHERE user_id = p_user_id FOR UPDATE;
    IF max_allowed = -1 OR cur_val + p_amount <= max_allowed THEN
      UPDATE usage_counters SET insights_count = insights_count + p_amount, updated_at = NOW()
      WHERE user_id = p_user_id;
      RETURN TRUE;
    ELSE RETURN FALSE; END IF;
  ELSIF p_kind = 'reports' THEN
    max_allowed := COALESCE((lim->>'reports')::int, 0);
    SELECT reports_count INTO cur_val FROM usage_counters WHERE user_id = p_user_id FOR UPDATE;
    IF max_allowed = -1 OR cur_val + p_amount <= max_allowed THEN
      UPDATE usage_counters SET reports_count = reports_count + p_amount, updated_at = NOW()
      WHERE user_id = p_user_id;
      RETURN TRUE;
    ELSE RETURN FALSE; END IF;
  ELSE
    RETURN FALSE;
  END IF;
END; 
$$;

-- ========== COMMENTS ==========
COMMENT ON TABLE plans IS 'Available subscription plans with limits and pricing';
COMMENT ON TABLE user_subscriptions IS 'User subscription state and billing periods';
COMMENT ON TABLE usage_counters IS 'Rolling usage counters for each user';
COMMENT ON TABLE transactions IS 'Payment transaction history from Paystack';
COMMENT ON TABLE webhook_events IS 'Webhook event log for idempotency and audit';
COMMENT ON FUNCTION _init_trial_on_signup() IS 'Automatically creates free trial for new users';
COMMENT ON FUNCTION billing_cron_enforce_status() IS 'Enforces trial expiry and payment failure handling';
COMMENT ON FUNCTION billing_cron_reset_usage() IS 'Monthly usage reset for paid plans';
COMMENT ON FUNCTION try_consume_usage(UUID, TEXT, INT) IS 'Atomic usage increment with plan limit enforcement';

-- ========== CRON SCHEDULING ==========
-- Note: These require pg_cron extension to be enabled
-- SELECT cron.schedule('billing-enforce', '0 * * * *', $$SELECT billing_cron_enforce_status();$$);
-- SELECT cron.schedule('billing-monthly-reset', '5 0 1 * *', $$SELECT billing_cron_reset_usage();$$);
-- SELECT cron.schedule('billing-purge', '15 1 * * *', $$SELECT billing_cron_purge_data();$$);
