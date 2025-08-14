# NoteX Real-time Billing System

A production-ready, real-time billing system that integrates with **Paystack** and updates live via **Supabase Realtime**. No mock data, just live subscription management with instant updates.

## 🚀 **Features**

- **Real-time subscription status** (trial/active/past_due/canceled)
- **Live trial countdown** with automatic expiration
- **Paystack integration** for secure payments
- **Instant UI updates** via Supabase Realtime
- **Plan management** (upgrade/downgrade/switch)
- **Transaction history** with live updates
- **Trial enforcement** and feature gating
- **Mobile-responsive design** with Tailwind CSS

## 🏗️ **Architecture**

```
Frontend (React) ←→ Supabase ←→ Paystack API
     ↓              ↓           ↓
Real-time UI    Database    Payment Processing
Updates         + RLS       + Webhooks
```

## 📋 **Prerequisites**

1. **Supabase Project** with Edge Functions enabled
2. **Paystack Account** with API keys
3. **Node.js 18+** for local development
4. **Supabase CLI** installed

## 🗄️ **Database Setup**

### 1. Run the Migration

Execute this SQL in your Supabase SQL Editor:

```sql
-- Run the complete billing system migration
-- This creates all necessary tables, indexes, and RLS policies
-- File: supabase/migrations/20241201000009_create_paystack_billing_system.sql
```

### 2. Verify Tables Created

```sql
-- Check that all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('plans', 'subscriptions', 'transactions', 'webhook_events');
```

## 🔧 **Edge Functions Setup**

### 1. Deploy Edge Functions

```bash
# Deploy billing initialization function
supabase functions deploy billing-init

# Deploy webhook handler
supabase functions deploy paystack-webhook
```

### 2. Set Environment Variables

In your Supabase Dashboard → Settings → Edge Functions:

**For `billing-init`:**
```
PAYSTACK_SECRET=sk_live_your_paystack_secret_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SITE_URL=https://yourdomain.com
```

**For `paystack-webhook`:**
```
PAYSTACK_SECRET=sk_live_your_paystack_secret_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Configure Paystack Webhook

In your Paystack Dashboard → Settings → Webhooks:

**Webhook URL:**
```
https://your-project.supabase.co/functions/v1/paystack-webhook
```

**Events to listen for:**
- `charge.success`
- `charge.failed`
- `subscription.disable`
- `subscription.enable`

## 🎯 **Frontend Integration**

### 1. Add Route to App.tsx

```tsx
import Billing from "./pages/Billing";

// Add this route
<Route path="/billing" element={
  <ProtectedRoute>
    <DashboardLayout>
      <Billing />
    </DashboardLayout>
  </ProtectedRoute>
} />
```

### 2. Update Navigation

Add billing link to your navigation menu:

```tsx
<Link to="/billing" className="flex items-center">
  <CreditCard className="h-4 w-4 mr-2" />
  Billing
</Link>
```

## 💳 **Paystack Configuration**

### 1. Get API Keys

1. Go to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Navigate to Settings → API Keys & Webhooks
3. Copy your **Secret Key** (starts with `sk_live_`)

### 2. Test Mode vs Live Mode

- **Test Mode**: Use `sk_test_` keys for development
- **Live Mode**: Use `sk_live_` keys for production

### 3. Webhook Security

The webhook handler automatically verifies Paystack signatures using HMAC-SHA512 to prevent webhook spoofing.

## 🔐 **Security Features**

### 1. Row Level Security (RLS)

All tables have RLS enabled with user-specific policies:

```sql
-- Users can only see their own data
CREATE POLICY "subscriptions_owner_all" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

### 2. API Key Protection

- Paystack secret keys are **never exposed** to the frontend
- All payment operations go through secure Edge Functions
- Service role key used only for backend operations

### 3. Webhook Verification

```typescript
// Automatic signature verification
const isValidSignature = await verifySignature(req, rawBody);
if (!isValidSignature) {
  return new Response('Invalid signature', { status: 401 });
}
```

## 📱 **Usage Flow**

### 1. User Signs Up

```sql
-- Automatically create trial subscription
SELECT create_trial_subscription('user-uuid-here');
```

### 2. User Upgrades Plan

1. User clicks "Choose Pro" button
2. Frontend calls `billing-init` Edge Function
3. Function creates Paystack transaction
4. User redirected to Paystack hosted checkout
5. After payment, webhook updates subscription status
6. UI updates instantly via Supabase Realtime

### 3. Trial Expiration

```sql
-- Check if user has active subscription
SELECT has_active_subscription('user-uuid-here');
```

## 🎨 **UI Components**

### 1. Current Plan Status

- Plan name and pricing
- Trial countdown (if applicable)
- Subscription status badge
- Next billing date

### 2. Plan Selection

- Available plans with features
- Current plan highlighted
- Upgrade/downgrade buttons
- Paystack checkout integration

### 3. Transaction History

- Payment history with live updates
- Status indicators (pending/success/failed)
- Reference numbers and amounts
- Payment dates

## 🔄 **Real-time Updates**

### 1. Subscription Changes

```typescript
// Subscribe to subscription updates
const subscriptionChannel = supabase
  .channel('billing-subscription-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'subscriptions',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    // UI updates instantly
    setSubscription(payload.new as Subscription);
  })
  .subscribe();
```

### 2. Transaction Updates

```typescript
// Subscribe to transaction updates
const transactionChannel = supabase
  .channel('billing-transaction-realtime')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'transactions',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    // Transaction list updates live
    setTransactions(prev => [payload.new, ...prev]);
  })
  .subscribe();
```

## 🧪 **Testing**

### 1. Test Webhook

```bash
# Test webhook locally
curl -X POST http://localhost:54321/functions/v1/paystack-webhook \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: test-signature" \
  -d '{"event":"charge.success","data":{"reference":"test-123"}}'
```

### 2. Test Checkout

1. Use Paystack test cards
2. Monitor Edge Function logs
3. Check database updates
4. Verify real-time UI updates

### 3. Test Trial Expiration

```sql
-- Manually expire a trial for testing
UPDATE subscriptions 
SET trial_end = NOW() - INTERVAL '1 day'
WHERE user_id = 'test-user-id';
```

## 🚨 **Troubleshooting**

### 1. Webhook Not Receiving Events

- Check Paystack webhook URL configuration
- Verify Edge Function is deployed and accessible
- Check Edge Function logs for errors
- Ensure webhook signature verification is working

### 2. Checkout Not Working

- Verify `PAYSTACK_SECRET` is set correctly
- Check Edge Function logs for initialization errors
- Ensure user profile has valid email
- Verify plan exists in database

### 3. Real-time Updates Not Working

- Check Supabase Realtime is enabled
- Verify RLS policies allow user access
- Check browser console for subscription errors
- Ensure user is authenticated

### 4. Database Errors

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('subscriptions', 'transactions');

-- Check table permissions
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name IN ('subscriptions', 'transactions');
```

## 📊 **Monitoring**

### 1. Edge Function Logs

```bash
# View function logs
supabase functions logs billing-init
supabase functions logs paystack-webhook
```

### 2. Database Monitoring

```sql
-- Monitor webhook events
SELECT event, COUNT(*) as count, 
       MAX(received_at) as last_event
FROM webhook_events 
GROUP BY event 
ORDER BY count DESC;

-- Check subscription status distribution
SELECT status, COUNT(*) as count
FROM subscriptions 
GROUP BY status;
```

### 3. Paystack Dashboard

- Monitor transaction success rates
- Check webhook delivery status
- Review payment analytics

## 🔮 **Future Enhancements**

### 1. Subscription Management

- Implement subscription cancellation Edge Function
- Add proration for plan changes
- Support annual billing cycles

### 2. Advanced Features

- Invoice generation and download
- Tax calculation and compliance
- Multiple payment methods
- Subscription analytics

### 3. Integration Features

- Slack notifications for payments
- Email receipts and reminders
- Accounting software integration

## 📚 **API Reference**

### Edge Functions

#### `billing-init`

**Endpoint:** `POST /functions/v1/billing-init`

**Request Body:**
```json
{
  "user_id": "uuid",
  "plan_code": "pro",
  "currency": "USD"
}
```

**Response:**
```json
{
  "success": true,
  "authorization_url": "https://checkout.paystack.com/...",
  "reference": "unique-reference",
  "amount": 1700,
  "currency": "USD",
  "plan_name": "Pro"
}
```

#### `paystack-webhook`

**Endpoint:** `POST /functions/v1/paystack-webhook`

**Headers:**
- `x-paystack-signature`: HMAC-SHA512 signature

**Events Handled:**
- `charge.success`: Payment completed
- `charge.failed`: Payment failed
- `subscription.disable`: Subscription canceled
- `subscription.enable`: Subscription reactivated

### Database Functions

#### `create_trial_subscription(user_uuid UUID)`

Creates a trial subscription for a new user.

#### `has_active_subscription(user_uuid UUID)`

Returns boolean indicating if user has active subscription or valid trial.

## 🎉 **Success!**

Your NoteX billing system is now:

✅ **Fully integrated** with Paystack  
✅ **Real-time updates** via Supabase Realtime  
✅ **Secure** with RLS and webhook verification  
✅ **Production-ready** with proper error handling  
✅ **Mobile-responsive** with modern UI  

Users can now upgrade plans, manage subscriptions, and see live updates without page refreshes!