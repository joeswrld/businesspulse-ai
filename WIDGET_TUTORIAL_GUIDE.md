# 📚 **Complete Widget Embedding Tutorial Guide**

## **🎯 Overview**

This guide provides **step-by-step instructions** for embedding the NoteX feedback widget on your website using different methods. Choose the method that best fits your website's technology stack.

---

## **🚀 Method 1: Basic Script Tag (Quick Setup)**

### **Best For:** Simple HTML websites, static sites, quick testing

### **⏱️ Time Required:** 2-3 minutes

### **Step-by-Step Instructions:**

#### **Step 1: Get Your Embed Code**
1. **Go to your NoteX dashboard**
2. **Navigate to "Feedback Settings"**
3. **Copy the basic embed code** (it looks like this):
   ```html
   <script src="https://notex.com.ng/widget.js" data-user-id="your-user-id"></script>
   ```

#### **Step 2: Open Your Website Files**
1. **Find your website's main HTML file** (usually `index.html`, `home.html`, or similar)
2. **Open it in a text editor** (VS Code, Notepad++, Sublime Text, etc.)

#### **Step 3: Add the Widget Code**
1. **Find the closing `</body>` tag** in your HTML
2. **Paste the embed code just before `</body>`**
3. **Your HTML should look like this:**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Your Website</title>
   </head>
   <body>
     <!-- Your website content here -->
     
     <!-- Add the widget here -->
     <script src="https://notex.com.ng/widget.js" data-user-id="your-user-id"></script>
   </body>
   </html>
   ```

#### **Step 4: Save and Test**
1. **Save the file**
2. **Open your website in a browser**
3. **Look for the feedback button** (usually in the bottom-right corner)
4. **Click it to test the widget**

#### **Step 5: Upload to Your Server**
1. **Upload the updated HTML file** to your web server
2. **Test on your live website**
3. **The widget should now be working!**

### **✅ What You'll See:**
- A floating feedback button on your website
- Clicking it opens a feedback form
- Users can submit feedback directly to your NoteX dashboard

---

## **⚡ Method 2: NPM Package (React/Vue/Angular)**

### **Best For:** React, Next.js, Vue, Angular, Svelte, and modern frameworks

### **⏱️ Time Required:** 5-10 minutes

### **Step-by-Step Instructions:**

#### **Step 1: Install the Package**
1. **Open your terminal/command prompt**
2. **Navigate to your project directory**
3. **Run the installation command:**
   ```bash
   npm install notex-feedback-widget
   # or if you use yarn:
   yarn add notex-feedback-widget
   ```

#### **Step 2: Get Your Configuration**
1. **Go to your NoteX dashboard**
2. **Navigate to "Feedback Settings"**
3. **Copy your user ID and Supabase credentials**

#### **Step 3: Add to Your React App**

**Option A: Using Hook (Recommended)**
```tsx
// In your main App component or any page
import { useNoteXWidget } from 'notex-feedback-widget/react';

function App() {
  const { toggle } = useNoteXWidget({
    userId: 'your-user-id',
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseKey: 'your-anon-key',
    position: 'bottom-right',
    greeting: 'How can we help?',
    primaryColor: '#3b82f6'
  });

  return (
    <div>
      {/* Your website content */}
      <button onClick={toggle}>Open Feedback</button>
    </div>
  );
}
```

**Option B: Using Provider (Global)**
```tsx
// In your main App component
import { NoteXProvider } from 'notex-feedback-widget/react';

function App() {
  return (
    <NoteXProvider config={{
      userId: 'your-user-id',
      supabaseUrl: 'https://your-project.supabase.co',
      supabaseKey: 'your-anon-key'
    }}>
      {/* Your entire app */}
      <YourWebsite />
    </NoteXProvider>
  );
}
```

#### **Step 4: Add to Your Vue App**
```vue
<template>
  <div>
    <!-- Your website content -->
    <button @click="toggle">Open Feedback</button>
  </div>
</template>

<script setup>
import { useNoteXWidget } from 'notex-feedback-widget/vue';

const { toggle, isOpen } = useNoteXWidget({
  userId: 'your-user-id',
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key',
  position: 'bottom-right',
  greeting: 'How can we help?',
  primaryColor: '#3b82f6'
});
</script>
```

#### **Step 5: Build and Deploy**
1. **Test locally:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
2. **Build for production:**
   ```bash
   npm run build
   # or
   yarn build
   ```
3. **Deploy to your hosting platform** (Vercel, Netlify, etc.)

### **✅ What You'll See:**
- A professional feedback widget integrated into your app
- Full TypeScript support and IntelliSense
- Customizable appearance and behavior
- Better performance and smaller bundle size

---

## **🌐 Method 3: CDN (Static Sites)**

### **Best For:** Static websites, HTML/CSS/JS sites, WordPress, Shopify

### **⏱️ Time Required:** 3-5 minutes

### **Step-by-Step Instructions:**

#### **Step 1: Add Configuration**
1. **Open your website's HTML file**
2. **Add this script in the `<head>` section:**
   ```html
   <head>
     <title>Your Website</title>
     
     <!-- Add this configuration -->
     <script>
       window.NoteXConfig = {
         userId: 'your-user-id',
         supabaseUrl: 'https://your-project.supabase.co',
         supabaseKey: 'your-anon-key',
         position: 'bottom-right',
         greeting: 'How can we help?',
         primaryColor: '#3b82f6',
         secondaryColor: '#1e40af'
       };
     </script>
   </head>
   ```

#### **Step 2: Add the CDN Script**
1. **Add this script just before the closing `</body>` tag:**
   ```html
   <body>
     <!-- Your website content -->
     
     <!-- Add the widget script -->
     <script src="https://cdn.notex.com.ng/widget-v2.js" async></script>
   </body>
   ```

#### **Step 3: Complete HTML Example**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Website</title>
  
  <!-- Widget Configuration -->
  <script>
    window.NoteXConfig = {
      userId: 'your-user-id',
      supabaseUrl: 'https://your-project.supabase.co',
      supabaseKey: 'your-anon-key',
      position: 'bottom-right',
      greeting: 'How can we help?',
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      enabled: true,
      autoOpen: false
    };
  </script>
</head>
<body>
  <!-- Your website content goes here -->
  <h1>Welcome to My Website</h1>
  <p>This is where your content goes.</p>
  
  <!-- Widget Script -->
  <script src="https://cdn.notex.com.ng/widget-v2.js" async></script>
</body>
</html>
```

#### **Step 4: Test and Deploy**
1. **Save the file and open in browser**
2. **Look for the feedback button**
3. **Test the widget functionality**
4. **Upload to your web server**

### **✅ What You'll See:**
- A lightweight widget loaded from CDN
- Fast loading and good performance
- Works on any web server
- Easy to customize with configuration

---

## **🎨 Method 4: Vanilla JavaScript**

### **Best For:** Custom JavaScript applications, single-page apps

### **⏱️ Time Required:** 5-8 minutes

### **Step-by-Step Instructions:**

#### **Step 1: Install the Package**
```bash
npm install notex-feedback-widget
```

#### **Step 2: Import and Initialize**
```javascript
// In your main JavaScript file
import { initNoteXWidget } from 'notex-feedback-widget';

// Initialize the widget
const widget = initNoteXWidget({
  userId: 'your-user-id',
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key',
  position: 'bottom-right',
  greeting: 'How can we help?',
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  enabled: true,
  autoOpen: false
});

// Control the widget programmatically
document.getElementById('feedback-btn').addEventListener('click', () => {
  widget.open();
});

// Listen for feedback submissions
widget.on('feedback-submitted', (data) => {
  console.log('Feedback received:', data);
  // Handle the feedback (e.g., show thank you message)
});
```

#### **Step 3: Add HTML Button (Optional)**
```html
<button id="feedback-btn">Give Feedback</button>
```

#### **Step 4: Build and Deploy**
1. **Build your project:**
   ```bash
   npm run build
   ```
2. **Deploy to your hosting platform**

### **✅ What You'll See:**
- Full control over widget behavior
- Programmatic access to widget functions
- Event handling for feedback submissions
- Custom integration with your app logic

---

## **🔧 Platform-Specific Tutorials**

### **WordPress Tutorial**

#### **Step 1: Access Your Theme**
1. **Go to WordPress Admin**
2. **Navigate to Appearance > Theme Editor**
3. **Select your active theme**

#### **Step 2: Edit Header or Footer**
1. **Open `header.php` or `footer.php`**
2. **Add the widget code before `</head>` or `</body>`**

#### **Step 3: Add the Code**
```php
<!-- In header.php, add before </head> -->
<script>
  window.NoteXConfig = {
    userId: 'your-user-id',
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseKey: 'your-anon-key'
  };
</script>

<!-- In footer.php, add before </body> -->
<script src="https://cdn.notex.com.ng/widget-v2.js" async></script>
```

### **Shopify Tutorial**

#### **Step 1: Access Theme Files**
1. **Go to Shopify Admin**
2. **Navigate to Online Store > Themes**
3. **Click "Actions" > "Edit code"**

#### **Step 2: Edit Theme.liquid**
1. **Open `layout/theme.liquid`**
2. **Add the widget code in the appropriate sections**

#### **Step 3: Add the Code**
```liquid
<!-- In the <head> section -->
<script>
  window.NoteXConfig = {
    userId: 'your-user-id',
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseKey: 'your-anon-key'
  };
</script>

<!-- Before closing </body> tag -->
<script src="https://cdn.notex.com.ng/widget-v2.js" async></script>
```

### **Wix Tutorial**

#### **Step 1: Add Custom Code**
1. **Go to Wix Editor**
2. **Click the "+" button to add elements**
3. **Search for "Custom Code"**
4. **Add it to your page**

#### **Step 2: Add the Widget Code**
```html
<script>
  window.NoteXConfig = {
    userId: 'your-user-id',
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseKey: 'your-anon-key'
  };
</script>
<script src="https://cdn.notex.com.ng/widget-v2.js" async></script>
```

### **Squarespace Tutorial**

#### **Step 1: Add Code Injection**
1. **Go to Settings > Advanced > Code Injection**
2. **Add to Header:**
```html
<script>
  window.NoteXConfig = {
    userId: 'your-user-id',
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseKey: 'your-anon-key'
  };
</script>
```

#### **Step 2: Add to Footer**
```html
<script src="https://cdn.notex.com.ng/widget-v2.js" async></script>
```

---

## **🔧 Troubleshooting Guide**

### **Common Issues and Solutions**

#### **Widget Not Appearing**
**Problem:** The feedback button doesn't show up on your website.

**Solutions:**
1. **Check browser console** for JavaScript errors
2. **Verify your user ID** is correct
3. **Ensure the script is loaded** (check Network tab)
4. **Check if widget is disabled** in your settings

#### **Wrong Colors or Styling**
**Problem:** The widget doesn't match your brand colors.

**Solutions:**
1. **Update your settings** in the NoteX dashboard
2. **Clear browser cache** and refresh
3. **Check if custom CSS** is conflicting
4. **Verify color format** (use hex codes like #3b82f6)

#### **Widget Not Working on Mobile**
**Problem:** The widget works on desktop but not mobile.

**Solutions:**
1. **Check mobile viewport** settings
2. **Test on different mobile devices**
3. **Ensure your site is mobile-responsive**
4. **Check for mobile-specific CSS conflicts**

#### **Feedback Not Submitting**
**Problem:** Users can't submit feedback.

**Solutions:**
1. **Check Supabase credentials** are correct
2. **Verify database tables** are set up
3. **Check browser console** for API errors
4. **Ensure internet connection** is working

#### **Widget Loading Slowly**
**Problem:** The widget takes a long time to load.

**Solutions:**
1. **Use the CDN version** for faster loading
2. **Check your internet connection**
3. **Optimize your website** performance
4. **Consider using the NPM package** for better caching

### **Testing Checklist**

Before going live, test these:

- [ ] **Widget appears** on all pages
- [ ] **Widget opens** when clicked
- [ ] **Form fields** work correctly
- [ ] **Feedback submits** successfully
- [ ] **Widget works** on mobile devices
- [ ] **Colors match** your brand
- [ ] **No console errors** in browser
- [ ] **Widget doesn't interfere** with your site

---

## **📞 Getting Help**

### **Support Resources**

1. **Documentation:** Check our comprehensive guides
2. **Console Errors:** Look for error messages in browser console
3. **Settings:** Verify your configuration in the dashboard
4. **Community:** Join our Discord or forum for help

### **Contact Information**

- **Email:** support@notex.com.ng
- **Discord:** Join our community server
- **Documentation:** docs.notex.com.ng

---

## **🎯 Quick Reference**

### **Method Comparison**

| Method | Best For | Setup Time | Customization | Performance |
|--------|----------|------------|---------------|-------------|
| **Script Tag** | Simple sites | 2-3 min | ⭐⭐ | ⭐⭐⭐ |
| **NPM Package** | Modern frameworks | 5-10 min | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **CDN** | Static sites | 3-5 min | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Vanilla JS** | Custom apps | 5-8 min | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### **Configuration Options**

```javascript
{
  userId: 'your-user-id',           // Required
  supabaseUrl: 'your-supabase-url', // Required
  supabaseKey: 'your-anon-key',     // Required
  position: 'bottom-right',         // bottom-right, bottom-left, top-right, top-left
  greeting: 'How can we help?',     // Custom greeting text
  primaryColor: '#3b82f6',          // Primary brand color
  secondaryColor: '#1e40af',        // Secondary brand color
  enabled: true,                    // Enable/disable widget
  autoOpen: false,                  // Auto-open on page load
  zIndex: 9999                      // CSS z-index
}
```

---

**🎉 Congratulations!** You've successfully embedded the NoteX feedback widget on your website. Your users can now provide feedback directly through the widget, and you'll receive it in real-time in your dashboard.