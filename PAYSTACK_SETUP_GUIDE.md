# Complete Paystack Integration Setup Guide

This guide will help you set up Paystack integration with your NoteX billing system.

## 🔧 **Environment Variables Setup**

Add these environment variables to your `.env.local` file:

```bash
# Paystack Configuration
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here

# Supabase Configuration (if not already set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 **Paystack Account Setup**

### **1. Create Paystack Account**
1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Sign up for a new account
3. Complete your business verification

### **2. Get Your API Keys**
1. Go to **Settings** → **API Keys & Webhooks**
2. Copy your **Public Key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

### **3. Configure Webhooks (Optional)**
1. Go to **Settings** → **Webhooks**
2. Add webhook URL: `https://your-domain.com/api/paystack/webhook`
3. Select events: `charge.success`, `subscription.disable`, `subscription.enable`

## 📊 **Database Setup**

Run the safe migration to create required tables:

```bash
# Run the safe migration
./run-safe-migration.sh

# Or manually run in Supabase SQL Editor
# Copy contents of safe-billing-migration.sql and execute
```

## 🧪 **Testing the Integration**

### **Test Payment Flow**
1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to billing page**:
   ```
   http://localhost:3000/billing
   ```

3. **Test upgrade flow**:
   - Click "Upgrade to Pro" or "Upgrade to Business"
   - Paystack modal should open
   - Use test card: `4084 0840 8408 4081`
   - Expiry: Any future date
   - CVV: Any 3 digits
   - PIN: Any 4 digits

### **Test Cards for Development**
```bash
# Successful payment
Card: 4084 0840 8408 4081
Expiry: 12/25
CVV: 123
PIN: 1234

# Failed payment
Card: 4084 0840 8408 4082
Expiry: 12/25
CVV: 123
PIN: 1234

# Insufficient funds
Card: 4084 0840 8408 4083
Expiry: 12/25
CVV: 123
PIN: 1234
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. "Paystack script not loaded"**
```javascript
// Check if script is loaded in index.html
<script src="https://js.paystack.co/v1/inline.js" async></script>
```

#### **2. "Invalid API key"**
- Verify your API keys are correct
- Check if you're using test keys for development
- Ensure keys are properly set in environment variables

#### **3. "Payment verification failed"**
- Check if Paystack secret key is correct
- Verify the reference matches
- Check network connectivity to Paystack API

#### **4. "User not found"**
- Ensure user is authenticated
- Check if user email exists in Supabase auth
- Verify service role key has admin access

### **Debug Steps**

1. **Check browser console** for JavaScript errors
2. **Check server logs** for API errors
3. **Verify database tables** exist and have data
4. **Test API endpoints** directly with Postman

## 📈 **Production Deployment**

### **1. Update Environment Variables**
```bash
# Production Paystack keys
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key
PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key

# Production app URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### **2. Update Paystack Settings**
1. Go to Paystack Dashboard
2. Switch to **Live Mode**
3. Update webhook URLs to production domain
4. Test with real cards (small amounts)

### **3. Monitor Transactions**
1. Check Paystack Dashboard for transactions
2. Monitor Supabase logs for errors
3. Set up error tracking (Sentry, etc.)

## 🔒 **Security Best Practices**

### **1. API Key Security**
- Never commit API keys to version control
- Use environment variables for all secrets
- Rotate keys regularly
- Use different keys for test/production

### **2. Payment Verification**
- Always verify payments server-side
- Check amount, currency, and reference
- Log all payment attempts
- Implement webhook verification

### **3. Error Handling**
- Don't expose sensitive data in error messages
- Log errors for debugging
- Implement retry mechanisms
- Graceful fallbacks for failed payments

## 📊 **Monitoring & Analytics**

### **1. Track Payment Events**
```javascript
// Add to your payment success callback
analytics.track('payment_success', {
  plan: 'pro',
  amount: 3500000,
  currency: 'NGN',
  reference: 'notex_pro_123456'
});
```

### **2. Monitor Key Metrics**
- Payment success rate
- Conversion rate (trial to paid)
- Average transaction value
- Failed payment reasons

### **3. Set Up Alerts**
- Failed payment notifications
- High error rates
- Unusual transaction patterns

## 🎯 **Complete Integration Checklist**

- [ ] **Environment variables** configured
- [ ] **Paystack account** created and verified
- [ ] **API keys** obtained and configured
- [ ] **Database tables** created via migration
- [ ] **Payment component** integrated
- [ ] **API endpoints** created and tested
- [ ] **Transaction history** displaying correctly
- [ ] **Test payments** working
- [ ] **Error handling** implemented
- [ ] **Production deployment** ready

## 🚀 **Next Steps**

After successful integration:

1. **Add usage tracking** to your features
2. **Implement webhook handling** for real-time updates
3. **Add subscription management** features
4. **Set up analytics** and monitoring
5. **Test with real users** (small amounts)

## 📞 **Support**

If you encounter issues:

1. **Check Paystack documentation**: https://paystack.com/docs
2. **Review Supabase logs** for database errors
3. **Check browser console** for JavaScript errors
4. **Test API endpoints** directly
5. **Contact support** with specific error messages

Your Paystack integration is now complete! 🎉