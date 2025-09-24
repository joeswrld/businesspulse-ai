# Notex Feedback Forms Implementation

This document describes the complete implementation of React feedback forms that behave like the Notex feedback widget, with dynamic project ID detection, Supabase integration, and comprehensive metadata tracking.

## 🚀 Features Implemented

### ✅ Core Functionality
- **Dynamic Project ID Detection**: Automatically detects project ID from URL parameters, search params, data attributes, or session storage
- **Supabase Integration**: Direct insertion into the `feedbacks` table with proper RLS policies
- **Form Validation**: Required field validation with user-friendly error messages
- **Success/Error Handling**: Toast notifications for all user interactions
- **Metadata Tracking**: Comprehensive browser and session information
- **Session Management**: Auto-generated UUID for tracking user sessions

### ✅ Form Types
1. **CSAT Form**: Customer Satisfaction Survey with 1-5 star rating
2. **Product Feedback Form**: Comprehensive product feedback with categorization
3. **Floating Widget**: Combines both forms in a floating, minimizable widget

### ✅ Technical Features
- **Responsive Design**: Works on all screen sizes
- **Isolated Styling**: Self-contained CSS with Tailwind
- **TypeScript Support**: Full type safety throughout
- **Real-time Updates**: Automatic feedback page updates via Supabase subscriptions
- **Error Recovery**: Graceful handling of invalid project IDs

## 📁 File Structure

```
src/
├── hooks/
│   ├── useProjectId.ts           # Project ID detection logic
│   └── useFeedbackSubmission.ts  # Feedback submission with metadata
├── components/forms/
│   ├── CSATForm.tsx             # Customer Satisfaction Survey
│   ├── ProductFeedbackForm.tsx  # Product Feedback Form
│   └── FeedbackWidget.tsx       # Floating widget component
└── pages/
    ├── CSATSurvey.tsx           # Standalone CSAT page
    ├── ProductFeedback.tsx      # Standalone Product Feedback page
    └── FeedbackDemo.tsx         # Demo page with all forms
```

## 🛠️ Usage Examples

### 1. Standalone CSAT Form

```tsx
import CSATForm from '@/components/forms/CSATForm';

<CSATForm
  projectId="your-project-id" // Optional - will auto-detect if not provided
  title="Customer Satisfaction Survey"
  greetingText="How satisfied are you with our service?"
  color="#3B82F6"
  onSuccess={(data) => console.log('Feedback submitted:', data)}
/>
```

### 2. Standalone Product Feedback Form

```tsx
import ProductFeedbackForm from '@/components/forms/ProductFeedbackForm';

<ProductFeedbackForm
  projectId="your-project-id" // Optional - will auto-detect if not provided
  title="Product Feedback Form"
  greetingText="Help us improve our product"
  color="#10B981"
  onSuccess={(data) => console.log('Feedback submitted:', data)}
/>
```

### 3. Floating Widget

```tsx
import FeedbackWidget from '@/components/forms/FeedbackWidget';

<FeedbackWidget
  projectId="your-project-id" // Optional - will auto-detect if not provided
  title="Share your feedback with us!"
  color="#3B82F6"
  greetingText="Welcome, tell us what's on your mind"
  formType="both" // 'csat', 'product', or 'both'
  defaultForm="csat" // 'csat' or 'product'
  onFeedbackSubmitted={(data) => console.log('Feedback submitted:', data)}
/>
```

### 4. Using Hooks Directly

```tsx
import { useProjectId } from '@/hooks/useProjectId';
import { useFeedbackSubmission } from '@/hooks/useFeedbackSubmission';

const MyComponent = () => {
  const { projectId, isValidating, isValid, error } = useProjectId();
  const { submitFeedback, isSubmitting } = useFeedbackSubmission();

  const handleSubmit = async () => {
    const result = await submitFeedback({
      projectId: projectId!,
      email: 'user@example.com',
      message: 'Great product!',
      rating: 5,
      formType: 'csat'
    });

    if (result.success) {
      console.log('Success:', result.data);
    }
  };

  // ... rest of component
};
```

## 🔧 Project ID Detection

The `useProjectId` hook automatically detects project ID from multiple sources in this order:

1. **URL Parameters**: `/:projectId` route parameter
2. **URL Search Params**: `?project_id=...` query parameter
3. **Data Attributes**: `data-project-id` attribute on any element
4. **Session Storage**: `notex_project_id` in sessionStorage
5. **Local Storage**: `notex_project_id` in localStorage (fallback)

### Data Attribute Usage

```html
<!-- Add this to your HTML -->
<div data-project-id="your-project-id">
  <!-- Your content -->
</div>
```

## 📊 Database Schema

The forms insert data into the existing `feedbacks` table:

```sql
CREATE TABLE public.feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  user_email text,
  content text NOT NULL,
  sentiment text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

### Metadata Structure

```json
{
  "form_type": "csat" | "product",
  "page_url": "https://example.com/page",
  "browser": {
    "userAgent": "Mozilla/5.0...",
    "language": "en-US",
    "platform": "Win32",
    "cookieEnabled": true,
    "onLine": true,
    "screenResolution": "1920x1080",
    "timezone": "America/New_York",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "rating": 5, // For CSAT forms only
  "feedback_type": "Bug Report", // For product forms only
  "would_recommend": true, // For product forms only
  "features": ["UI", "Performance"] // For product forms only
}
```

## 🎨 Styling and Customization

### Color Customization

All forms accept a `color` prop for consistent theming:

```tsx
<CSATForm color="#FF6B6B" /> // Custom red
<ProductFeedbackForm color="#4ECDC4" /> // Custom teal
<FeedbackWidget color="#45B7D1" /> // Custom blue
```

### CSS Classes

Forms use Tailwind CSS with isolated styling. Key classes:

- `.feedback-form-container`: Main form wrapper
- `.feedback-form-header`: Form header section
- `.feedback-form-content`: Form content area
- `.feedback-rating-stars`: Star rating component
- `.feedback-submit-button`: Submit button styling

## 🔒 Security and Validation

### Client-Side Validation
- Required fields validation
- Email format validation
- Rating range validation (1-5)
- Message length validation

### Server-Side Security
- RLS policies ensure users can only access their own project feedback
- Project ID validation against existing projects
- SQL injection protection via Supabase client
- Rate limiting handled by Supabase

### Error Handling
- Network error recovery
- Invalid project ID handling
- Form validation errors
- Graceful degradation for missing features

## 📱 Responsive Design

Forms are fully responsive and work on:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

Key responsive features:
- Flexible grid layouts
- Touch-friendly buttons and inputs
- Optimized spacing for small screens
- Readable typography at all sizes

## 🔄 Real-time Updates

The forms automatically trigger real-time updates to the feedback management page through Supabase subscriptions:

```tsx
// Existing real-time subscription in Feedback.tsx
const channel = supabase
  .channel('feedback-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'feedbacks',
    filter: `project_id=eq.${project.id}`
  }, (payload) => {
    loadFeedback(); // Reload all feedback when any change occurs
  })
  .subscribe();
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] Project ID detection from URL parameters
- [ ] Project ID detection from search params
- [ ] Project ID detection from data attributes
- [ ] Form validation (required fields)
- [ ] CSAT rating functionality
- [ ] Product feedback categorization
- [ ] Email validation
- [ ] Success toast notifications
- [ ] Error handling for invalid project IDs
- [ ] Responsive design on mobile/tablet
- [ ] Floating widget minimize/maximize
- [ ] Real-time updates in feedback page

### Test URLs

```
# CSAT Survey
/feedback/csat/:projectId
/feedback/csat?project_id=your-project-id

# Product Feedback
/feedback/product/:projectId
/feedback/product?project_id=your-project-id

# Demo Page
/feedback/demo
```

## 🚀 Deployment

### Environment Variables

Ensure these environment variables are set:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

The forms use the existing `feedbacks` table. No additional database setup is required.

### Build Process

```bash
npm run build
```

The forms are included in the main bundle and don't require separate deployment.

## 📈 Analytics and Tracking

### Session Tracking
- Auto-generated UUID for each feedback submission
- Stored in sessionStorage for persistence
- Included in metadata for analysis

### Browser Information
- User agent, language, platform
- Screen resolution and timezone
- Online status and cookie support
- Timestamp of submission

### Form Analytics
- Form type (CSAT vs Product)
- Rating distribution (for CSAT)
- Feature categories (for Product)
- Recommendation rates (for Product)

## 🔧 Troubleshooting

### Common Issues

1. **Project ID not detected**
   - Check URL parameters or add `data-project-id` attribute
   - Verify project exists in database
   - Check browser console for errors

2. **Form submission fails**
   - Check Supabase connection
   - Verify RLS policies
   - Check network connectivity

3. **Styling issues**
   - Ensure Tailwind CSS is loaded
   - Check for CSS conflicts
   - Verify component imports

4. **Real-time updates not working**
   - Check Supabase subscription status
   - Verify project ID matches
   - Check browser console for errors

### Debug Mode

Enable debug logging by setting:

```tsx
// In development
localStorage.setItem('debug', 'true');
```

This will log detailed information about:
- Project ID detection
- Form submission process
- Metadata collection
- Error states

## 📝 API Reference

### useProjectId Hook

```tsx
interface ProjectIdResult {
  projectId: string | null;
  isValidating: boolean;
  isValid: boolean;
  error: string | null;
}

const { projectId, isValidating, isValid, error } = useProjectId();
```

### useFeedbackSubmission Hook

```tsx
interface FeedbackSubmissionData {
  projectId: string;
  email?: string;
  message: string;
  rating?: number; // For CSAT forms only
  formType: 'csat' | 'product';
  metadata?: Record<string, any>;
}

interface FeedbackSubmissionResult {
  success: boolean;
  data?: any;
  error?: string;
}

const { submitFeedback, isSubmitting } = useFeedbackSubmission();
```

### Form Components Props

```tsx
interface FormProps {
  projectId?: string;           // Optional - auto-detected if not provided
  title?: string;               // Form title
  greetingText?: string;        // Subtitle/description
  color?: string;               // Theme color (hex)
  onSuccess?: (data: any) => void; // Success callback
  className?: string;           // Additional CSS classes
}
```

## 🎯 Future Enhancements

### Planned Features
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Email notifications for feedback
- [ ] Sentiment analysis integration
- [ ] Feedback categorization AI
- [ ] Export functionality
- [ ] Advanced filtering and search
- [ ] Feedback response system

### Integration Opportunities
- [ ] Slack notifications
- [ ] Zapier integration
- [ ] Webhook support
- [ ] API endpoints for external access
- [ ] Mobile app integration

---

## 📞 Support

For questions or issues with the feedback forms implementation:

1. Check this documentation first
2. Review the demo page at `/feedback/demo`
3. Check browser console for errors
4. Verify Supabase connection and permissions
5. Test with different project IDs and scenarios

The implementation is designed to be robust, user-friendly, and maintainable. All forms follow the same patterns and can be easily extended or customized for specific needs.