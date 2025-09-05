# 🔑 Paystack Key Error - COMPLETE FIX GUIDE

## ❌ **Problem Identified:**

The error "We could not start this transaction. Please enter a valid Key" occurs because:

1. **Environment variable not set** - `VITE_PAYSTACK_PUBLIC_KEY` is missing
2. **Wrong environment variable name** - Using `NEXT_PUBLIC_` instead of `VITE_`
3. **Missing .env.local file** - Environment variables not loaded

## 🔧 **Immediate Fix:**

### **Step 1: Create .env.local File**
Create a `.env.local` file in your project root with your actual Paystack keys:

```bash
# Create the file
touch .env.local
```

Add this content (replace with your actual keys):

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key_here

# Google Gemini API
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here

# Paystack Configuration
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_actual_paystack_test_key_here
# OR for production:
# VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_actual_paystack_live_key_here

# Environment
NODE_ENV=development
```

### **Step 2: Get Your Paystack Keys**

#### **For Test Mode:**
1. Go to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Click on **Settings** → **API Keys & Webhooks**
3. Copy your **Public Key** (starts with `pk_test_`)
4. Copy your **Secret Key** (starts with `sk_test_`)

#### **For Live Mode:**
1. Go to [Paystack Dashboard](https://dashboard.paystack.com/)
2. Click on **Settings** → **API Keys & Webhooks**
3. Copy your **Public Key** (starts with `pk_live_`)
4. Copy your **Secret Key** (starts with `sk_live_`)

### **Step 3: Update Environment Variables**

#### **Option A: Update .env.local (Recommended)**
```env
VITE_PAYSTACK_PUBLIC_KEY=pk_test_1234567890abcdef1234567890abcdef12345678
```

#### **Option B: Set in Terminal (Temporary)**
```bash
export VITE_PAYSTACK_PUBLIC_KEY="pk_test_your_key_here"
```

#### **Option C: Set in Vercel/Deployment**
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add `VITE_PAYSTACK_PUBLIC_KEY` with your key

### **Step 4: Restart Development Server**
```bash
# Stop your current dev server (Ctrl+C)
# Then restart
npm run dev
# or
yarn dev
# or
bun dev
```

## 🔍 **Verification Steps:**

### **1. Check Environment Variable Loading**
Open browser console and check:
```javascript
console.log('Paystack Key:', import.meta.env.VITE_PAYSTACK_PUBLIC_KEY);
```

**Expected Output:**
```
Paystack Key: pk_test_1234567890abcdef1234567890abcdef12345678
```

**If you see `undefined`:**
- Check `.env.local` file exists
- Verify variable name is correct
- Restart development server

### **2. Check Paystack Configuration**
In the PaystackPayment component, the config should now show:
```javascript
const config = {
  key: "pk_test_your_actual_key_here", // ✅ Should show your key
  email: "user@example.com",
  amount: 3500000,
  // ... other config
};
```

### **3. Test Payment Flow**
1. Click upgrade button
2. Check browser console for Paystack config
3. Verify key is loaded correctly
4. Payment popup should open without key error

## 🚨 **Common Issues & Solutions:**

### **Issue 1: "Key is undefined"**
```bash
# Solution: Check .env.local file
cat .env.local | grep PAYSTACK
```

### **Issue 2: "Wrong key format"**
```bash
# Paystack keys should start with:
# Test: pk_test_...
# Live: pk_live_...
```

### **Issue 3: "Environment variable not loading"**
```bash
# Solution: Restart dev server
npm run dev
```

### **Issue 4: "Key works in dev but not production"**
```bash
# Solution: Set environment variable in deployment platform
# Vercel: Project Settings → Environment Variables
# Netlify: Site Settings → Environment Variables
```

## 📋 **Complete Environment Setup:**

### **Development (.env.local):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_test_key
VITE_GEMINI_API_KEY=your_gemini_key
NODE_ENV=development
```

### **Production (Vercel/Netlify):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_live_key
VITE_GEMINI_API_KEY=your_gemini_key
NODE_ENV=production
```

## 🧪 **Testing the Fix:**

### **1. Local Testing:**
```bash
# 1. Create .env.local with your keys
# 2. Restart dev server
# 3. Try to upgrade a plan
# 4. Check if Paystack popup opens
```

### **2. Production Testing:**
```bash
# 1. Deploy with environment variables set
# 2. Test payment flow in production
# 3. Verify Paystack integration works
```

## 🔒 **Security Notes:**

### **✅ Safe to Expose:**
- `VITE_PAYSTACK_PUBLIC_KEY` - Public key is safe for frontend
- `VITE_SUPABASE_URL` - Database URL is public
- `VITE_SUPABASE_ANON_KEY` - Anon key is public

### **❌ Never Expose:**
- `PAYSTACK_SECRET_KEY` - Keep this server-side only
- `SUPABASE_SERVICE_ROLE_KEY` - Keep this server-side only

## 🎯 **Expected Result:**

After applying the fix:
- ✅ **Paystack popup opens** without key error
- ✅ **Payment flow works** correctly
- ✅ **Environment variables load** properly
- ✅ **No more "valid Key" errors**

## 🚀 **Next Steps:**

1. **Create .env.local** with your actual Paystack keys
2. **Restart development server**
3. **Test payment flow** to verify fix
4. **Deploy with environment variables** set in production

## 📞 **If You Need Help:**

### **1. Check Paystack Dashboard:**
- Verify your API keys are active
- Check if you're in test/live mode
- Ensure your account is verified

### **2. Check Environment Variables:**
```bash
# In browser console
console.log('All env vars:', import.meta.env);
```

### **3. Check Network Tab:**
- Look for Paystack API calls
- Verify key is being sent correctly
- Check for any CORS or network errors

## ✨ **Summary:**

The Paystack key error is caused by **missing or incorrectly named environment variables**. The solution is to:

1. **Create .env.local** with correct variable names
2. **Use VITE_ prefix** (not NEXT_PUBLIC_)
3. **Set actual Paystack keys** from your dashboard
4. **Restart development server**

This ensures **Paystack receives valid keys** and payments work correctly! 🚀