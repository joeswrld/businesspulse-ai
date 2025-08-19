# Paystack Integration Setup Guide

This guide will help you set up Paystack subscriptions for your NoteX BI platform with Pro (₦35,000/month) and Business (₦53,000/month) plans.

## 🔹 1. Paystack Dashboard Setup

### Create Plans in Paystack
1. Login to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Navigate to **Products & Plans**
3. Create two subscription plans:

   **Pro Plan:**
   - Name: Pro Plan
   - Amount: ₦35,000
   - Interval: Monthly
   - Plan Code: `PLN_4z2wpgmw41w2k7r`

   **Business Plan:**
   - Name: Business Plan
   - Amount: ₦53,000
   - Interval: Monthly
   - Plan Code: `PLN_esryg99ztsy9xc8`

### Get API Keys
1. Go to **Settings → API Keys & Webhooks**
2. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
3. Copy your **Public Key** (starts with `pk_test_` or `pk_live_`)

## 🔹 2. Supabase Environment Variables

Set these environment variables in your Supabase dashboard:

1. Go to **Settings → API**
2. Add the following environment variables:

```bash
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
```

## 🔹 3. Deploy Supabase Functions

Run the deployment script:

```bash
./deploy-paystack-functions.sh
```

This will deploy three functions:
- `create-subscription` - Creates new subscriptions
- `paystack-webhook` - Handles Paystack webhook events
- `manage-subscription` - Manages subscription operations

## 🔹 4. Configure Paystack Webhook

1. In Paystack Dashboard, go to **Settings → API Keys & Webhooks**
2. Add a new webhook with URL:
   ```
   https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/paystack-webhook
   ```
3. Select these events:
   - `subscription.create`
   - `subscription.disable`
   - `charge.success`
   - `charge.failed`
   - `invoice.payment_failed`
   - `invoice.payment_success`

## 🔹 5. Database Migration

Run the database migration to add subscription fields:

```sql
-- This is already included in the migration file
-- supabase/migrations/20240101000000_add_subscription_fields.sql
```

## 🔹 6. Frontend Integration

The frontend is already integrated with:
- `PaystackPayment` component for payment processing
- Updated `Billing` page with subscription management
- Real-time subscription status updates

## 🔹 7. Testing the Integration

### Test Card Details
Use these test cards for testing:

**Successful Payment:**
- Card Number: `4084 0840 8408 4081`
- Expiry: Any future date
- CVV: Any 3 digits
- PIN: Any 4 digits

**Failed Payment:**
- Card Number: `4084 0840 8408 4082`
- Expiry: Any future date
- CVV: Any 3 digits
- PIN: Any 4 digits

### Test Flow
1. Navigate to `/billing`
2. Click "Upgrade" on Pro or Business plan
3. Enter test email and payment details
4. Complete payment
5. Verify subscription status updates

## 🔹 8. Production Checklist

Before going live:

- [ ] Switch to Paystack live keys
- [ ] Update plan codes to live plan codes
- [ ] Test webhook delivery
- [ ] Verify subscription management functions
- [ ] Test payment failure scenarios
- [ ] Set up monitoring for webhook events

## 🔹 9. Feature Access Control

The system automatically controls feature access based on subscription:

### Free Trial (8 days)
- AI Insights: 20 total
- Data Sources: 1
- Team Members: 1
- AI Reports: 2
- Business Analytics: Basic

### Pro Plan (₦35,000/month)
- AI Insights: 500 per month
- Data Sources: 5
- Team Members: 5
- AI Reports: 20 per month
- Business Analytics: Real-time + export

### Business Plan (₦53,000/month)
- AI Insights: Unlimited
- Data Sources: Unlimited
- Team Members: Unlimited
- AI Reports: Unlimited
- Business Analytics: Enterprise-grade

## 🔹 10. Troubleshooting

### Common Issues

**Webhook not receiving events:**
- Check webhook URL is correct
- Verify webhook is active in Paystack
- Check Supabase function logs

**Payment fails:**
- Verify Paystack keys are correct
- Check card details are valid
- Review Paystack dashboard for errors

**Subscription not updating:**
- Check database migration ran successfully
- Verify webhook events are being processed
- Review Supabase function logs

### Support

For issues:
1. Check Supabase function logs
2. Review Paystack dashboard events
3. Check browser console for errors
4. Verify environment variables are set correctly

## 🔹 11. Monitoring

Monitor these metrics:
- Subscription creation success rate
- Payment success rate
- Webhook delivery success rate
- Subscription cancellation rate
- Revenue per plan

## 🔹 12. Security

Security measures implemented:
- Webhook signature verification
- Environment variable protection
- CORS headers configuration
- Input validation and sanitization
- Error handling and logging

---

**Need help?** Check the Supabase function logs or contact support with specific error messages.