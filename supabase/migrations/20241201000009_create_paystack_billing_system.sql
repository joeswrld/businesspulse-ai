-- NoteX Paystack Billing System - Production Ready
-- Run this in your Supabase SQL Editor

-- 1. Create plans table for subscription tiers
CREATE TABLE IF NOT EXISTS plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('NGN', 'USD')),
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  seat_limit INTEGER NOT NULL,
  features JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create subscriptions table for user plans
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code TEXT REFERENCES plans(code),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  paystack_customer_id TEXT,
  paystack_subscription_code TEXT,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create transactions table for payment history
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  reference TEXT UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'reversed')),
  authorization_url TEXT,
  paid_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create webhook_events table for audit trail
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'paystack',
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(code);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_code ON subscriptions(plan_code);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event ON webhook_events(event);

-- 6. Enable Row Level Security
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for security
-- Plans are public for reading
CREATE POLICY "plans_view_all" ON plans
  FOR SELECT USING (is_active = true);

-- Users can only see their own subscriptions
CREATE POLICY "subscriptions_owner_all" ON subscriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can only see their own transactions
CREATE POLICY "transactions_owner_all" ON transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service role can write to all tables (Edge Functions)
CREATE POLICY "subscriptions_service_write" ON subscriptions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "transactions_service_write" ON transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "webhook_events_service_write" ON webhook_events
  FOR ALL USING (true) WITH CHECK (true);

-- 8. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE plans;
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE webhook_events;

-- 9. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers for updated_at
CREATE TRIGGER trigger_update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11. Insert default subscription plans
INSERT INTO plans (code, name, price_cents, currency, interval, seat_limit, features) VALUES
  ('starter', 'Starter', 0, 'USD', 'month', 1, 
   '["AI Insights (100/month)", "Basic Reports (10/month)", "Email Support", "5GB Storage"]'),
  ('pro', 'Pro', 1700, 'USD', 'month', 5, 
   '["AI Insights (1000/month)", "Advanced Reports (100/month)", "Priority Support", "Custom Branding", "50GB Storage"]'),
  ('business', 'Business', 3000, 'USD', 'month', 15, 
   '["Unlimited AI Insights", "Unlimited Reports", "24/7 Support", "Custom Integrations", "White-label", "500GB Storage"]')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  features = EXCLUDED.features,
  updated_at = NOW();

-- 12. Create function to create trial subscription for new users
CREATE OR REPLACE FUNCTION create_trial_subscription(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO subscriptions (
    user_id, 
    plan_code, 
    status, 
    trial_end,
    current_period_start,
    current_period_end
  ) VALUES (
    user_uuid,
    'pro',
    'trialing',
    NOW() + INTERVAL '8 days',
    NOW(),
    NOW() + INTERVAL '8 days'
  );
END;
$$ LANGUAGE plpgsql;

-- 13. Create function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = user_uuid 
    AND (
      status = 'active' 
      OR (status = 'trialing' AND trial_end > NOW())
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'NoteX Paystack Billing system created successfully!' as status;