# NoteX Feedback System

A complete, production-ready feedback collection system for NoteX that allows founders to collect real-time feedback from their website visitors.

## 🚀 Features

### ✅ Core Functionality
- **One-time editable Project ID** - Unique identifier for each user's feedback collection
- **Real-time feedback collection** - Instant feedback submission via embedded widget
- **Live feedback dashboard** - Real-time updates with Supabase Realtime
- **Email notifications** - Get notified when new feedback arrives
- **Status management** - Track feedback as New, Reviewed, or Resolved
- **Export functionality** - Export all feedback to TXT format
- **Search and filtering** - Find specific feedback quickly

### ✅ Widget Features
- **Floating feedback button** - Non-intrusive widget that appears on any website
- **Customizable appearance** - Brand colors, themes, and text
- **Responsive design** - Works perfectly on all devices
- **Success confirmation** - Users get immediate feedback on submission
- **Easy integration** - One-line code snippet to add to any website

### ✅ Dashboard Features
- **Real-time statistics** - Live counts of total, new, reviewed, and resolved feedback
- **Advanced filtering** - Filter by status and search by content
- **Status management** - Update feedback status with dropdown controls
- **Export capabilities** - Download all feedback as formatted TXT file
- **Professional UI** - Clean, modern interface with proper loading states

## 📁 File Structure

```
├── setup-feedback-system.sql          # Database schema and setup
├── supabase/functions/feedback-api/   # API endpoint for feedback submission
├── public/feedback-widget.js          # Embeddable feedback widget
├── src/pages/Feedback.tsx             # Feedback management page
├── src/pages/FeedbackSettings.tsx     # Feedback settings page
├── deploy-feedback-system.sh          # Deployment script
└── FEEDBACK_SYSTEM_README.md          # This file
```

## 🗄️ Database Schema

### `feedback_settings` Table
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key -> auth.users.id)
- project_id (text, unique, not null)
- project_id_locked (boolean, default false)
- title (text, default "Share your thoughts with us")
- show_name (boolean, default true)
- show_email (boolean, default true)
- button_text (text, default "Send Feedback")
- redirect_url (text, nullable)
- theme (text, default "light")
- brand_color (text, default "#2563eb")
- notify_email (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

### `feedbacks` Table
```sql
- id (uuid, primary key)
- project_id (text, foreign key -> feedback_settings.project_id)
- name (text)
- email (text)
- message (text)
- timestamp (timestamp, default now())
- status (text, default "new")
```

## 🚀 Quick Start

### 1. Database Setup
Run the SQL script in your Supabase SQL Editor:
```bash
# Copy the contents of setup-feedback-system.sql and run it in Supabase
cat setup-feedback-system.sql
```

### 2. Deploy API Function
```bash
# Deploy the feedback API function
supabase functions deploy feedback-api
```

### 3. Deploy Widget
Upload `public/feedback-widget.js` to your CDN or hosting service.

### 4. Configure Settings
1. Go to **Feedback Settings** in your NoteX dashboard
2. Customize your widget appearance and behavior
3. Save settings to lock your Project ID
4. Copy the embed code and add it to your website

### 5. Start Collecting Feedback
The feedback widget will appear on your website, and all submissions will be visible in real-time in your **Feedback** page.

## 🔧 Configuration

### Widget Customization
- **Project ID**: Unique identifier (editable once, then locked)
- **Title**: Custom form title
- **Button Text**: Custom submit button text
- **Theme**: Light or dark theme
- **Brand Color**: Custom color for the widget
- **Show Name/Email**: Toggle visibility of name and email fields
- **Email Notifications**: Receive email alerts for new feedback
- **Redirect URL**: Optional redirect after submission

### Embed Code
```html
<script src="https://notex.com.ng/feedback-widget.js" data-project-id="YOUR_PROJECT_ID"></script>
```

## 📊 API Endpoint

### POST `/functions/v1/feedback-api`
Accepts form data submissions from the widget.

**Request Body:**
```javascript
{
  project_id: "string",
  name: "string (optional)",
  email: "string (optional)",
  message: "string (required)"
}
```

**Response:**
```javascript
{
  success: true,
  message: "Feedback submitted successfully!",
  data: { /* feedback object */ }
}
```

## 🔄 Real-time Features

### Supabase Realtime
- **Live feedback updates** - New feedback appears instantly
- **Toast notifications** - Get notified when new feedback arrives
- **Status updates** - Real-time status changes across all clients

### Email Notifications
- **Automatic emails** - Sent when `notify_email` is configured
- **Rich formatting** - Includes feedback details and timestamps
- **Error handling** - Graceful fallback if email fails

## 🎨 Widget Features

### User Experience
- **Floating button** - Non-intrusive, always accessible
- **Modal form** - Clean, focused feedback collection
- **Success feedback** - Immediate confirmation on submission
- **Error handling** - Clear error messages if submission fails
- **Keyboard support** - ESC key to close modal

### Technical Features
- **Vanilla JavaScript** - No dependencies, works everywhere
- **Responsive design** - Perfect on mobile and desktop
- **Customizable styling** - Adapts to your brand colors
- **Cross-browser compatible** - Works in all modern browsers

## 📱 Dashboard Features

### Feedback Management
- **Real-time list** - Live updates as feedback arrives
- **Status management** - Update feedback status (New → Reviewed → Resolved)
- **Search functionality** - Search by name, email, or message content
- **Status filtering** - Filter by New, Reviewed, or Resolved
- **Export to TXT** - Download all feedback in formatted text file

### Statistics
- **Total feedback count** - Overall feedback received
- **Status breakdown** - Counts for New, Reviewed, and Resolved
- **Real-time updates** - Live statistics that update automatically

## 🔒 Security & Privacy

### Row Level Security (RLS)
- **User isolation** - Users can only see their own feedback
- **Project isolation** - Feedback is tied to specific project IDs
- **Secure API** - Validates project IDs before accepting submissions

### Data Protection
- **Optional fields** - Name and email are optional
- **GDPR compliant** - Minimal data collection
- **Secure storage** - All data stored in Supabase with encryption

## 🚀 Deployment

### Automated Deployment
```bash
# Run the deployment script
./deploy-feedback-system.sh
```

### Manual Deployment Steps
1. **Database**: Run `setup-feedback-system.sql` in Supabase
2. **API**: Deploy `supabase/functions/feedback-api`
3. **Widget**: Upload `public/feedback-widget.js` to CDN
4. **App**: Build and deploy the React application

## 🧪 Testing

### Widget Testing
1. Add the embed code to a test website
2. Submit test feedback
3. Verify it appears in the dashboard
4. Test real-time updates

### API Testing
```bash
# Test the API endpoint
curl -X POST https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/feedback-api \
  -F "project_id=YOUR_PROJECT_ID" \
  -F "name=Test User" \
  -F "email=test@example.com" \
  -F "message=This is a test feedback"
```

## 🔧 Troubleshooting

### Common Issues

**Widget not appearing:**
- Check if the script URL is accessible
- Verify the project ID is correct
- Check browser console for errors

**Feedback not saving:**
- Verify the API function is deployed
- Check project ID exists in database
- Review API function logs

**Real-time not working:**
- Ensure Supabase Realtime is enabled
- Check subscription setup
- Verify RLS policies are correct

### Debug Mode
Enable console logging in the widget for debugging:
```javascript
// Add to feedback-widget.js
console.log('NoteX Feedback Widget loaded');
```

## 📈 Future Enhancements

### Planned Features
- **Sentiment analysis** - Automatic sentiment detection
- **Analytics dashboard** - Detailed feedback analytics
- **Team collaboration** - Assign feedback to team members
- **Custom fields** - Add custom form fields
- **Multi-language support** - Internationalization
- **Advanced filtering** - Date ranges, custom filters
- **Bulk actions** - Mass status updates
- **API integrations** - Slack, Discord, etc.

### Performance Optimizations
- **Pagination** - Handle large feedback volumes
- **Caching** - Improve response times
- **CDN optimization** - Faster widget loading
- **Database indexing** - Optimize queries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of NoteX and follows the same licensing terms.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Contact the NoteX team

---

**NoteX Feedback System** - Transform customer feedback into actionable insights! 🚀