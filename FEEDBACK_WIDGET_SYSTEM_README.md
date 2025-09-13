# NoteX Feedback Widget System

A complete, production-ready feedback widget system that allows users to collect feedback from external websites through an embeddable JavaScript widget.

## 🚀 Features

- **Embeddable Widget**: Lightweight JavaScript widget that can be embedded on any website
- **Customizable Design**: Users can customize widget title, colors, and appearance
- **Secure Database**: Supabase-powered backend with Row Level Security (RLS)
- **Real-time Collection**: Feedback is collected in real-time and stored securely
- **User Management**: Each user gets their own project ID and settings
- **Responsive Design**: Works on desktop and mobile devices
- **Easy Integration**: Simple one-line embed code

## 📋 System Components

### 1. Database Schema

#### `feedback_settings` Table
```sql
CREATE TABLE public.feedback_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID DEFAULT gen_random_uuid() UNIQUE,
  widget_title TEXT DEFAULT 'Share your feedback with us!',
  widget_color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `feedback` Table
```sql
CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  page_url TEXT,
  browser TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Frontend Components

#### Feedback Settings Page (`/feedback-settings`)
- Loads user's current settings
- Creates default settings if none exist
- Form to edit widget title and color
- Live preview of widget appearance
- Generates embed code for external websites

#### Feedback Inbox (`/feedback`)
- Displays all feedback collected by the user's widget
- Search and filter functionality
- Pagination for large datasets
- Integration with AI insights

### 3. Public Widget Script (`/widget.js`)
- Lightweight, embeddable JavaScript
- Reads `data-project-id` from script tag
- Creates floating feedback button
- Opens modal with feedback form
- Submits feedback to Supabase database

## 🛠️ Installation & Setup

### 1. Database Setup

Run the migration to create the required tables:

```bash
# Apply the migration
npx supabase db reset --local
```

Or manually run the SQL from `supabase/migrations/20250130000000_setup_feedback_widget_system.sql`.

### 2. Environment Configuration

Ensure your Supabase configuration is properly set up:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Deploy Widget

Deploy the widget to make it publicly available:

```bash
./deploy-widget.sh
```

This will:
- Update the widget with your Supabase configuration
- Build the project
- Deploy to Vercel (if available)
- Make widget available at `https://notex.com.ng/widget.js`

## 📖 Usage

### For NoteX Users

1. **Access Settings**: Go to `/feedback-settings` in your NoteX dashboard
2. **Customize Widget**: Set your widget title and color
3. **Copy Embed Code**: Copy the generated embed code
4. **View Feedback**: Check `/feedback` to see collected feedback

### For External Websites

1. **Get Embed Code**: From your NoteX dashboard settings
2. **Add to Website**: Paste the script tag before closing `</body>`
3. **Test Widget**: Verify the floating button appears and works

Example embed code:
```html
<script src="https://notex.com.ng/widget.js" data-project-id="YOUR_PROJECT_ID"></script>
```

## 🔧 Configuration

### Widget Customization

Users can customize:
- **Widget Title**: Text displayed in the modal
- **Widget Color**: Color of the floating button and submit button
- **Project ID**: Unique identifier for feedback collection

### Database Security

- **Row Level Security (RLS)**: Enabled on all tables
- **User Isolation**: Users can only access their own data
- **Public Feedback**: Anyone can submit feedback (no auth required)

## 🧪 Testing

### Test the System

Run the comprehensive test suite:

```bash
node test-feedback-system.js
```

### Test Widget Locally

1. Open `public/widget-test.html` in your browser
2. Click the floating feedback button
3. Submit test feedback
4. Check the feedback inbox in your dashboard

### Test on External Website

1. Create a simple HTML file
2. Add the embed script
3. Test the widget functionality

## 📊 API Endpoints

### Feedback Settings

- **GET** `/feedback-settings` - Get user's settings
- **POST** `/feedback-settings` - Create/update settings
- **PUT** `/feedback-settings` - Update settings

### Feedback Collection

- **POST** `/feedback` - Submit new feedback (public endpoint)
- **GET** `/feedback` - Get user's collected feedback

## 🔒 Security Features

- **RLS Policies**: Database-level security
- **User Authentication**: Required for settings access
- **Input Validation**: Client and server-side validation
- **CORS Support**: Proper cross-origin request handling

## 🚀 Deployment

### Production Deployment

1. **Database**: Ensure migrations are applied to production
2. **Widget**: Deploy using `./deploy-widget.sh`
3. **Frontend**: Deploy the main application
4. **Testing**: Verify widget works on external sites

### Environment Variables

Required environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📈 Monitoring

### Feedback Analytics

- Total feedback count per user
- Feedback by date range
- Page URL tracking
- Browser information

### Performance

- Widget load time
- Form submission success rate
- Error tracking

## 🐛 Troubleshooting

### Common Issues

1. **Widget not loading**: Check Supabase configuration
2. **Feedback not submitting**: Verify RLS policies
3. **Settings not saving**: Check user authentication
4. **Embed code not working**: Verify project ID

### Debug Mode

Enable debug logging in the widget:
```javascript
// Add to widget.js
const DEBUG = true;
```

## 🔄 Updates & Maintenance

### Regular Tasks

- Monitor feedback collection
- Update widget if needed
- Check database performance
- Review security policies

### Version Control

- Widget versioning
- Database migration tracking
- Feature flag management

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the test results
3. Check Supabase logs
4. Contact support

## 🎯 Roadmap

### Planned Features

- [ ] Widget themes and templates
- [ ] Advanced customization options
- [ ] Feedback analytics dashboard
- [ ] Email notifications
- [ ] Multi-language support
- [ ] A/B testing for widget placement

---

**Status**: ✅ Production Ready
**Last Updated**: January 30, 2025
**Version**: 1.0.0