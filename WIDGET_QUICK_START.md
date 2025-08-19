# ⚡ **Widget Quick Start Guide**

## **🚀 Choose Your Method (2-10 minutes setup)**

---

## **📋 Method 1: Basic Script Tag (2 minutes)**

**For:** Simple HTML websites, quick testing

```html
<!-- Add this before </body> -->
<script src="https://notex.com.ng/widget.js" data-user-id="YOUR_USER_ID"></script>
```

**Steps:**
1. Copy the code above
2. Replace `YOUR_USER_ID` with your actual user ID
3. Paste before `</body>` in your HTML
4. Save and refresh

---

## **📦 Method 2: NPM Package (5 minutes)**

**For:** React, Vue, Angular, Next.js

```bash
npm install notex-feedback-widget
```

**React:**
```tsx
import { useNoteXWidget } from 'notex-feedback-widget/react';

function App() {
  const { toggle } = useNoteXWidget({
    userId: 'YOUR_USER_ID',
    supabaseUrl: 'YOUR_SUPABASE_URL',
    supabaseKey: 'YOUR_ANON_KEY'
  });

  return <button onClick={toggle}>Feedback</button>;
}
```

**Vue:**
```vue
<script setup>
import { useNoteXWidget } from 'notex-feedback-widget/vue';

const { toggle } = useNoteXWidget({
  userId: 'YOUR_USER_ID',
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseKey: 'YOUR_ANON_KEY'
});
</script>
```

---

## **🌐 Method 3: CDN (3 minutes)**

**For:** Static sites, WordPress, Shopify

```html
<!-- Add in <head> -->
<script>
  window.NoteXConfig = {
    userId: 'YOUR_USER_ID',
    supabaseUrl: 'YOUR_SUPABASE_URL',
    supabaseKey: 'YOUR_ANON_KEY'
  };
</script>

<!-- Add before </body> -->
<script src="https://cdn.notex.com.ng/widget-v2.js" async></script>
```

---

## **🔧 Get Your Credentials**

1. **Go to your NoteX dashboard**
2. **Navigate to "Feedback Settings"**
3. **Copy your User ID and Supabase credentials**

---

## **✅ Test Your Widget**

1. **Refresh your website**
2. **Look for the feedback button** (bottom-right corner)
3. **Click it to test**
4. **Submit a test feedback**

---

## **🎨 Customize Appearance**

In your NoteX dashboard > Feedback Settings:

- **Brand Colors:** Match your website colors
- **Greeting Text:** Customize the welcome message
- **Button Position:** Choose where the widget appears
- **Enable/Disable:** Turn the widget on/off

---

## **🔧 Troubleshooting**

**Widget not appearing?**
- Check browser console for errors
- Verify your user ID is correct
- Ensure script is loaded

**Wrong colors?**
- Update settings in dashboard
- Clear browser cache
- Refresh the page

**Need help?**
- Check browser console
- Review our full documentation
- Contact support

---

## **📱 Platform-Specific**

### **WordPress**
Add to `footer.php` before `</body>`:
```php
<script src="https://notex.com.ng/widget.js" data-user-id="YOUR_USER_ID"></script>
```

### **Shopify**
Add to `layout/theme.liquid` before `</body>`:
```liquid
<script src="https://notex.com.ng/widget.js" data-user-id="YOUR_USER_ID"></script>
```

### **Wix**
Add as Custom Code element:
```html
<script src="https://notex.com.ng/widget.js" data-user-id="YOUR_USER_ID"></script>
```

---

## **🎯 Quick Configuration**

```javascript
{
  userId: 'YOUR_USER_ID',           // Required
  supabaseUrl: 'YOUR_SUPABASE_URL', // Required  
  supabaseKey: 'YOUR_ANON_KEY',     // Required
  position: 'bottom-right',         // Widget position
  greeting: 'How can we help?',     // Welcome message
  primaryColor: '#3b82f6',          // Brand color
  secondaryColor: '#1e40af',        // Secondary color
  enabled: true,                    // Enable widget
  autoOpen: false                   // Auto-open on load
}
```

---

**🎉 That's it!** Your feedback widget is now live on your website.