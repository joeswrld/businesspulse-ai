# NoteX Billing System

A comprehensive billing and usage tracking system for NoteX, built with React, Supabase, and Paystack integration.

## 🏗️ Architecture Overview

The billing system consists of:

1. **Frontend**: React components with TypeScript
2. **Backend**: Supabase database with PostgreSQL
3. **Payment Processing**: Paystack integration
4. **API Endpoints**: Next.js API routes
5. **Usage Tracking**: Real-time usage monitoring

## 📁 File Structure

```
src/
├── pages/
│   ├── Billing.tsx                    # Main billing page component
│   └── api/
│       ├── cancel-subscription.ts     # Cancel subscription API
│       └── paystack/
│           └── update-card.ts         # Update payment method API
├── hooks/
│   └── useUsageTracking.ts            # Usage tracking hook
└── components/
    └── examples/
        └── UsageTrackingExample.tsx   # Usage examples

Database/
├── create_usage_tracking_table.sql    # Usage tracking table
├── create_increment_usage_function.sql # Usage increment function
└── create_transactions_table.sql      # Transactions table
```

## 🚀 Features

### ✅ **Current Usage Tracking**
- Real-time usage counters for all features
- Visual usage cards with icons and colors
- Teams feature marked as "Coming Soon"

### ✅ **Subscription Management**
- Plan status display (Free Trial, Pro, Cancelled)
- Trial days calculation (8-day trial period)
- Subscription cancellation
- Payment method updates

### ✅ **Transaction History**
- Complete payment history
- Invoice downloads
- Status tracking (Success, Pending, Failed)
- Currency formatting (NGN support)

### ✅ **Professional UI**
- Clean, minimal design with Tailwind CSS
- Loading skeletons and error states
- Responsive grid layout
- Lovable UI components integration

## 🗄️ Database Schema

### Usage Tracking Table
```sql
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    feedback_count INTEGER DEFAULT 0,
    analytics_count INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    insights_count INTEGER DEFAULT 0,
    teams_count INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Subscription Plans
The system supports multiple subscription tiers:
- **Free Plan**: Basic features with limitations
- **Pro Plan**: Advanced features for individuals
- **Business Plan**: Team features and advanced analytics
- **Enterprise Plan**: Custom solutions for large organizations

### Transactions Table
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    paystack_transaction_id VARCHAR(255) UNIQUE,
    amount INTEGER, -- Amount in kobo
    currency VARCHAR(3) DEFAULT 'NGN',
    status VARCHAR(20) CHECK (status IN ('success', 'pending', 'failed')),
    description TEXT,
    invoice_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 🔧 Setup Instructions

### 1. Database Setup

Run the SQL migrations in order:

```bash
# 1. Create usage tracking table
psql -d your_database -f create_usage_tracking_table.sql

# 2. Create increment usage function
psql -d your_database -f create_increment_usage_function.sql

# 3. Create transactions table
psql -d your_database -f create_transactions_table.sql
```

### 2. Environment Variables

Add these to your `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Paystack
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

### 3. Supabase Edge Function

Deploy the usage tracking function:

```bash
supabase functions deploy usage
```

## 📊 Usage Tracking

### Basic Usage
```tsx
import { useUsageTracking } from '@/hooks/useUsageTracking';

function MyComponent() {
  const { trackUsage, loading, error, success } = useUsageTracking();

  const handleAction = async () => {
    await trackUsage("feedback");
  };

  return (
    <button onClick={handleAction} disabled={loading}>
      {loading ? 'Tracking...' : 'Submit Feedback'}
    </button>
  );
}
```

### Available Actions
- `"feedback"` - Track feedback submissions
- `"analytics"` - Track analytics queries
- `"reports"` - Track report generation
- `"insights"` - Track insights access
- `"teams"` - Track team interactions (placeholder)

## 💳 Payment Integration

### Cancel Subscription
```tsx
const handleCancel = async () => {
  const response = await fetch('/api/cancel-subscription', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subscriptionId: subscription.id }),
  });
};
```

### Update Payment Method
```tsx
const handleUpdateCard = async () => {
  const response = await fetch('/api/paystack/update-card', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  const { url } = await response.json();
  window.open(url, '_blank');
};
```

## 🎨 UI Components

### Usage Cards
Each usage metric is displayed in a colored card:
- **Feedback**: Blue theme
- **Analytics**: Green theme
- **Reports**: Purple theme
- **Insights**: Orange theme
- **Teams**: Gray theme (Coming Soon)

### Plan Status Badges
- **Free Trial**: Blue badge with trial days
- **Pro Plan**: Green badge
- **Business Plan**: Gold/Amber badge
- **Enterprise Plan**: Purple badge
- **Cancelled**: Gray badge
- **Payment Due**: Yellow badge

### Transaction Table
- Date formatting
- Currency formatting (NGN)
- Status icons and colors
- Invoice download buttons

## 🔒 Security Features

### Row Level Security (RLS)
All tables have RLS policies ensuring users can only access their own data:

```sql
-- Users can only view their own transactions
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (user_id = auth.uid());
```

### Authentication
- JWT-based authentication with Supabase
- Automatic token validation in API routes
- Secure session management

### Input Validation
- TypeScript interfaces for all data structures
- Server-side validation in API endpoints
- SQL injection prevention with parameterized queries

## 📱 Responsive Design

The billing page is fully responsive:

- **Mobile**: Single column layout
- **Tablet**: Two column grid
- **Desktop**: Three column grid with usage cards spanning 2 columns

## 🧪 Testing

### Component Testing
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import BillingPage from '@/pages/Billing';

test('displays usage data correctly', () => {
  render(<BillingPage />);
  expect(screen.getByText('Current Usage')).toBeInTheDocument();
});
```

### Hook Testing
```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useUsageTracking } from '@/hooks/useUsageTracking';

test('tracks usage successfully', async () => {
  const { result } = renderHook(() => useUsageTracking());
  
  await act(async () => {
    await result.current.trackUsage('feedback');
  });
  
  expect(result.current.success).toBe(true);
});
```

## 🚨 Error Handling

### Frontend Errors
- Loading states with skeletons
- Error alerts with descriptive messages
- Graceful fallbacks for missing data

### Backend Errors
- Comprehensive error logging
- User-friendly error messages
- Proper HTTP status codes

### Network Errors
- Retry mechanisms for failed requests
- Offline state handling
- Connection error notifications

## 📈 Performance Optimizations

### Database
- Indexed queries for fast lookups
- Efficient joins and filters
- Connection pooling

### Frontend
- React.memo for expensive components
- useCallback for stable references
- Lazy loading for large datasets

### Caching
- Supabase real-time subscriptions
- Client-side state management
- Optimistic updates

## 🔄 State Management

### Local State
- Component-level state for UI interactions
- Loading and error states
- Form data management

### Global State
- User authentication state
- Subscription status
- Usage data caching

## 📊 Analytics & Monitoring

### Usage Analytics
- Real-time usage tracking
- Feature adoption metrics
- User behavior insights

### Error Monitoring
- Console error logging
- API error tracking
- Performance monitoring

## 🔮 Future Enhancements

### Planned Features
- [ ] Usage limits and quotas
- [ ] Advanced billing analytics
- [ ] Multi-currency support
- [ ] Automated invoicing
- [ ] Subscription upgrades/downgrades
- [ ] Team billing management

### Technical Improvements
- [ ] Webhook integration for real-time updates
- [ ] Advanced caching strategies
- [ ] Performance optimizations
- [ ] Enhanced error handling
- [ ] Comprehensive testing suite

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit pull request

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Conventional commits

## 📞 Support

For questions or issues:

1. Check the documentation
2. Review existing issues
3. Create a new issue with details
4. Contact the development team

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.