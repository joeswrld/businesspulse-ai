# Real-World Billing Flow Implementation

This document describes the comprehensive billing system implemented for NoteX, following real-world SaaS billing practices with Paystack integration.

## 🎯 Overview

The billing system implements a complete SaaS billing flow with:
- **8-day free trial** for new users
- **Pro Plan** (₦35,000/month) with 300 feedback, 50 insights, 20 reports
- **Business Plan** (₦53,000/month) with unlimited usage
- **Automatic usage tracking** and limit enforcement
- **Paystack integration** for payments and subscriptions
- **Webhook handling** for real-time billing updates
- **Data retention policies** based on plan tiers

## 🏗️ Architecture

### Database Schema

The billing system uses the following tables:

#### `plans` - Available subscription plans
```sql
CREATE TABLE plans (
  code TEXT PRIMARY KEY,          -- Paystack plan_code or 'free'
  name TEXT NOT NULL,
  tier plan_tier NOT NULL,
  interval TEXT NOT NULL DEFAULT 'monthly',
  price_kobo INTEGER NOT NULL DEFAULT 0,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `user_subscriptions` - User subscription state
```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL REFERENCES plans(code),
  plan_tier plan_tier NOT NULL,
  status subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  paystack_subscription_code TEXT,
  paystack_email_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `usage_counters` - Rolling usage counters
```sql
CREATE TABLE usage_counters (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  feedback_count INTEGER NOT NULL DEFAULT 0,
  insights_count INTEGER NOT NULL DEFAULT 0,
  reports_count INTEGER NOT NULL DEFAULT 0,
  last_reset TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `transactions` - Payment history
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_kobo INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL,
  reference TEXT UNIQUE,
  invoice_url TEXT,
  description TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Plan Limits

| Plan | Feedback | Insights | Reports | Data Retention | Price |
|------|----------|----------|---------|----------------|-------|
| Free Trial | 50 | 5 | 2 | 30 days | Free (8 days) |
| Pro | 300 | 50 | 20 | 12 months | ₦35,000/month |
| Business | Unlimited | Unlimited | Unlimited | Unlimited | ₦53,000/month |

## 🔄 Billing Flow

### 1. User Onboarding & Free Trial

When a new user signs up:

1. **Automatic Trial Creation**: Database trigger creates a free trial subscription
2. **8-Day Trial Period**: `current_period_end` set to 8 days from signup
3. **Usage Counters Reset**: All counters reset to 0 with trial limits
4. **Trial Status**: User status set to `'trialing'`

```sql
-- Trigger function automatically creates trial
CREATE OR REPLACE FUNCTION _init_trial_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (
    user_id, plan_code, plan_tier, status, 
    current_period_start, current_period_end
  )
  VALUES (
    NEW.id, 'free', 'free', 'trialing', 
    NOW(), NOW() + INTERVAL '8 days'
  );
  
  INSERT INTO usage_counters (user_id, period_start, period_end)
  VALUES (NEW.id, NOW(), NOW() + INTERVAL '8 days');
  
  RETURN NEW;
END;
$$;
```

### 2. Usage Enforcement

Every feature action is checked against limits:

```typescript
// Example: Checking if user can submit feedback
const canUse = await enforceUsageLimit(userId, 'feedback', () => {
  // Show upgrade modal when limit reached
  setShowUpgradeModal(true);
});

if (canUse) {
  // Proceed with feedback submission
  await submitFeedback(data);
}
```

### 3. Upgrade Flow

When user clicks "Upgrade":

1. **Frontend**: Shows Paystack payment modal
2. **Payment**: User completes payment via Paystack
3. **Webhook**: Paystack sends `subscription.create` webhook
4. **Backend**: Updates subscription status and resets usage counters
5. **UI**: Instantly reflects upgraded features

### 4. Recurring Billing

Monthly renewals handled automatically:

1. **Paystack**: Charges user monthly
2. **Webhook**: Sends `charge.success` webhook
3. **Backend**: Updates `current_period_end` and resets usage counters
4. **Grace Period**: 3-day grace period for failed payments

### 5. Trial Expiration

When trial expires:

1. **Cron Job**: Marks trial as expired
2. **UI**: Shows "Trial Expired" message
3. **Features**: All premium features blocked
4. **Upgrade Prompt**: Persistent upgrade modal

## 🛠️ Implementation Details

### Frontend Components

#### `useBillingEnforcement` Hook
```typescript
const {
  usage,
  subscription,
  plan,
  checks,
  enforceLimit,
  hasActiveAccess,
  isTrialActive
} = useBillingEnforcement();

// Check before allowing action
const canUse = await enforceLimit('feedback', () => {
  setShowUpgradeModal(true);
});
```

#### `UpgradeModal` Component
- Shows when limits are reached
- Displays plan comparison
- Handles upgrade flow
- Shows trial expiration warnings

#### `UsageDashboard` Component
- Real-time usage tracking
- Visual progress bars
- Plan comparison table
- Upgrade prompts

### Backend Functions

#### Paystack Webhook Handler
```typescript
// Handles subscription.create, charge.success, etc.
switch (event.event) {
  case 'subscription.create':
    await handleSubscriptionCreate(supabase, event.data);
    break;
  case 'charge.success':
    await handleChargeSuccess(supabase, event.data);
    break;
  // ... other events
}
```

#### Usage Tracking Function
```typescript
// Atomic usage increment with limit checking
const { data: canUse } = await supabase
  .rpc('try_consume_usage', {
    p_user_id: userId,
    p_kind: 'feedback',
    p_amount: 1
  });
```

### Database Functions

#### `try_consume_usage` - Atomic usage increment
```sql
CREATE OR REPLACE FUNCTION try_consume_usage(
  p_user_id UUID, 
  p_kind TEXT, 
  p_amount INT DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  lim JSONB;
  max_allowed INT;
  cur_val INT;
BEGIN
  -- Get current limits
  SELECT get_current_limits(p_user_id) INTO lim;
  
  -- Check and increment usage atomically
  IF p_kind = 'feedback' THEN
    max_allowed := COALESCE((lim->>'feedback')::int, 0);
    SELECT feedback_count INTO cur_val FROM usage_counters 
    WHERE user_id = p_user_id FOR UPDATE;
    
    IF max_allowed = -1 OR cur_val + p_amount <= max_allowed THEN
      UPDATE usage_counters 
      SET feedback_count = feedback_count + p_amount 
      WHERE user_id = p_user_id;
      RETURN TRUE;
    ELSE 
      RETURN FALSE; 
    END IF;
  END IF;
  -- ... similar logic for other features
END;
$$;
```

## 🔒 Security & Compliance

### Row Level Security (RLS)
```sql
-- Users can only see their own billing data
CREATE POLICY "users can select their subs"
  ON user_subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Block direct client writes
CREATE POLICY "no write from anon/auth on subs"
  ON user_subscriptions FOR ALL
  USING (FALSE) WITH CHECK (FALSE);
```

### Webhook Security
- Paystack signature verification
- Idempotency handling with payload hashing
- Rate limiting and error handling

### Data Retention
```sql
-- Automatic data purging based on plan
CREATE OR REPLACE FUNCTION billing_cron_purge_data()
RETURNS VOID AS $$
BEGIN
  -- Free: purge > 30 days
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
    
  -- Business: keep all (no delete)
END;
$$;
```

## 📊 Monitoring & Analytics

### Usage Tracking
- Real-time usage counters
- Monthly usage resets
- Limit enforcement logging
- Upgrade conversion tracking

### Billing Metrics
- Trial-to-paid conversion rate
- Monthly recurring revenue (MRR)
- Churn rate tracking
- Payment failure analysis

## 🚀 Deployment

### Environment Variables
```bash
# Paystack Configuration
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Migration
```bash
# Run the comprehensive billing migration
psql -f supabase/migrations/20250123000000_comprehensive_billing_system.sql
```

### Edge Functions Deployment
```bash
# Deploy webhook handler
supabase functions deploy paystack-webhook

# Deploy usage tracking
supabase functions deploy usage

# Deploy usage checking
supabase functions deploy check-usage
```

## 🧪 Testing

### Test the Billing Flow
1. **Sign up** for a new account
2. **Verify trial** is created with 8-day expiration
3. **Test usage limits** by submitting feedback/insights
4. **Upgrade to Pro** via Paystack payment
5. **Verify subscription** is activated
6. **Test monthly renewal** webhook handling

### Test Usage Enforcement
```typescript
// Test limit enforcement
const { enforceLimit } = useBillingEnforcement();

// This should show upgrade modal when limit reached
await enforceLimit('feedback', () => {
  console.log('Limit reached - showing upgrade modal');
});
```

## 📈 Business Impact

This billing system provides:

- **Predictable Revenue**: Monthly recurring subscriptions
- **User Growth**: Free trial attracts new users
- **Retention**: Usage limits encourage upgrades
- **Scalability**: Automated billing and enforcement
- **Compliance**: Data retention and security policies

## 🔧 Maintenance

### Regular Tasks
- Monitor webhook delivery success rates
- Review failed payment handling
- Update plan limits as needed
- Monitor usage patterns and conversion rates

### Troubleshooting
- Check webhook logs for failed deliveries
- Verify Paystack integration status
- Monitor database performance for usage queries
- Review RLS policies for security

---

This implementation provides a production-ready billing system that handles the complete SaaS billing lifecycle from trial to paid subscription with proper usage enforcement and upgrade flows.