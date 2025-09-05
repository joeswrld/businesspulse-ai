# 🚀 NoteX Comprehensive Billing System

This is a **production-ready SaaS billing system** that implements the complete billing flow for NoteX with Paystack integration. It includes automatic trial management, subscription handling, usage tracking, and webhook processing.

## 🏗️ What's Been Implemented

### 1. **Database Schema & Migrations**
- **`supabase/migrations/20250123000000_comprehensive_billing_system.sql`** - Complete billing system migration
- New tables: `plans`, `user_subscriptions`, `usage_counters`, `transactions`, `webhook_events`
- Proper enums: `subscription_status`, `plan_tier`
- RLS policies for security
- Automatic triggers for trial initialization

### 2. **Edge Functions**
- **`paystack-webhook`** - Handles all Paystack webhooks with idempotency
- **`paystack-manage-link`** - Generates card update links for users
- **`billing-reconcile`** - Manual fixes and nightly sanity checks

### 3. **Frontend Utilities**
- **`src/utils/billing-constants.ts`** - Plan limits, pricing, and helper functions
- Updated `BillingPage.tsx` to use new schema

## 🎯 Key Features

### **Automatic Trial Management**
- New users get 8-day free trial automatically
- Trial status enforced by middleware
- Seamless upgrade flow

### **Real-time Usage Tracking**
- Rolling 30-day usage windows for Pro/Business
- Hard limits enforced server-side
- Unlimited for Business plan

### **Webhook-driven Billing**
- Paystack → Edge Function → Database sync
- Idempotency prevents duplicate processing
- Signature verification for security

### **Automated Lifecycle Management**
- Trial expiry enforcement
- Payment failure handling (3-day grace period)
- Monthly usage resets
- Data retention policies

## 🚀 Quick Start

### 1. **Apply the Migration**
```bash
# In your Supabase dashboard or CLI
supabase db reset
# Or apply manually:
supabase migration up
```

### 2. **Set Environment Variables**
```bash
# In your Supabase Edge Functions
PAYSTACK_SECRET_KEY=sk_test_...
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_TOKEN=your-secure-admin-token
```

### 3. **Deploy Edge Functions**
```bash
supabase functions deploy paystack-webhook
supabase functions deploy paystack-manage-link
supabase functions deploy billing-reconcile
```

### 4. **Configure Paystack Webhooks**
Point these webhooks to your `paystack-webhook` function:
- `subscription.create`
- `subscription.disable`
- `charge.success`
- `charge.failed`
- `invoice.payment_failed`
- `invoice.payment_success`

## 📊 Database Schema

### **Plans Table**
```sql
plans (
  code TEXT PRIMARY KEY,           -- 'free', 'PLN_4z2wpgmw41w2k7r', 'PLN_esryg99ztsy9xc8'
  name TEXT NOT NULL,              -- 'Free Trial', 'Pro', 'Business'
  tier plan_tier NOT NULL,         -- 'free', 'pro', 'business'
  price_kobo INTEGER NOT NULL,     -- 0, 3500000, 5300000
  limits JSONB NOT NULL            -- {feedback: 300, insights: 50, reports: 20}
)
```

### **User Subscriptions**
```sql
user_subscriptions (
  user_id UUID REFERENCES auth.users(id),
  plan_code TEXT REFERENCES plans(code),
  plan_tier plan_tier NOT NULL,
  status subscription_status NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  paystack_subscription_code TEXT,
  paystack_email_token TEXT
)
```

### **Usage Counters**
```sql
usage_counters (
  user_id UUID PRIMARY KEY,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  feedback_count INTEGER DEFAULT 0,
  insights_count INTEGER DEFAULT 0,
  reports_count INTEGER DEFAULT 0
)
```

## 🔄 Billing Flow

### **1. User Signs Up**
