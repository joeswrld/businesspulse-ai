# Feedback Management System

A comprehensive feedback collection and management system built with React, Supabase, and real-time notifications.

## 🚀 Features

### Core Features
- **Real-time Feedback Collection** - Collect feedback from website visitors instantly
- **Sentiment Analysis** - Automatic analysis of feedback sentiment (positive/negative/neutral)
- **Priority Detection** - Automatically detect urgent issues based on keywords
- **Status Management** - Track feedback status (New, Reviewed, Resolved)
- **Export Functionality** - Export feedback to TXT format for manual upload to Insights
- **Real-time Notifications** - Get notified of new feedback, negative sentiment, and urgent issues

### Widget Features
- **Customizable Appearance** - Brand colors, greeting text, button placement
- **Mobile Responsive** - Works perfectly on all devices
- **Easy Integration** - Simple one-line embed code
- **Category Selection** - Users can categorize their feedback
- **Optional Contact Info** - Collect name and email (optional)

### Management Features
- **Dashboard Analytics** - View feedback statistics and trends
- **Filtering & Search** - Find specific feedback quickly
- **Bulk Actions** - Update status for multiple items
- **Detail View** - Comprehensive feedback details with reply functionality
- **Notification Center** - Manage and mark notifications as read

## 📋 Prerequisites

- Node.js 16+ and npm
- Supabase account and project
- Supabase CLI installed globally

## 🛠️ Installation

1. **Clone the repository** (if not already done)
   ```bash
   git clone <your-repo>
   cd <your-project>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   ```bash
   # Link to your Supabase project
   supabase link --project-ref YOUR_PROJECT_ID
   
   # Start local development
   supabase start
   ```

4. **Deploy the feedback system**
   ```bash
   ./deploy-feedback-system.sh
   ```

## 🗄️ Database Schema

The system creates three main tables:

### `feedback`
- Stores all feedback submissions
- Includes sentiment analysis, priority detection, and status tracking
- Automatically categorizes feedback based on content

### `feedback_settings`
- Stores widget customization preferences
- Brand colors, greeting text, button placement
- Notification preferences

### `feedback_notifications`
- Stores notification records
- Tracks read/unread status
- Links to specific feedback items

## 🔧 Configuration

### 1. Update Widget Configuration

Edit `public/widget.js` and update:
```javascript
let config = {
  userId: null,
  apiUrl: 'https://YOUR_PROJECT_ID.supabase.co', // Your Supabase URL
  supabaseKey: 'YOUR_ANON_KEY', // Your Supabase anon key
  // ... other config
};
```

### 2. Environment Variables

Add to your `.env` file:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## 🎯 Usage

### 1. Customize Your Widget

1. Visit `/feedback-settings` in your dashboard
2. Customize brand colors, greeting text, and button placement
3. Copy the embed code provided

### 2. Embed on Your Website

Add this code to any website:
```html
<script src="https://notex.com.ng/widget.js" data-user-id="YOUR_USER_ID"></script>
```

### 3. Manage Feedback

1. Visit `/feedback` to see all collected feedback
2. Use filters to find specific feedback
3. Update status and respond to feedback
4. Export data for analysis

## 📊 API Endpoints

### Feedback Management
- `GET /rest/v1/feedback` - Get all feedback (with RLS)
- `POST /rest/v1/feedback` - Submit new feedback
- `PUT /rest/v1/feedback` - Update feedback status

### Settings
- `GET /rest/v1/feedback_settings` - Get widget settings
- `PUT /rest/v1/feedback_settings` - Update widget settings

### Notifications
- `GET /rest/v1/feedback_notifications` - Get notifications
- `PUT /rest/v1/feedback_notifications` - Mark as read

### Edge Functions
- `POST /functions/v1/process-feedback` - Process new feedback

## 🔄 Real-time Features

The system uses Supabase Realtime to provide:
- Instant feedback updates
- Live notification delivery
- Real-time status changes
- Live statistics updates

## 📧 Email Integration

The system is ready for email integration. To enable:

1. **Update the Edge Function** (`supabase/functions/process-feedback.ts`)
2. **Add your email service credentials** (SendGrid, AWS SES, etc.)
3. **Uncomment the email sending code**

Example with SendGrid:
```typescript
// Add to process-feedback.ts
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Send email notification
await sgMail.send({
  to: userEmail,
  from: 'noreply@yourdomain.com',
  subject: 'New Feedback Received',
  text: `New feedback: ${feedback.message}`
});
```

## 🎨 Customization

### Widget Styling
The widget can be customized through the settings page:
- Primary and secondary brand colors
- Greeting text
- Button placement (left, right, bottom)
- Enable/disable widget

### Advanced Customization
For advanced customization, edit `public/widget.js`:
- Modify CSS styles
- Add custom animations
- Change form fields
- Add custom validation

## 🔒 Security

- **Row Level Security (RLS)** - Users can only access their own feedback
- **Input Validation** - All inputs are validated and sanitized
- **Rate Limiting** - Built-in protection against spam
- **CORS Protection** - Proper CORS headers for widget integration

## 📱 Mobile Support

The feedback widget and management interface are fully responsive:
- Mobile-optimized widget button
- Touch-friendly form inputs
- Responsive data tables
- Mobile navigation support

## 🚀 Deployment

### Production Deployment

1. **Deploy to your hosting platform** (Vercel, Netlify, etc.)
2. **Update widget.js with production URLs**
3. **Set up custom domain for widget.js**
4. **Configure email service**

### Widget Hosting

For production, host `widget.js` on a CDN:
```html
<script src="https://cdn.yourdomain.com/widget.js" data-user-id="YOUR_USER_ID"></script>
```

## 🧪 Testing

### Test the Widget
1. Add the embed code to a test page
2. Submit test feedback
3. Check the feedback dashboard
4. Verify notifications

### Test Notifications
1. Submit feedback with negative keywords
2. Submit feedback with urgent keywords
3. Check notification creation
4. Verify email delivery (if configured)

## 📈 Analytics

The system automatically tracks:
- Feedback submission rates
- Sentiment distribution
- Response times
- User engagement metrics

View analytics in the `/feedback` dashboard.

## 🔧 Troubleshooting

### Common Issues

1. **Widget not appearing**
   - Check browser console for errors
   - Verify Supabase URL and key
   - Ensure widget is enabled in settings

2. **Feedback not saving**
   - Check RLS policies
   - Verify user authentication
   - Check database permissions

3. **Notifications not working**
   - Check Edge Function deployment
   - Verify notification settings
   - Check browser console for errors

### Debug Mode

Enable debug mode in widget.js:
```javascript
let config = {
  // ... other config
  debug: true
};
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support:
1. Check the troubleshooting section
2. Review the Supabase documentation
3. Open an issue on GitHub
4. Contact the development team

---

**Built with ❤️ using React, Supabase, and modern web technologies**