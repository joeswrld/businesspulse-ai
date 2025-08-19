# NoteX Feedback Widget - Production Ready

A fully integrated, real-time feedback widget that connects directly to your Supabase backend. This widget is production-ready and includes real-time updates, notification badges, and automatic settings synchronization.

## 🚀 Features

- **Full Supabase Integration** - Direct connection to your Supabase database
- **Real-time Updates** - Live notifications and settings sync
- **Notification Badge** - Shows unread feedback count
- **Settings Synchronization** - Automatically updates from your dashboard
- **Mobile Responsive** - Works perfectly on all devices
- **Production Ready** - Error handling, fallbacks, and performance optimized
- **No Dependencies** - Only requires Supabase CDN (loaded automatically)

## 📦 Installation

### 1. Download the Widget

Download `widget.js` and include it in your website:

```html
<script src="widget.js"></script>
```

### 2. Initialize the Widget

Add this script to your website with your configuration:

```html
<script>
  NoteXWidget.init({
    userId: 'your-user-id-here',
    supabaseUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84'
  });
</script>
```

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `userId` | string | required | Your user ID from the dashboard |
| `supabaseUrl` | string | - | Your Supabase project URL |
| `supabaseKey` | string | - | Your Supabase anon/public key |
| `position` | string | 'bottom-right' | Widget position: 'bottom-right', 'bottom-left', 'top-right', 'top-left' |
| `theme` | string | 'light' | Widget theme: 'light', 'dark', 'auto' |
| `greeting` | string | 'How was your experience?' | Default greeting text |
| `primaryColor` | string | '#3b82f6' | Primary brand color |
| `secondaryColor` | string | '#1e40af' | Secondary brand color |
| `enabled` | boolean | true | Enable/disable the widget |
| `autoOpen` | boolean | false | Automatically open widget on page load |
| `zIndex` | number | 9999 | CSS z-index for widget positioning |
| `realtime` | boolean | true | Enable real-time updates |
| `notifications` | boolean | true | Enable notifications |

## 🔧 API Methods

The widget exposes several methods for programmatic control:

```javascript
// Open the widget
NoteXWidget.open();

// Close the widget
NoteXWidget.close();

// Toggle the widget
NoteXWidget.toggle();

// Update notification badge
NoteXWidget.updateNotificationBadge();

// Destroy the widget (cleanup)
NoteXWidget.destroy();
```

## 🔄 Real-time Features

### Automatic Settings Sync
The widget automatically fetches and applies settings from your dashboard:
- Brand colors
- Greeting text
- Button placement
- Widget enabled/disabled state

### Real-time Notifications
- Shows notification badge with unread feedback count
- Displays toast notifications for new feedback
- Updates automatically when settings change

### Live Feedback Updates
- New feedback appears in your dashboard immediately
- Settings changes reflect in real-time
- Notification badges update automatically

## 📊 Database Integration

The widget integrates with your existing Supabase tables:

### Feedback Table
```sql
feedback (
  id: uuid,
  user_id: uuid,
  client_name: text,
  email: text,
  message: text,
  category: text,
  status: text,
  priority: text,
  metadata: jsonb,
  created_at: timestamp
)
```

### Settings Table
```sql
feedback_settings (
  id: uuid,
  user_id: uuid,
  brand_colors: jsonb,
  greeting_text: text,
  button_placement: text,
  widget_enabled: boolean,
  auto_notifications: boolean,
  created_at: timestamp,
  updated_at: timestamp
)
```

## 🎨 Customization

### Brand Colors
Update your brand colors in the Feedback Settings page, and they'll automatically apply to the widget:

```javascript
// Colors are automatically synced from dashboard
{
  "brand_colors": {
    "primary": "#3b82f6",
    "secondary": "#1e40af"
  }
}
```

### Greeting Text
Customize the greeting text from your dashboard:

```javascript
// Greeting text is automatically synced
{
  "greeting_text": "How can we help you today?"
}
```

### Button Placement
Choose from multiple placement options:
- `bottom-right` (default)
- `bottom-left`
- `top-right`
- `top-left`

## 📱 Mobile Responsive

The widget is fully responsive and works perfectly on:
- Desktop computers
- Tablets
- Mobile phones
- All screen sizes

## 🔒 Security

- Uses Supabase Row Level Security (RLS)
- Only connects to your specific user's data
- No sensitive data stored in the widget
- Automatic error handling and fallbacks

## 🚀 Performance

- Lightweight (minimal JavaScript)
- Automatic Supabase client loading
- Efficient real-time subscriptions
- Optimized CSS animations
- No external dependencies

## 🐛 Error Handling

The widget includes comprehensive error handling:
- Network connection issues
- Supabase authentication errors
- Database connection problems
- Graceful fallbacks for all scenarios

## 📋 Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers

## 🔧 Development

### Local Testing
1. Open `widget-demo.html` in your browser
2. The widget will initialize automatically
3. Test all functionality using the demo controls

### Debug Mode
Enable console logging for debugging:

```javascript
// Widget logs are available in browser console
console.log('NoteX Widget: Initialized successfully');
```

## 📞 Support

For support and questions:
1. Check the browser console for error messages
2. Verify your Supabase credentials
3. Ensure your database tables are properly set up
4. Test with the demo file first

## 🔄 Updates

The widget automatically:
- Loads the latest Supabase client
- Syncs with dashboard settings
- Updates notification badges
- Handles real-time changes

## 📈 Analytics

The widget tracks:
- User agent information
- Page URL
- Submission timestamp
- Rating data
- Category selection

All data is stored in the `metadata` field of the feedback table.

## 🎯 Best Practices

1. **User ID**: Use a consistent user ID across all your websites
2. **Testing**: Always test with the demo file first
3. **Settings**: Configure widget appearance from the dashboard
4. **Monitoring**: Check browser console for any errors
5. **Performance**: The widget is optimized for production use

## 🔗 Integration Examples

### Basic Integration
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <h1>Welcome to my website</h1>
    
    <!-- Widget Script -->
    <script src="widget.js"></script>
    <script>
        NoteXWidget.init({
            userId: 'your-user-id',
            supabaseUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
            supabaseKey: 'your-supabase-key'
        });
    </script>
</body>
</html>
```

### Advanced Integration
```html
<script>
    NoteXWidget.init({
        userId: 'your-user-id',
        supabaseUrl: 'https://xjbrqeqizpoqdjkiyqzt.supabase.co',
        supabaseKey: 'your-supabase-key',
        position: 'bottom-left',
        greeting: 'We\'d love to hear from you!',
        primaryColor: '#ff6b6b',
        secondaryColor: '#ee5a52',
        autoOpen: false,
        realtime: true,
        notifications: true
    });
    
    // Programmatic control
    setTimeout(() => {
        NoteXWidget.open();
    }, 5000);
</script>
```

---

**NoteX Widget** - Production-ready feedback collection with real-time updates and full Supabase integration.