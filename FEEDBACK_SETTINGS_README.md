# Feedback Settings System for NoteX

A comprehensive feedback collection system that allows users to configure survey links, generate QR codes, and create embeddable widgets for their websites.

## 🚀 Features

### Core Functionality
- **Project ID Management**: Auto-generated unique project identifiers for each user
- **Survey Links**: Customer satisfaction survey and product feedback form URLs
- **QR Code Generation**: Automatic QR code creation for easy mobile sharing
- **Widget Embed Code**: Ready-to-use HTML embed code for websites
- **Real-time Updates**: Live URL regeneration and settings management

### User Interface
- **Modern Design**: Built with Tailwind CSS and shadcn/ui components
- **Responsive Layout**: Works perfectly on desktop and mobile devices
- **Interactive Elements**: Copy-to-clipboard, external link opening, and real-time updates
- **Loading States**: Smooth loading and saving indicators
- **Error Handling**: Comprehensive error messages and retry mechanisms

## 📁 File Structure

```
src/
├── pages/
│   └── FeedbackSettings.tsx          # Main page component
├── hooks/
│   └── useFeedbackSettings.ts        # Custom hook for data management
├── components/ui/                     # UI components (already existing)
└── integrations/supabase/
    ├── client.ts                     # Supabase client
    └── types.ts                      # Updated with new table types
```

## 🗄️ Database Schema

### feedback_settings Table
```sql
CREATE TABLE feedback_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid UNIQUE DEFAULT gen_random_uuid(),
  customer_survey_url text,
  product_feedback_url text,
  widget_code text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Database Functions
- `get_or_create_feedback_settings(p_user_id)`: Gets existing settings or creates new ones
- `update_feedback_settings(p_user_id, p_customer_survey_url, p_product_feedback_url, p_widget_code)`: Updates user settings

## 🛠️ Installation & Setup

### 1. Database Migration
```bash
# Run the deployment script
./deploy-feedback-settings.sh

# Or manually apply the SQL
supabase db push --file create_feedback_settings_table.sql
```

### 2. Environment Variables
Ensure your Supabase environment variables are set:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Dependencies
The following packages are already included in your project:
- `qrcode.react`: For QR code generation
- `@supabase/supabase-js`: For database operations
- `lucide-react`: For icons
- `@radix-ui/*`: For UI components

## 🎯 Usage

### Accessing the Page
1. Navigate to `/feedback-settings` in your application
2. Or click "Feedback Settings" in the sidebar navigation

### Managing Settings
1. **Project ID**: Automatically generated, read-only display
2. **Survey URLs**: Editable customer satisfaction and feedback form links
3. **QR Codes**: Automatically generated for each URL
4. **Widget Code**: Auto-generated embed code for websites
5. **Regenerate**: Click to generate new URLs and project ID

### Copying & Sharing
- Click the copy button next to any field to copy to clipboard
- Click the external link button to open URLs in a new tab
- QR codes are automatically generated for easy mobile sharing

## 🔧 Customization

### URL Base
Update the base URL in the `useFeedbackSettings` hook:
```typescript
const baseUrl = 'https://your-domain.com';
```

### Widget Code Template
Customize the widget embed code format:
```typescript
widget_code: `<script src="${baseUrl}/widget.js" data-project-id="${projectId}"></script>`
```

### Styling
The component uses Tailwind CSS classes and can be customized by modifying the className props.

## 🔒 Security

### Row Level Security (RLS)
- Users can only access their own feedback settings
- All database operations are protected by RLS policies
- Functions use `SECURITY DEFINER` for controlled access

### Authentication
- All operations require user authentication
- Settings are automatically associated with the authenticated user

## 🧪 Testing

### Manual Testing
1. Navigate to `/feedback-settings`
2. Verify settings are loaded or created automatically
3. Test URL editing and saving
4. Test QR code generation
5. Test copy-to-clipboard functionality
6. Test URL regeneration

### Database Testing
```sql
-- Check if table exists
SELECT * FROM feedback_settings LIMIT 1;

-- Test function
SELECT * FROM get_or_create_feedback_settings('user-uuid-here');

-- Test update
SELECT * FROM update_feedback_settings(
  'user-uuid-here',
  'https://example.com/survey/123',
  'https://example.com/feedback/123',
  '<script src="https://example.com/widget.js" data-project-id="123"></script>'
);
```

## 🚨 Troubleshooting

### Common Issues

1. **Settings not loading**
   - Check if user is authenticated
   - Verify Supabase connection
   - Check browser console for errors

2. **Save not working**
   - Verify RLS policies are in place
   - Check if user has proper permissions
   - Ensure all required fields are filled

3. **QR codes not generating**
   - Verify `qrcode.react` is installed
   - Check if URLs are valid
   - Ensure component is properly imported

4. **Copy to clipboard not working**
   - Check if site is served over HTTPS
   - Verify browser supports clipboard API
   - Check for permission issues

### Debug Mode
Enable debug logging by adding to your environment:
```env
VITE_DEBUG=true
```

## 📈 Future Enhancements

### Planned Features
- [ ] Custom QR code styling options
- [ ] Widget customization (colors, position, text)
- [ ] Analytics integration for feedback collection
- [ ] Bulk URL generation for multiple projects
- [ ] Export settings to JSON/CSV
- [ ] Integration with popular CMS platforms

### API Extensions
- [ ] REST API endpoints for external access
- [ ] Webhook support for real-time updates
- [ ] Rate limiting for public endpoints
- [ ] Caching for improved performance

## 🤝 Contributing

### Code Style
- Use TypeScript for type safety
- Follow existing component patterns
- Use Tailwind CSS for styling
- Implement proper error handling

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request with description

## 📄 License

This feature is part of the NoteX platform and follows the same licensing terms.

---

## 🎉 Success!

Your Feedback Settings system is now fully integrated and ready to use! Users can access it through the sidebar navigation and start collecting feedback immediately.

For support or questions, please refer to the main NoteX documentation or contact the development team.