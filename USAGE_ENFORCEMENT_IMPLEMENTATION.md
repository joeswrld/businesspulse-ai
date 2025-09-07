# Usage Enforcement System Implementation

This document describes the new usage enforcement system for NoteX that tracks actual row counts from source tables and enforces plan limits in real-time.

## Overview

The new system consists of:

1. **`usage_counters` table** - Tracks actual row counts from source tables
2. **RPC functions** - For checking, enforcing, and refreshing usage
3. **Billing components** - Shows subscription management and plan comparison
4. **Updated hooks** - Integration with existing billing system

## Database Schema

### Tables

#### `usage_counters`
```sql
CREATE TABLE usage_counters (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_count INT DEFAULT 0,
  insights_count INT DEFAULT 0,
  analytics_count INT DEFAULT 0,
  reports_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `plans`
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  limits JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RPC Functions

#### `refresh_usage_for_user(p_user_id UUID)`
Refreshes usage counters from source tables:
- `feedbacks` → `feedback_count`
- `insights` → `insights_count`
- `analytics_daily` → `analytics_count`
- `analytics_history` → `reports_count`

#### `check_and_consume_usage(p_user_id UUID, p_kind TEXT)`
Checks if user can consume a feature and enforces limits:
- Returns `true` if usage is allowed
- Returns `false` if limit is reached
- Automatically refreshes counters before checking

#### `get_user_usage_summary(p_user_id UUID)`
Returns comprehensive usage summary with:
- Current plan and limits
- Actual usage counts
- Remaining usage for each feature

## Frontend Components

### Billing Components

The billing system includes:
- Subscription management and plan comparison
- Transaction history and receipts
- Plan upgrade and cancellation options
- Professional UI with responsive design

**Location**: `src/pages/Billing.tsx` and `src/components/billing/`

**Usage**:
```tsx
// The billing page is accessible via routing
// No additional imports needed
```

## Integration with Existing System

### New Functions in `usageEnforcement.ts`

The following new functions have been added to maintain backward compatibility:

- `checkUsageWithCounters(userId, feature)` - Check usage using new system
- `getUsageSummaryWithCounters(userId)` - Get usage summary using new system
- `refreshUsageCounters(userId)` - Refresh usage counters
- `enforceUsageLimitWithCounters(userId, feature, onLimitReached)` - Enforce limits using new system

### Usage in Existing Code

To use the new system in existing code:

```tsx
import { 
  enforceUsageLimitWithCounters,
  checkUsageWithCounters 
} from '@/lib/usageEnforcement';

// Before creating feedback
const canCreateFeedback = await enforceUsageLimitWithCounters(
  userId, 
  'feedback',
  () => {
    // Handle limit reached
    console.log('Feedback limit reached');
  }
);

if (canCreateFeedback) {
  // Create feedback
  await createFeedback(data);
}
```

## Real-World Usage Flow

### 1. User Action
When a user tries to create feedback, insights, analytics, or reports:

```tsx
// Check usage before allowing action
const canProceed = await enforceUsageLimitWithCounters(userId, 'feedback');

if (canProceed) {
  // Allow action
  await createFeedback(feedbackData);
} else {
  // Show upgrade prompt (handled by enforceUsageLimitWithCounters)
}
```

### 2. Usage Enforcement
The system:
1. Calls `check_and_consume_usage` RPC function
2. Refreshes counters from source tables
3. Checks current usage against plan limits
4. Returns `true`/`false` based on limits

### 3. UI Updates
- Billing page shows subscription management
- Plan comparison displays available options
- Upgrade prompts appear for plan changes
- Real-time refresh capability

## Plan Limits

### Free Trial
- Feedback: 50 responses
- Insights: 5 AI insights
- Analytics: 5 reports
- Reports: 2 detailed reports

### Pro Plan
- Feedback: 300 responses
- Insights: 50 AI insights
- Analytics: 100 reports
- Reports: 20 detailed reports

### Business Plan
- All features: Unlimited (-1)

## Migration

### Running the Migration

1. Apply the SQL migration:
```bash
supabase db reset
# or manually run the migration file
```

2. The migration will:
   - Create new tables
   - Insert default plans
   - Create RPC functions
   - Set up RLS policies
   - Initialize usage counters for existing users

### Data Consistency

The system automatically:
- Creates usage counter records for new users
- Refreshes counters when checking usage
- Maintains consistency between source tables and counters

## Testing

### Manual Testing

1. Create a new user (should get free trial limits)
2. Try to exceed limits (should see upgrade prompts)
3. Upgrade plan (should see new limits)
4. Check billing page (should show subscription management)

### RPC Function Testing

```sql
-- Test usage summary
SELECT * FROM get_user_usage_summary('user-uuid-here');

-- Test usage check
SELECT check_and_consume_usage('user-uuid-here', 'feedback');

-- Test counter refresh
SELECT refresh_usage_for_user('user-uuid-here');
```

## Benefits

1. **Real-time accuracy** - Counts actual rows from source tables
2. **Automatic sync** - Counters refresh automatically
3. **Plan enforcement** - Hard limits prevent abuse
4. **User experience** - Clear usage visibility and upgrade paths
5. **Scalability** - Efficient database queries and caching

## Future Enhancements

1. **Webhook integration** - Real-time updates when data changes
2. **Usage analytics** - Historical usage trends
3. **Custom limits** - Per-user limit overrides
4. **Usage notifications** - Alerts when approaching limits
5. **Bulk operations** - Batch usage checking for multiple features
