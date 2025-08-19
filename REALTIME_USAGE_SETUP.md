# 🚀 Real-Time Usage Tracking Setup Guide

This guide will help you set up the real-time usage tracking system for your NoteX BI platform.

## 📋 Prerequisites

- Supabase project with Edge Functions enabled
- Supabase CLI installed and configured
- Access to your Supabase project dashboard

## 🗄️ Database Setup

### 1. Run the Migration

Execute the SQL migration to create the necessary tables and functions:

```bash
# Copy the migration file to your Supabase project
supabase db push
```

Or manually run the SQL from `supabase/migrations/20241201000000_create_usage_tracking.sql` in your Supabase SQL editor.

### 2. Verify Tables Created

After running the migration, you should see these new tables:

- `user_subscriptions` - User subscription plans and status
- `usage_limits` - Plan-specific usage limits
- `user_usage` - Daily usage tracking per user
- `usage_events` - Detailed usage event logging

## 🔧 Edge Function Deployment

### 1. Deploy the Usage Tracking Function

```bash
# Navigate to your Supabase project directory
cd supabase

# Deploy the usageTracking function
supabase functions deploy usageTracking
```

### 2. Set Environment Variables

In your Supabase dashboard, go to Settings > Edge Functions and ensure these environment variables are set:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

## 🎯 Usage Tracking Features

### Real-Time Monitoring

The system automatically tracks:

- **AI Insights**: Generated insights count
- **Data Sources**: Connected data sources
- **Team Members**: Active team members
- **AI Reports**: Generated executive reports
- **Business Analytics**: Analytics usage

### Automatic Limit Enforcement

- **Usage Warnings**: Visual indicators at 75% usage
- **Critical Alerts**: Red badges at 90% usage
- **Feature Gating**: Automatic enforcement when limits exceeded
- **Real-Time Updates**: Live usage monitoring via Supabase Realtime

### Plan-Based Limits

| Plan | AI Insights | Data Sources | Team Members | AI Reports | Analytics |
|------|-------------|--------------|--------------|------------|-----------|
| Free Trial | 20 total | 1 | 1 | 2 | 1 |
| Pro | 500/month | 5 | 5 | 20/month | 5 |
| Business | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |

## 🔌 Integration Points

### 1. Frontend Hook

Use the `useUsageTracking` hook in your React components:

```typescript
import { useUsageTracking } from '@/hooks/useUsageTracking';

const MyComponent = () => {
  const { 
    usage, 
    checkUsage, 
    incrementUsage, 
    getUsagePercentage,
    getUsageStatus 
  } = useUsageTracking();

  // Check if user can perform action
  const canGenerateInsight = await checkUsage('ai_insights', 1);
  
  // Increment usage when action is performed
  if (canGenerateInsight) {
    await incrementUsage('ai_insights', 1);
  }
};
```

### 2. Usage Checking

Before performing any action, check if the user has remaining quota:

```typescript
// Check if user can generate an AI insight
const canGenerate = await checkUsage('ai_insights', 1);

if (!canGenerate) {
  toast.error('AI Insights limit reached. Please upgrade your plan.');
  return;
}

// Proceed with action
await generateAIInsight();
await incrementUsage('ai_insights', 1);
```

### 3. Real-Time Updates

The system automatically updates usage in real-time:

- **Supabase Realtime**: Live updates when usage changes
- **Auto-refresh**: Usage data refreshes every 5 minutes
- **Cross-tab sync**: Usage updates sync across browser tabs
- **Visual indicators**: Real-time progress bars and status badges

## 🎨 UI Components

### Usage Display

The Billing page automatically shows:

- **Current Usage**: Real-time usage counts
- **Progress Bars**: Visual usage indicators
- **Status Badges**: Normal/Warning/Critical status
- **Remaining Quota**: Available usage remaining
- **Plan Limits**: Current plan restrictions

### Status Indicators

- 🟢 **Normal**: 0-74% usage
- 🟡 **Warning**: 75-89% usage  
- 🔴 **Critical**: 90-100% usage

## 🚨 Error Handling

### Fallback Mechanisms

The system includes robust fallbacks:

- **Supabase Fallback**: Falls back to localStorage if Supabase unavailable
- **Graceful Degradation**: Continues working even if tracking fails
- **User Notifications**: Clear error messages and usage warnings
- **Automatic Recovery**: Self-healing when services restore

### Common Issues

1. **Edge Function Not Found**
   - Ensure `usageTracking` function is deployed
   - Check function name spelling

2. **Permission Denied**
   - Verify RLS policies are correctly set
   - Check user authentication status

3. **Usage Not Updating**
   - Verify real-time subscriptions are active
   - Check browser console for errors

## 🔍 Monitoring & Debugging

### Console Logging

The system logs all usage events:

```typescript
// Check browser console for:
console.log('Usage changed:', payload);
console.log('Subscription changed:', payload);
console.log('Error fetching usage:', error);
```

### Supabase Dashboard

Monitor usage in real-time:

1. Go to your Supabase dashboard
2. Navigate to Table Editor
3. View `user_usage` table for current usage
4. Check `usage_events` for detailed logging

### Usage Analytics

Track usage patterns:

```sql
-- Get user usage summary
SELECT * FROM get_user_usage('user-uuid-here');

-- Check usage events
SELECT * FROM usage_events WHERE user_id = 'user-uuid-here';
```

## 🚀 Testing

### 1. Test Usage Tracking

```typescript
// Test usage increment
const success = await incrementUsage('ai_insights', 1);
console.log('Usage incremented:', success);

// Test usage check
const canPerform = await checkUsage('ai_insights', 1);
console.log('Can perform action:', canPerform);
```

### 2. Test Real-Time Updates

1. Open Usage & Billing page in two browser tabs
2. Generate an AI insight in one tab
3. Watch usage update in real-time in both tabs

### 3. Test Limit Enforcement

1. Generate insights until you reach your limit
2. Verify that further actions are blocked
3. Check that appropriate error messages are shown

## 🔒 Security Features

### Row Level Security (RLS)

All tables are protected with RLS policies:

- Users can only access their own data
- Usage data is isolated per user
- No cross-user data leakage possible

### Authentication Required

- All usage tracking requires valid user session
- Unauthenticated requests are rejected
- User ID validation prevents impersonation

## 📈 Performance Optimization

### Database Indexes

Optimized queries with proper indexing:

- `idx_user_usage_user_id_date` - Fast user usage lookups
- `idx_usage_events_user_id` - Efficient event tracking
- `idx_usage_events_created_at` - Time-based queries

### Caching Strategy

- **Local State**: React state for immediate updates
- **Real-Time Sync**: Supabase Realtime for live updates
- **Periodic Refresh**: 5-minute intervals for data consistency

## 🎯 Next Steps

### Immediate Actions

1. ✅ Deploy the database migration
2. ✅ Deploy the Edge Function
3. ✅ Test basic functionality
4. ✅ Verify real-time updates

### Future Enhancements

- **Usage Analytics Dashboard**: Detailed usage insights
- **Automated Alerts**: Email/Teams notifications
- **Usage Forecasting**: Predictive usage patterns
- **Advanced Reporting**: Executive usage summaries

## 🆘 Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify Supabase Edge Function logs
3. Check database table permissions
4. Ensure all environment variables are set

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [React Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)

---

**🎉 Congratulations!** Your platform now has enterprise-grade real-time usage tracking with automatic limit enforcement.