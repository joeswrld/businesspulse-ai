# 🔧 Fix Widget 404 Error - Complete Guide

## 🚨 **Problem:** 
You're getting a 404 error when trying to load the widget from `https://notex.com.ng/widget.js`

## ✅ **Solution Options:**

---

## **Option 1: Host on Your Own Domain (Recommended)**

### **Step 1: Upload widget.js to your website**

1. **Copy the widget file:**
   ```bash
   # Copy the widget file to your website's public directory
   cp public/widget.js /path/to/your/website/public/
   ```

2. **Make sure it's accessible at:**
   ```
   https://yourdomain.com/widget.js
   ```

3. **Update your embed code:**
   ```html
   <script src="https://yourdomain.com/widget.js" data-user-id="YOUR_USER_ID"></script>
   ```

---

## **Option 2: Use GitHub Pages (Free)**

### **Step 1: Create a GitHub repository**

1. **Create a new repository** on GitHub
2. **Upload the widget file** to the repository
3. **Enable GitHub Pages** in repository settings

### **Step 2: Access the widget**

Your widget will be available at:
```
https://yourusername.github.io/repository-name/widget.js
```

### **Step 3: Update embed code**
```html
<script src="https://yourusername.github.io/repository-name/widget.js" data-user-id="YOUR_USER_ID"></script>
```

---

## **Option 3: Use a CDN Service**

### **Step 1: Upload to a CDN**

**Option A: jsDelivr (Free)**
1. Upload to GitHub
2. Use jsDelivr URL: `https://cdn.jsdelivr.net/gh/username/repo@main/widget.js`

**Option B: Cloudflare (Free)**
1. Create a Cloudflare account
2. Upload widget.js to Cloudflare Pages
3. Get your custom domain

**Option C: Netlify (Free)**
1. Create a Netlify account
2. Upload widget.js to Netlify
3. Get your custom domain

### **Step 2: Update embed code**
```html
<script src="https://your-cdn-url.com/widget.js" data-user-id="YOUR_USER_ID"></script>
```

---

## **Option 4: Quick Fix - Use Raw GitHub**

### **Step 1: Create a GitHub Gist**

1. **Go to GitHub Gist:** https://gist.github.com/
2. **Create a new gist** with the widget code
3. **Copy the raw URL** (ends with `/raw`)

### **Step 2: Use the raw URL**
```html
<script src="https://gist.githubusercontent.com/username/gist-id/raw/widget.js" data-user-id="YOUR_USER_ID"></script>
```

---

## **Option 5: Inline the Widget (Immediate Fix)**

### **Step 1: Copy the widget code**

Copy the contents of `public/widget-cdn.js` and update it with your Supabase credentials.

### **Step 2: Add to your website**

Add this to your website's HTML (before closing `</body>` tag):

```html
<script>
// Copy the entire widget code here, but update these lines:
let config = {
  userId: 'YOUR_USER_ID', // Replace with your actual user ID
  apiUrl: 'https://YOUR_PROJECT_ID.supabase.co', // Replace with your Supabase URL
  supabaseKey: 'YOUR_ANON_KEY', // Replace with your Supabase anon key
  // ... rest of config
};

// Paste the rest of the widget code here
</script>
```

---

## **🔧 Configuration Steps**

### **Step 1: Get Your Supabase Credentials**

1. **Go to your Supabase Dashboard**
2. **Navigate to Settings > API**
3. **Copy:**
   - Project URL (e.g., `https://abcdefghijklmnop.supabase.co`)
   - Anon public key (starts with `eyJ...`)

### **Step 2: Update Widget Configuration**

**If using hosted widget file:**
Edit the widget file and update these lines:
```javascript
let config = {
  userId: null, // This will be set from data-user-id attribute
  apiUrl: 'https://YOUR_PROJECT_ID.supabase.co', // UPDATE THIS
  supabaseKey: 'YOUR_ANON_KEY', // UPDATE THIS
  // ... rest of config
};
```

**If using inline widget:**
Update the config object in your HTML:
```javascript
let config = {
  userId: 'YOUR_USER_ID', // Your actual user ID
  apiUrl: 'https://YOUR_PROJECT_ID.supabase.co', // Your Supabase URL
  supabaseKey: 'YOUR_ANON_KEY', // Your Supabase anon key
  // ... rest of config
};
```

### **Step 3: Get Your User ID**

1. **Go to your feedback settings page** (`/feedback-settings`)
2. **Copy the embed code** - it will contain your user ID
3. **Or check your Supabase Dashboard > Authentication > Users**

---

## **🧪 Testing the Widget**

### **Step 1: Create a test page**

Create a simple HTML file to test:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Widget Test</title>
</head>
<body>
    <h1>Test Page</h1>
    <p>This is a test page for the feedback widget.</p>
    
    <!-- Replace with your actual embed code -->
    <script src="https://your-domain.com/widget.js" data-user-id="YOUR_USER_ID"></script>
</body>
</html>
```

### **Step 2: Test the widget**

1. **Open the test page** in your browser
2. **Check browser console** for any errors
3. **Click the feedback button** (should appear at bottom)
4. **Fill out the form** and submit
5. **Check your feedback dashboard** to see if it was received

---

## **🚨 Common Issues & Solutions**

### **Issue: Widget not appearing**
**Solutions:**
- Check browser console for errors
- Verify the widget file URL is accessible
- Ensure Supabase credentials are correct
- Check if user ID is valid

### **Issue: "Failed to load settings"**
**Solutions:**
- Verify Supabase URL and key are correct
- Check if feedback_settings table exists
- Ensure RLS policies are set up correctly

### **Issue: "Failed to submit feedback"**
**Solutions:**
- Check Supabase credentials
- Verify feedback table exists
- Check RLS policies
- Look at browser console for specific errors

### **Issue: CORS errors**
**Solutions:**
- Ensure widget is served over HTTPS
- Check Supabase CORS settings
- Verify API endpoints are correct

---

## **📋 Quick Setup Checklist**

- [ ] Choose hosting option (your domain, GitHub, CDN, etc.)
- [ ] Upload widget.js file to chosen hosting
- [ ] Get Supabase credentials (URL and anon key)
- [ ] Update widget configuration with your credentials
- [ ] Get your user ID from feedback settings
- [ ] Update embed code with correct URLs
- [ ] Test widget on a simple HTML page
- [ ] Verify feedback submission works
- [ ] Check feedback dashboard for received feedback

---

## **🎯 Recommended Approach**

**For immediate fix:** Use Option 5 (Inline widget)
**For production:** Use Option 1 (Host on your own domain)

---

## **📞 Need Help?**

If you're still having issues:

1. **Check browser console** for specific error messages
2. **Verify all URLs** are accessible
3. **Test with a simple HTML page** first
4. **Share error messages** for specific help

**✅ After following these steps, your widget should work correctly!**