# 🚀 **Advanced Widget Embedding Guide**

## **Overview**

Instead of the basic script tag approach, here are **4 professional embedding methods** that work better with modern JavaScript frameworks and provide better security.

---

## **🎯 Option 1: NPM Package (Recommended)**

### **For React/Next.js/Vue/Angular/Svelte**

#### **Installation:**
```bash
npm install notex-feedback-widget
# or
yarn add notex-feedback-widget
```

#### **React Usage:**
```tsx
import { useNoteXWidget, NoteXProvider } from 'notex-feedback-widget/react';

// Using Hook
function App() {
  const { open, close, toggle } = useNoteXWidget({
    userId: 'your-user-id',
    supabaseUrl: 'https://your-project.supabase.co',
    supabaseKey: 'your-anon-key',
    position: 'bottom-right',
    greeting: 'How can we help?',
    primaryColor: '#3b82f6'
  });

  return (
    <div>
      <button onClick={toggle}>Open Feedback</button>
      {/* Your app content */}
    </div>
  );
}

// Using Provider (Global)
function App() {
  return (
    <NoteXProvider config={{
      userId: 'your-user-id',
      supabaseUrl: 'https://your-project.supabase.co',
      supabaseKey: 'your-anon-key'
    }}>
      <YourApp />
    </NoteXProvider>
  );
}
```

#### **Vue 3 Usage:**
```vue
<template>
  <div>
    <button @click="toggle">Open Feedback</button>
  </div>
</template>

<script setup>
import { useNoteXWidget } from 'notex-feedback-widget/vue';

const { toggle, isOpen } = useNoteXWidget({
  userId: 'your-user-id',
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key'
});
</script>
```

#### **Vanilla JavaScript:**
```javascript
import { initNoteXWidget } from 'notex-feedback-widget';

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

// Control the widget
widget.open();
widget.close();
widget.toggle();
widget.destroy();
```

---

## **🔐 Option 2: Secure API-Based Widget**

### **More Secure, Better Performance**

#### **Installation:**
```bash
npm install notex-feedback-widget-api
```

#### **Usage:**
```javascript
import { NoteXWidgetAPI } from 'notex-feedback-widget-api';

const widget = new NoteXWidgetAPI({
  apiKey: 'notex_your_secure_api_key_here',
  userId: 'your-user-id',
  apiUrl: 'https://your-project.supabase.co/functions/v1/widget-api'
});

// Initialize widget
await widget.init();

// Submit feedback programmatically
await widget.submitFeedback({
  message: 'Great service!',
  rating: 5,
  category: 'praise'
});
```

#### **Configuration:**
```javascript
const config = {
  apiKey: 'notex_your_secure_api_key_here',
  userId: 'your-user-id',
  apiUrl: 'https://your-project.supabase.co/functions/v1/widget-api',
  
  // Widget appearance
  position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
  theme: 'light', // light, dark, auto
  greeting: 'How was your experience?',
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  
  // Behavior
  enabled: true,
  autoOpen: false,
  zIndex: 9999,
  
  // Customization
  showRating: true,
  showCategory: true,
  categories: ['general', 'bug', 'feature', 'complaint', 'praise']
};
```

---

## **🎨 Option 3: Customizable Component**

### **For Full Control**

#### **React Component:**
```tsx
import { NoteXWidget } from 'notex-feedback-widget';

function App() {
  return (
    <div>
      <NoteXWidget
        userId="your-user-id"
        supabaseUrl="https://your-project.supabase.co"
        supabaseKey="your-anon-key"
        position="bottom-right"
        greeting="How can we help?"
        primaryColor="#3b82f6"
        onFeedbackSubmit={(data) => {
          console.log('Feedback submitted:', data);
        }}
        onWidgetOpen={() => {
          console.log('Widget opened');
        }}
      >
        {/* Optional: Custom trigger button */}
        <button>Need Help?</button>
      </NoteXWidget>
    </div>
  );
}
```

#### **Vue Component:**
```vue
<template>
  <NoteXWidget
    :config="widgetConfig"
    @feedback-submit="handleFeedback"
    @widget-open="handleOpen"
  >
    <button>Need Help?</button>
  </NoteXWidget>
</template>

<script setup>
import { NoteXWidget } from 'notex-feedback-widget/vue';

const widgetConfig = {
  userId: 'your-user-id',
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key'
};

const handleFeedback = (data) => {
  console.log('Feedback submitted:', data);
};

const handleOpen = () => {
  console.log('Widget opened');
};
</script>
```

---

## **⚡ Option 4: CDN with API Key**

### **Simplest for Static Sites**

#### **HTML Implementation:**
```html
<!DOCTYPE html>
<html>
<head>
  <script>
    window.NoteXConfig = {
      apiKey: 'notex_your_secure_api_key_here',
      userId: 'your-user-id',
      apiUrl: 'https://your-project.supabase.co/functions/v1/widget-api'
    };
  </script>
  <script src="https://cdn.notex.com.ng/widget-v2.js" async></script>
</head>
<body>
  <!-- Your website content -->
</body>
</html>
```

#### **JavaScript Control:**
```javascript
// Wait for widget to load
window.addEventListener('NoteXWidgetReady', () => {
  // Widget is ready
  window.NoteXWidget.open();
  window.NoteXWidget.close();
  window.NoteXWidget.toggle();
});

// Submit feedback programmatically
window.NoteXWidget.submitFeedback({
  message: 'Great service!',
  rating: 5
});
```

---

## **🔧 Configuration Options**

### **All Methods Support:**

```typescript
interface WidgetConfig {
  // Required
  userId: string;
  
  // API Configuration
  apiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  apiUrl?: string;
  
  // Appearance
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  greeting?: string;
  primaryColor?: string;
  secondaryColor?: string;
  zIndex?: number;
  
  // Behavior
  enabled?: boolean;
  autoOpen?: boolean;
  showRating?: boolean;
  showCategory?: boolean;
  categories?: string[];
  
  // Events
  onFeedbackSubmit?: (data: any) => void;
  onWidgetOpen?: () => void;
  onWidgetClose?: () => void;
}
```

---

## **🛡️ Security Features**

### **API Key Authentication:**
- **Secure API keys** instead of exposing user IDs
- **Rate limiting** and abuse prevention
- **CORS protection** and origin validation
- **Request signing** for sensitive operations

### **Data Protection:**
- **Encrypted data transmission**
- **Input sanitization** and validation
- **XSS protection** and CSP compliance
- **GDPR compliance** with data handling

### **Access Control:**
- **User validation** before feedback submission
- **Domain whitelisting** for API access
- **Session management** and token validation
- **Audit logging** for all operations

---

## **📊 Analytics & Monitoring**

### **Built-in Analytics:**
```javascript
// Track widget usage
widget.track('widget_opened', { source: 'button_click' });
widget.track('feedback_submitted', { category: 'bug', rating: 3 });

// Get analytics data
const analytics = await widget.getAnalytics({
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

### **Performance Monitoring:**
- **Load time tracking**
- **Error rate monitoring**
- **User interaction analytics**
- **Conversion tracking**

---

## **🚀 Deployment**

### **1. Deploy API Function:**
```bash
# Deploy the widget API
supabase functions deploy widget-api

# Set environment variables
supabase secrets set SUPABASE_URL=your-project-url
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

### **2. Publish NPM Package:**
```bash
# Build the package
npm run build

# Publish to NPM
npm publish
```

### **3. Deploy CDN:**
```bash
# Build for CDN
npm run build:cdn

# Upload to CDN (AWS S3, Cloudflare, etc.)
aws s3 sync dist/ s3://your-cdn-bucket/
```

---

## **📱 Framework-Specific Examples**

### **Next.js:**
```tsx
// pages/_app.tsx
import { NoteXProvider } from 'notex-feedback-widget/react';

function MyApp({ Component, pageProps }) {
  return (
    <NoteXProvider config={{
      userId: process.env.NEXT_PUBLIC_NOTEX_USER_ID,
      apiKey: process.env.NEXT_PUBLIC_NOTEX_API_KEY
    }}>
      <Component {...pageProps} />
    </NoteXProvider>
  );
}
```

### **Nuxt.js:**
```javascript
// plugins/notex-widget.js
import { NoteXWidgetPlugin } from 'notex-feedback-widget/vue';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(NoteXWidgetPlugin, {
    userId: 'your-user-id',
    apiKey: 'your-api-key'
  });
});
```

### **Angular:**
```typescript
// app.module.ts
import { NoteXWidgetModule } from 'notex-feedback-widget/angular';

@NgModule({
  imports: [
    NoteXWidgetModule.forRoot({
      userId: 'your-user-id',
      apiKey: 'your-api-key'
    })
  ]
})
export class AppModule { }
```

---

## **🎯 Migration from Script Tag**

### **Old Method:**
```html
<script src="https://notex.com.ng/widget.js" data-user-id="USER_ID"></script>
```

### **New Methods:**

#### **Quick Migration (CDN):**
```html
<script>
  window.NoteXConfig = {
    apiKey: 'notex_your_secure_api_key_here',
    userId: 'USER_ID'
  };
</script>
<script src="https://cdn.notex.com.ng/widget-v2.js" async></script>
```

#### **Professional Migration (NPM):**
```bash
npm install notex-feedback-widget
```

```javascript
import { initNoteXWidget } from 'notex-feedback-widget';

initNoteXWidget({
  apiKey: 'notex_your_secure_api_key_here',
  userId: 'USER_ID'
});
```

---

## **✅ Benefits of New Approach**

### **🔒 Security:**
- **API key authentication** instead of exposed user IDs
- **Request validation** and rate limiting
- **CORS protection** and origin validation

### **🚀 Performance:**
- **Smaller bundle size** with tree shaking
- **Lazy loading** and code splitting
- **Better caching** with versioned releases

### **🎨 Customization:**
- **TypeScript support** with full type safety
- **Framework integration** (React, Vue, Angular)
- **Custom styling** and theming options

### **📊 Analytics:**
- **Built-in tracking** and analytics
- **Performance monitoring**
- **Error tracking** and reporting

### **🛠️ Developer Experience:**
- **IntelliSense support** with TypeScript
- **Hot reloading** during development
- **Comprehensive documentation**
- **Example projects** and templates

---

## **🎯 Choose Your Approach**

| Method | Best For | Security | Performance | Customization |
|--------|----------|----------|-------------|---------------|
| **NPM Package** | React/Vue/Angular | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **API-Based** | All frameworks | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Custom Component** | Full control | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **CDN** | Static sites | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |

**Recommendation:** Start with the **NPM package** for modern frameworks, or **API-based** for maximum security and flexibility.