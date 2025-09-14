# Feedback System

A complete feedback collection system with customizable widget, settings management, and feedback viewing capabilities.

## 🚀 Features

### 📊 Three Main Pages
1. **Feedback Settings** (`/feedback-settings`) - Configure widget appearance and behavior
2. **Feedback** (`/feedback`) - View and manage all feedback entries
3. **Widget** (`/widget`) - Preview widget and get embed code

### 🎨 Widget Features
- Floating feedback button with custom color
- Customizable title and greeting text
- Optional email collection
- Mobile-responsive design
- Easy integration with single script tag

### 🔒 Security
- Row Level Security (RLS) enabled
- Users can only access their own feedback data
- Project-based data isolation

## 📋 Database Schema

### `feedback_settings` Table
```sql
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- project_id (text, unique)
- widget_title (text, default: 'Share your feedback with us!')
- widget_color (text, default: '#3B82F6')
- greeting_text (text, default: 'Welcome, tell us what's on your mind')
- created_at (timestamptz)
```

### `feedback` Table
```sql
- id (uuid, primary key)
- project_id (text, references feedback_settings.project_id)
- email (text, optional)
- message (text, required)
- created_at (timestamptz)
```

## 🛠️ Setup Instructions

### 1. Deploy Database Schema
```bash
# Run the deployment script
./deploy-feedback-system.sh

# Or manually deploy the schema
supabase db push --file feedback_system_schema.sql
```

### 2. Update Widget Configuration
Edit `public/widget.js` and update the configuration:

```javascript
const CONFIG = {
  apiUrl: 'YOUR_SUPABASE_URL',
  apiKey: 'YOUR_SUPABASE_ANON_KEY',
  // ... other config
};
```

### 3. Test the System
1. Visit `/feedback-settings` to configure your widget
2. Visit `/feedback` to view feedback entries
3. Visit `/widget` to get the embed code
4. Test the widget on a sample page

## 📱 Usage

### For Users (Website Owners)

1. **Configure Widget**
   - Go to Feedback Settings page
   - Set widget title, color, and greeting text
   - Copy your Project ID

2. **Embed Widget**
   - Go to Widget page
   - Copy the embed script
   - Paste before `</body>` tag on your website

3. **View Feedback**
   - Go to Feedback page
   - View all feedback entries
   - Use search and filters to find specific feedback

### For Website Visitors

1. **Submit Feedback**
   - Click the floating feedback button
   - Fill in the feedback form
   - Optionally provide email for follow-up

## 🔧 Technical Details

### Widget Integration
```html
<!-- Add this script to your website -->
<script src="https://notex.com.ng/widget.js" data-project-id="YOUR_PROJECT_ID"></script>
```

### API Endpoints
- `GET /rest/v1/feedback_settings?project_id=eq.{project_id}` - Get widget settings
- `POST /rest/v1/feedback` - Submit feedback
- `GET /rest/v1/feedback?project_id=eq.{project_id}` - Get feedback entries

### RLS Policies
- Users can only access their own feedback settings
- Users can only view feedback for their project
- Anyone can submit feedback (public endpoint)

## 🎨 Customization

### Widget Styling
The widget automatically adapts to your settings:
- **Color**: Set via `widget_color` in settings
- **Title**: Set via `widget_title` in settings
- **Greeting**: Set via `greeting_text` in settings

### Custom Styling
You can override widget styles by adding CSS after the widget script:

```html
<script src="https://notex.com.ng/widget.js" data-project-id="YOUR_PROJECT_ID"></script>
<style>
  #notex-feedback-button {
    /* Your custom styles */
  }
</style>
```

## 🔍 Monitoring

### Feedback Analytics
- Total feedback count
- Feedback with/without email
- Daily feedback count
- Search and filter capabilities

### Real-time Updates
- Refresh button to get latest feedback
- Automatic loading states
- Error handling and user feedback

## 🚨 Troubleshooting

### Common Issues

1. **Widget not appearing**
   - Check if Project ID is correct
   - Verify script is loaded before `</body>` tag
   - Check browser console for errors

2. **Feedback not submitting**
   - Verify Supabase URL and API key in widget.js
   - Check RLS policies are correctly set
   - Ensure feedback table exists

3. **Settings not saving**
   - Check user authentication
   - Verify RLS policies for feedback_settings table
   - Check browser console for errors

### Debug Mode
Enable debug logging by adding `?debug=true` to your widget URL:
```html
<script src="https://notex.com.ng/widget.js?debug=true" data-project-id="YOUR_PROJECT_ID"></script>
```

## 📈 Future Enhancements

- [ ] Email notifications for new feedback
- [ ] Feedback categorization and tagging
- [ ] Export feedback to CSV/PDF
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Custom form fields
- [ ] Integration with popular platforms

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the documentation

---

**Happy feedback collecting! 🎉**