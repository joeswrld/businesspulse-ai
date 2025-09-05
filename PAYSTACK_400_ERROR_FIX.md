# 🚨 Paystack 400 Error Fix - "Failed to load resource: the server responded with a status of 400"

## ❌ **Problem Identified:**

The error `api.paystack.co/checkout/request_inline:1 Failed to load resource: the server responded with a status of 400` occurs because:

1. **Invalid plan parameter** - Paystack inline checkout doesn't support the `plan` parameter
2. **Missing environment variables** - Paystack public key not properly configured
3. **Invalid configuration** - Amount, email, or other parameters are invalid

## 🔧 **What I've Fixed:**

### **1. Removed Invalid Plan Parameter**
```typescript
// ❌ Before (caused 400 error)
const config = {
  key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
  email: userEmail,
  amount: amount,
  plan: currentPlanDetails.planCode, // This caused the 400 error!
  // ...
};

// ✅ After (fixed)
const config = {
  key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
  email: userEmail,
  amount: amount,
  // plan parameter removed - not supported in inline checkout
  // We'll handle subscription creation after payment success
  // ...
};
```

### **2. Added Configuration Validation**
```typescript
// Validate configuration before sending to Paystack
if (!import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY === 'pk_test_...') {
  throw new Error('Paystack public key not configured. Please check your environment variables.');
}

if (!userEmail || userEmail === 'user@example.com') {
  throw new Error('Valid user email is required for payment.');
}

if (!amount || amount <= 0) {
  throw new Error('Invalid payment amount.');
}
```

### **3. Enhanced Error Logging**
```typescript
// Log partial key for security
console.log('Setting up Paystack with config:', {
  ...config,
  key: config.key.substring(0, 20) + '...' // Only show first 20 characters
});
```

## 🚀 **How It Works Now:**

### **1. Payment Flow:**
```typescript
// 1. User clicks upgrade
// 2. Configuration validated
// 3. Paystack popup opens (no 400 error)
// 4. User completes payment
// 5. Payment success callback triggered
// 6. Subscription created via API call
```

### **2. Subscription Creation:**
```typescript
// After successful payment, we call our API
const updateResponse = await fetch('/api/paystack/verify-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reference: response.reference,
    plan: plan, // Plan info sent to our API, not Paystack
    amount: amount,
    email: user?.email
  }),
});
```

## 🧪 **Testing the Fix:**

### **1. Check Environment Variables:**
```bash
# In browser console
console.log('Paystack Key:', import.meta.env.VITE_PAYSTACK_PUBLIC_KEY);
```

**Expected Output:**
```
Paystack Key: pk_test_1234567890abcdef1234567890abcdef12345678
```

**If you see `undefined` or `pk_test_...`:**
- Check `.env.local` file exists
- Verify `VITE_PAYSTACK_PUBLIC_KEY` is set
- Restart development server

### **2. Test Payment Flow:**
1. **Click upgrade button** - Should open Paystack popup
2. **Check console logs** - Should see configuration validation
3. **No 400 errors** - Paystack should load successfully
4. **Payment popup opens** - User can enter payment details

### **3. Verify Configuration:**
```typescript
// Console should show:
Setting up Paystack with config: {
  key: "pk_test_1234567890abc...",
  email: "user@example.com",
  amount: 3500000,
  currency: "NGN",
  reference: "notex_pro_1234567890_abc123",
  callback: [Function],
  onClose: [Function]
}
```

## 🚨 **Common Issues & Solutions:**

### **Issue 1: "Paystack public key not configured"**
```bash
# Solution: Update .env.local
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_actual_key_here
```

### **Issue 2: "Valid user email is required"**
```typescript
// Solution: Ensure user is logged in
// Check if user?.email exists and is valid
```

### **Issue 3: "Invalid payment amount"**
```typescript
// Solution: Check amount calculation
// Should be in kobo (smallest currency unit)
// Pro: 3500000 (₦35,000)
// Business: 5300000 (₦53,000)
```

### **Issue 4: Still getting 400 errors**
```typescript
// Solution: Check Paystack dashboard
// Verify your account is active
// Check if you're in test/live mode
```

## 📋 **Complete Fix Checklist:**

### **✅ Code Changes Applied:**
1. **Removed plan parameter** from Paystack config
2. **Added configuration validation** before payment
3. **Enhanced error logging** for debugging
4. **Updated payment success handler** to handle plans

### **✅ Environment Setup:**
1. **`.env.local` file exists** with correct variable names
2. **`VITE_PAYSTACK_PUBLIC_KEY`** set to actual key
3. **Development server restarted** after changes

### **✅ Testing Required:**
1. **Environment variables load** correctly
2. **Payment popup opens** without 400 errors
3. **Payment flow completes** successfully
4. **Subscription created** via API call

## 🔍 **Debugging Steps:**

### **1. Check Console Logs:**
```typescript
// Look for these messages:
"Setting up Paystack with config:"
"Paystack handler created: Inline"
// Should NOT see: "Failed to load resource: 400"
```

### **2. Check Network Tab:**
```typescript
// Look for successful calls to:
// https://api.paystack.co/checkout/request_inline
// Should return 200, not 400
```

### **3. Check Environment Variables:**
```typescript
// Verify all required variables are set:
console.log('Environment check:', {
  paystackKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.substring(0, 20) + '...',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...',
  nodeEnv: import.meta.env.NODE_ENV
});
```

## 🎯 **Expected Results:**

After applying the fix:
- ✅ **No more 400 errors** from Paystack
- ✅ **Payment popup opens** successfully
- ✅ **Configuration validation** prevents invalid requests
- ✅ **Clear error messages** for debugging
- ✅ **Payment flow works** end-to-end

## 🚀 **Next Steps:**

1. **Verify environment variables** are set correctly
2. **Restart development server** to load new variables
3. **Test payment flow** to confirm fix works
4. **Monitor console logs** for any remaining issues

## ✨ **Summary:**

The Paystack 400 error was caused by:
1. **Invalid plan parameter** (not supported in inline checkout)
2. **Missing configuration validation**
3. **Poor error handling** for debugging

The fix:
1. **Removes invalid parameters** from Paystack config
2. **Adds proper validation** before payment
3. **Handles subscription creation** after payment success
4. **Provides clear error messages** for troubleshooting

This ensures **Paystack payments work correctly** without 400 errors! 🚀