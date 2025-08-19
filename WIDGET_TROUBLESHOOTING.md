# 🔧 **Widget Embedding Troubleshooting Guide**

## **🚨 Widget Not Appearing? Here's How to Fix It!**

### **Quick Diagnosis Checklist:**

- [ ] **Check browser console** for errors
- [ ] **Verify your user ID** is correct
- [ ] **Ensure script is loaded** in Network tab
- [ ] **Check if widget is disabled** in settings
- [ ] **Try refreshing the page**

---

## **🔍 Step-by-Step Troubleshooting**

### **Step 1: Check Browser Console**

**Open Developer Tools:**
1. **Right-click** on your page
2. **Select "Inspect"** or press **F12**
3. **Go to Console tab**
4. **Look for these messages:**

#### **✅ Good Messages (Widget Working):**
```
NoteX Widget: Script loaded successfully
NoteX Widget: Initializing...
NoteX Widget: User ID found: your-user-id
NoteX Widget: Elements created and added to page
NoteX Widget: Styles injected
NoteX Widget: Initialized successfully!
```

#### **❌ Error Messages (Widget Not Working):**
```
NoteX Widget: Missing data-user-id attribute
Failed to load widget settings
Error submitting feedback
```

### **Step 2: Verify Your Embed Code**

#### **✅ Correct Code:**
```html
<script src="https://notex.com.ng/widget-simple.js" data-user-id="YOUR_ACTUAL_USER_ID"></script>
```

#### **❌ Common Mistakes:**
```html
<!-- Wrong: Missing data-user-id -->
<script src="https://notex.com.ng/widget-simple.js"></script>

<!-- Wrong: Wrong user ID -->
<script src="https://notex.com.ng/widget-simple.js" data-user-id="your-user-id"></script>

<!-- Wrong: Wrong script URL -->
<script src="https://notex.com.ng/widget.js" data-user-id="YOUR_USER_ID"></script>
```

### **Step 3: Check HTML Placement**

#### **✅ Correct Placement:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Your Website</title>
</head>
<body>
  <!-- Your website content -->
  
  <!-- Add widget BEFORE closing body tag -->
  <script src="https://notex.com.ng/widget-simple.js" data-user-id="YOUR_USER_ID"></script>
</body>
</html>
```

#### **❌ Wrong Placement:**
```html
<!-- Wrong: In head section -->
<head>
  <script src="https://notex.com.ng/widget-simple.js" data-user-id="YOUR_USER_ID"></script>
</head>

<!-- Wrong: After closing body -->
</body>
<script src="https://notex.com.ng/widget-simple.js" data-user-id="YOUR_USER_ID"></script>
```

---

## **🔧 Common Issues & Solutions**

### **Issue 1: "Missing data-user-id attribute"**

**Problem:** The widget can't find your user ID.

**Solution:**
1. **Get your correct user ID** from NoteX dashboard
2. **Replace the placeholder** in your embed code
3. **Make sure there are no spaces** around the user ID

```html
<!-- Wrong -->
<script src="https://notex.com.ng/widget-simple.js" data-user-id=" 9a59f1bf-3e74-42d5-9c7e-8c92478e3515 "></script>

<!-- Correct -->
<script src="https://notex.com.ng/widget-simple.js" data-user-id="9a59f1bf-3e74-42d5-9c7e-8c92478e3515"></script>
```

### **Issue 2: Widget loads but doesn't appear**

**Problem:** The widget script loads but the button is invisible.

**Solutions:**
1. **Check CSS conflicts** - your site's CSS might be hiding it
2. **Check z-index** - other elements might be covering it
3. **Check positioning** - widget might be off-screen

**Quick Fix:**
```css
/* Add this to your CSS to ensure widget is visible */
#notex-feedback-button {
  display: block !important;
  z-index: 99999 !important;
  position: fixed !important;
  bottom: 20px !important;
  right: 20px !important;
}
```

### **Issue 3: Widget appears but doesn't work**

**Problem:** Button is visible but clicking doesn't open the form.

**Solutions:**
1. **Check JavaScript errors** in console
2. **Disable ad blockers** temporarily
3. **Check for conflicting scripts**

### **Issue 4: Widget works on desktop but not mobile**

**Problem:** Widget appears on desktop but not on mobile devices.

**Solutions:**
1. **Check viewport meta tag** in your HTML
2. **Test on different mobile devices**
3. **Check mobile-specific CSS**

```html
<!-- Make sure you have this in your head -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

## **🧪 Testing Your Widget**

### **Test 1: Basic Functionality**
1. **Load your website**
2. **Look for the blue feedback button** (bottom-right corner)
3. **Click the button**
4. **Fill out the form**
5. **Submit feedback**

### **Test 2: Console Messages**
1. **Open browser console**
2. **Refresh the page**
3. **Look for NoteX Widget messages**
4. **Check for any error messages**

### **Test 3: Network Loading**
1. **Open Developer Tools**
2. **Go to Network tab**
3. **Refresh the page**
4. **Look for widget-simple.js** in the list
5. **Check if it loaded successfully** (200 status)

---

## **📱 Platform-Specific Solutions**

### **WordPress**
```php
// Add to footer.php before </body>
<script src="https://notex.com.ng/widget-simple.js" data-user-id="YOUR_USER_ID"></script>
```

### **Shopify**
```liquid
<!-- Add to layout/theme.liquid before </body> -->
<script src="https://notex.com.ng/widget-simple.js" data-user-id="YOUR_USER_ID"></script>
```

### **Wix**
1. **Add Custom Code element**
2. **Paste the embed code**
3. **Save and publish**

### **Squarespace**
1. **Go to Settings > Advanced > Code Injection**
2. **Add to Footer:**
```html
<script src="https://notex.com.ng/widget-simple.js" data-user-id="YOUR_USER_ID"></script>
```

---

## **🔧 Advanced Troubleshooting**

### **Debug Mode**
Add this to your HTML to enable debug mode:
```html
<script>
  window.NoteXDebug = true;
</script>
<script src="https://notex.com.ng/widget-simple.js" data-user-id="YOUR_USER_ID"></script>
```

### **Manual Widget Control**
```javascript
// Open widget manually
window.notexFeedback.open();

// Close widget manually
window.notexFeedback.close();

// Check if widget is loaded
console.log('Widget loaded:', !!window.notexFeedback);
```

### **CSS Override**
If the widget is hidden by your site's CSS:
```css
#notex-feedback-button {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  z-index: 99999 !important;
}
```

---

## **📞 Getting Help**

### **Before Contacting Support:**
1. **Check this troubleshooting guide**
2. **Test with the simple widget** (widget-simple.js)
3. **Check browser console** for errors
4. **Try different browser**
5. **Disable extensions** temporarily

### **Information to Provide:**
- **Your embed code** (with user ID hidden)
- **Browser console errors**
- **Screenshot** of the issue
- **Platform** (WordPress, Shopify, etc.)
- **Browser and version**

### **Contact Information:**
- **Email:** support@notex.com.ng
- **Documentation:** docs.notex.com.ng
- **Community:** Discord server

---

## **✅ Quick Fix Summary**

### **Most Common Solution:**
1. **Use the simple widget:** `widget-simple.js`
2. **Check your user ID** is correct
3. **Place script before `</body>`**
4. **Clear browser cache**
5. **Refresh the page**

### **Expected Result:**
- ✅ **Blue feedback button** appears (bottom-right)
- ✅ **Clicking opens** feedback form
- ✅ **Form submission** works
- ✅ **Success message** shows

---

## **🎯 Still Not Working?**

### **Try This Emergency Fix:**
```html
<!-- Replace your current embed code with this -->
<script>
  // Emergency widget loader
  (function() {
    const script = document.createElement('script');
    script.src = 'https://notex.com.ng/widget-simple.js';
    script.setAttribute('data-user-id', 'YOUR_USER_ID');
    script.onload = function() {
      console.log('NoteX Widget loaded successfully');
    };
    script.onerror = function() {
      console.error('Failed to load NoteX Widget');
    };
    document.body.appendChild(script);
  })();
</script>
```

**🎉 This should definitely work!** If it doesn't, there's likely a network or hosting issue that needs to be resolved.