# Notex Feedback System

A comprehensive feedback collection system with customizable widgets, forms, and analytics.

## 🚀 Features

### 1. **Enhanced Feedback Widget**
- Floating widget with customizable appearance
- Form type selection (CSAT or Product Feedback)
- Minimizable and resizable interface
- Real-time settings from database
- Success animations and user feedback

### 2. **Customer Satisfaction Survey (CSAT)**
- 5-star rating system with hover effects
- Email collection (optional)
- Detailed feedback text area
- Sentiment analysis integration
- Mobile-responsive design

### 3. **Product Feedback Form**
- Feature request collection
- Bug report functionality
- User experience feedback
- Categorization and tagging
- Anonymous or identified submissions

### 4. **Standalone Feedback Page**
- Full-page responsive design
- Direct URL access
- Customizable branding
- Form type selection
- Success animations

### 5. **Embeddable JavaScript Widget**
- One-line integration
- Customizable appearance
- No external dependencies
- Cross-browser compatibility
- Mobile-friendly

## 📁 File Structure

```
src/
├── components/forms/
│   ├── EnhancedFeedbackWidget.tsx    # Main floating widget
│   ├── CSATForm.tsx                 # Customer satisfaction form
│   └── ProductFeedbackForm.tsx      # Product feedback form
├── pages/
│   ├── Feedback.tsx                 # Feedback management dashboard
│   ├── FeedbackSettings.tsx         # Widget configuration
│   ├── StandaloneFeedback.tsx       # Standalone feedback page
│   └── FeedbackTest.tsx             # Testing and preview page
├── hooks/
│   ├── useFeedbackForms.ts          # Form submission logic
│   └── useFeedbackSettings.ts       # Settings management
└── integrations/supabase/
    └── types.ts                     # Database type definitions

public/
└── feedback-widget.js               # Embeddable JavaScript widget
```

## 🗄️ Database Schema

### Feedback Table
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  user_email TEXT,
  content TEXT NOT NULL,
  sentiment TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Feedback Settings Table
```sql
CREATE TABLE feedback_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id TEXT NOT NULL,
  widget_title TEXT,
  widget_color TEXT,
  greeting_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🛠️ Setup Instructions

### 1. Database Setup
Run the SQL script to fix the database schema:
```bash
psql -f fix_feedback_schema.sql
```

### 2. Environment Variables
Ensure your Supabase configuration is properly set up in your environment.

### 3. Component Integration

#### Basic Widget Integration
```tsx
import EnhancedFeedbackWidget from '@/components/forms/EnhancedFeedbackWidget';

function App() {
  return (
    <div>
      {/* Your app content */}
      <EnhancedFeedbackWidget 
        projectId="your-project-id"
        onFeedbackSubmitted={(feedback) => {
          console.log('Feedback received:', feedback);
        }}
      />
    </div>
  );
}
```

#### Standalone Page
```tsx
import StandaloneFeedback from '@/pages/StandaloneFeedback';

// Route: /feedback/:projectId
<Route path="/feedback/:projectId" element={<StandaloneFeedback />} />
```

#### JavaScript Embed
```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://your-domain.com/feedback-widget.js';
    script.setAttribute('data-project-id', 'your-project-id');
    script.setAttribute('data-widget-color', '#3B82F6');
    script.setAttribute('data-widget-title', 'Share your feedback with us!');
    script.setAttribute('data-greeting-text', 'Welcome, tell us what\'s on your mind');
    document.head.appendChild(script);
  })();
</script>
```

## 🎨 Customization

### Widget Appearance
- **Color**: Set `widget_color` in feedback_settings table
- **Title**: Customize `widget_title` 
- **Greeting**: Modify `greeting_text`
- **Position**: Configure in JavaScript widget

### Form Types
- **CSAT**: Customer satisfaction with rating system
- **Product**: Feature requests and bug reports
- **Both**: Form type selection interface

### Styling
All components use Tailwind CSS classes and can be customized:
- Color schemes
- Typography
- Spacing and layout
- Responsive breakpoints

## 📊 Analytics & Data

### Feedback Data Structure
```typescript
interface FeedbackEntry {
  id: string;
  project_id: string;
  user_email: string | null;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  metadata: {
    form_type: 'csat' | 'product' | 'widget';
    rating?: number;
    page_url?: string;
    browser?: object;
    session_id?: string;
  };
  created_at: string;
}
```

### Sentiment Analysis
- Automatic sentiment detection
- Rating-based sentiment scoring
- Keyword analysis
- Trend tracking

## 🔧 API Endpoints

### Submit Feedback
```typescript
POST /api/feedback
Content-Type: application/json

{
  "project_id": "string",
  "user_email": "string (optional)",
  "content": "string",
  "rating": "number (optional)",
  "metadata": "object"
}
```

### Get Feedback Settings
```typescript
GET /api/feedback-settings?project_id=string
```

## 🧪 Testing

### Test Page
Visit `/feedback-test` to test all components:
- Widget functionality
- Form submissions
- Standalone page
- Embed code generation

### Manual Testing
1. **Widget Test**: Click the floating button
2. **Form Test**: Submit both CSAT and Product forms
3. **Standalone Test**: Open direct feedback URL
4. **Embed Test**: Copy and test embed code

## 🚀 Deployment

### Production Checklist
- [ ] Database schema updated
- [ ] Environment variables configured
- [ ] Widget JavaScript file deployed
- [ ] API endpoints functional
- [ ] CORS settings configured
- [ ] SSL certificate installed

### Performance Optimization
- Lazy loading for components
- Image optimization
- CDN for static assets
- Database indexing
- Caching strategies

## 🔒 Security

### Data Protection
- Email validation
- Content sanitization
- Rate limiting
- CORS configuration
- SQL injection prevention

### Privacy Features
- Anonymous submissions
- Data retention policies
- GDPR compliance
- User consent management

## 📈 Monitoring

### Key Metrics
- Feedback submission rate
- Form completion rate
- Sentiment distribution
- Response time
- Error rates

### Alerts
- High error rates
- Failed submissions
- Database issues
- Performance degradation

## 🤝 Support

### Troubleshooting
1. **Widget not appearing**: Check project ID and JavaScript console
2. **Forms not submitting**: Verify database connection and API endpoints
3. **Styling issues**: Check Tailwind CSS configuration
4. **Database errors**: Run schema fix script

### Common Issues
- **CORS errors**: Configure Supabase CORS settings
- **Authentication**: Ensure proper RLS policies
- **Performance**: Check database indexes and queries

## 📝 License

This feedback system is part of the Notex platform and follows the same licensing terms.

---

For more information, visit the [Notex Documentation](https://docs.notex.com) or contact support.