# Production-Ready Billing System

This is a complete, production-ready billing system for your SaaS built with Next.js, Supabase, and Paystack.

## 🏗️ Architecture Overview

The billing system follows a webhook-driven architecture where:
- **Frontend** only reads from Supabase (source of truth)
- **Paystack webhooks** update Supabase tables
- **Reconciliation job** runs daily to fix any mismatches
- **8-day free trial** is automatically managed

## 📊 Database Schema

### Tables Created

1. **`user_subscriptions`** - Tracks subscription state and billing periods
2. **`transactions`** - Records all payment transactions for audit
3. **`users`** - Enhanced with trial management and billing fields

### Key Fields

- `trial_end` - 8-day free trial end date
- `subscription_status` - Current subscription state
- `authorization_code` - Paystack reusable payment code
- `plan_code` - Links to Paystack plan codes

## 🔧 API Endpoints

### Supabase Edge Functions

1. **`/paystack-webhook`** - Handles Paystack webhook events
2. **`/cancel-subscription`** - Cancels active subscriptions
3. **`/update-card`** - Updates payment method
4. **`/reconcile-subscriptions`** - Daily reconciliation job

### Webhook Events Handled

- `charge.success` → Marks subscription active, records transaction
- `invoice.payment_failed` → Marks subscription as past_due
- `subscription.not_renewed` → Marks subscription as canceled
- `subscription.disabled` → Marks subscription as canceled

## 🚀 Setup Instructions

### 1. Environment Variables

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

### 2. Database Migration

```bash
# Apply the billing system migration
supabase db push

# Or run manually
psql -h your_host -U your_user -d your_db -f supabase/migrations/20250120000000_create_billing_system.sql
```

### 3. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy paystack-webhook
supabase functions deploy cancel-subscription
supabase functions deploy update-card
supabase functions deploy reconcile-subscriptions
```

### 4. Paystack Configuration

1. Set webhook URL: `https://your-project.supabase.co/functions/v1/paystack-webhook`
2. Configure webhook events:
   - `charge.success`
   - `invoice.payment_failed`
   - `subscription.not_renewed`
   - `subscription.disabled`

## 📱 Frontend Components

### BillingPage Component

A complete billing page that shows:
- Current subscription status
- Trial countdown
- Plan selection
- Transaction history
- Payment processing

### useBilling Hook

Custom hook providing:
- Billing data management
- Subscription actions
- Trial status checking
- Real-time updates

## 🔄 Real-time Updates

The system uses Supabase Realtime to:
- Update billing page instantly when webhooks arrive
- Show real-time subscription status changes
- Display transaction updates immediately

## 🧪 Testing

### Test Webhook Locally

```bash
# Use ngrok to expose local function
ngrok http 54321

# Update Paystack webhook URL to ngrok URL
# Test with Paystack webhook tester
```

### Test Subscription Flow

1. Create test user
2. Initiate subscription
3. Complete payment
4. Verify webhook updates
5. Check database state

## 🚨 Production Considerations

### Security

- Webhook signature verification
- Environment variable protection
- Service role key security
- CORS configuration

### Monitoring

- Webhook delivery monitoring
- Failed payment alerts
- Subscription status tracking
- Transaction reconciliation

### Backup

- Daily database backups
- Webhook event logging
- Transaction audit trail
- Plan change history

## 🔧 Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check Paystack webhook URL
   - Verify signature verification
   - Check function logs

2. **Subscription status mismatch**
   - Run reconciliation job
   - Check webhook delivery
   - Verify Paystack plan codes

3. **Trial not working**
   - Check database triggers
   - Verify user creation flow
   - Check trial_end column

### Debug Commands

```bash
# Check function logs
supabase functions logs paystack-webhook

# Check database state
supabase db reset

# Test webhook manually
curl -X POST https://your-project.supabase.co/functions/v1/paystack-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 📈 Scaling Considerations

- **Webhook processing**: Handle high volume with queue system
- **Database performance**: Index on frequently queried fields
- **Real-time updates**: Consider connection limits
- **Reconciliation**: Schedule during low-traffic periods

## 🔗 Integration Points

- **User registration** → Sets trial_end automatically
- **Payment success** → Updates subscription status
- **Trial expiration** → Blocks access automatically
- **Subscription changes** → Updates user permissions

## 📚 Additional Resources

- [Paystack Webhook Documentation](https://paystack.com/docs/payments/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Database Triggers](https://supabase.com/docs/guides/database/triggers)

---

This billing system is production-ready and follows industry best practices for SaaS billing management.
