# Usage Overview System - NoteX Platform

## 🎯 Overview

The Usage Overview system provides real-time tracking of user feature usage against their subscription plan limits. It integrates seamlessly with the billing system and enforces access controls across the platform.

## ✨ Features

### 📊 **Real-time Usage Tracking**
- Live counts from source tables (`feedbacks`, `insights_simple`, `analytics`, `reports`)
- Monthly usage reset functionality
- Automatic refresh every 30 seconds
- Manual refresh capability

### 🎨 **Professional UI**
- Four feature cards with progress bars
- Plan information display (name, price, renewal date)
- Visual status indicators (good, warning, limit reached)
- Responsive design with Tailwind CSS + shadcn/ui

### 🔒 **Access Control**
- Trial expiration handling (8 days)
- Plan-based limits enforcement
- Feature-specific access blocking
- Upgrade prompts when limits reached

### 📈 **Plan Limits**

| Feature | Trial (8 days) | Pro Plan | Business Plan |
|---------|----------------|----------|---------------|
| Feedback Collection | 50 | 300 | Unlimited |
| AI Insights | 10 | 50 | Unlimited |
| Analytics Reports | 10 | 100 | Unlimited |
| Detailed Reports | 5 | 20 | Unlimited |

## 🏗️ Architecture

### **Frontend Components**

#### `useUsageOverview` Hook
```typescript
const { data, loading, refreshing, error, refresh } = useUsageOverview(userId);
```

**Features:**
- Fetches subscription data from `subscriptions` table
- Gets live usage counts from source tables
- Calculates remaining usage and percentages
- Handles trial expiration logic
- Auto-refresh every 30 seconds

#### `UsageOverview` Component
```tsx
<UsageOverview 
  userId={user?.id || ''}
  onUpgrade={(plan) => handleUpgradeClick(plan)}
  refreshTrigger={usageRefreshTrigger}
/>
```

**Features:**
- Displays current plan information
- Shows four feature cards with progress bars
- Handles trial expired state
- Shows upgrade prompts when needed
- Manual refresh button

#### `FeatureGuard` Component
```tsx
<FeatureGuard userId={userId} featureType="feedback">
  <YourFeatureComponent />
</FeatureGuard>
```

**Features:**
- Protects features based on usage limits
- Shows access denied messages
- Provides upgrade options
- Can be used as HOC or hook

### **Backend (Supabase)**

#### Database Tables

**`usage_counters`**
```sql
- user_id (UUID, FK to auth.users)
- month_start (DATE)
- feedback_count (INTEGER)
- insights_count (INTEGER)
- analytics_count (INTEGER)
- reports_count (INTEGER)
```

**`subscriptions`**
```sql
- user_id (UUID, FK to auth.users)
- plan_type (TEXT: 'trial', 'pro', 'business')
- renewal_date (TIMESTAMP)
- trial_start (TIMESTAMP)
- trial_end (TIMESTAMP)
- is_active (BOOLEAN)
```

#### SQL Functions

**`refresh_user_usage(user_uuid, month_start)`**
- Recalculates usage counts for a user
- Updates `usage_counters` table
- Returns current usage data

**`check_usage_limit(user_uuid, feature_type)`**
- Checks if user can perform an action
- Returns boolean (true = allowed)
- Considers plan type and current usage

**`reset_monthly_usage()`**
- Resets usage counters for all users
- Called automatically at month start
- Creates new records for current month

## 🚀 Usage

### **1. Basic Integration**

Add to your billing page:
```tsx
import UsageOverview from '@/components/billing/UsageOverview';

// In your component
<UsageOverview 
  userId={user?.id || ''}
  onUpgrade={(plan) => handleUpgradeClick(plan)}
  refreshTrigger={usageRefreshTrigger}
/>
```

### **2. Feature Protection**

Protect individual features:
```tsx
import FeatureGuard from '@/components/FeatureGuard';

<FeatureGuard userId={userId} featureType="feedback">
  <FeedbackWidget />
</FeatureGuard>
```

Or use the hook:
```tsx
import { useFeatureAccess } from '@/components/FeatureGuard';

const { isAllowed, isLoading, reason } = useFeatureAccess(userId, 'feedback');

if (!isAllowed) {
  return <AccessDenied message={reason} />;
}
```

### **3. Manual Usage Refresh**

```tsx
import { refreshUserUsage } from '@/lib/usageEnforcement';

const handleRefresh = async () => {
  const success = await refreshUserUsage(userId);
  if (success) {
    toast.success('Usage data refreshed');
  }
};
```

## 🔧 Setup Instructions

### **1. Run Database Migration**

```bash
# Apply the migration in Supabase
supabase db push
```

### **2. Update Billing Page**

The UsageOverview component is already integrated into the billing page. It will automatically:
- Show current plan information
- Display usage cards with progress bars
- Handle trial expiration
- Provide upgrade options

### **3. Protect Features**

Wrap your feature components with `FeatureGuard`:

```tsx
// For feedback widgets
<FeatureGuard userId={userId} featureType="feedback">
  <FeedbackWidget />
</FeatureGuard>

// For insights page
<FeatureGuard userId={userId} featureType="insights">
  <InsightsPage />
</FeatureGuard>

// For analytics
<FeatureGuard userId={userId} featureType="analytics">
  <AnalyticsPage />
</FeatureGuard>

// For reports
<FeatureGuard userId={userId} featureType="reports">
  <ReportsPage />
</FeatureGuard>
```

## 🎨 UI Components

### **Usage Cards**

Each feature card shows:
- **Icon** - Visual representation of the feature
- **Name** - Feature name (e.g., "Feedback Collection")
- **Count** - Current usage (e.g., "25 / 50")
- **Progress Bar** - Visual percentage indicator
- **Status** - Good, Warning, or Limit Reached
- **Remaining** - How many uses left

### **Status Indicators**

- 🟢 **Good** - Under 60% usage
- 🟡 **Warning** - 60-80% usage
- 🟠 **Critical** - 80-90% usage
- 🔴 **Limit Reached** - 100% usage or trial expired

### **Trial Expired State**

When trial expires or limits are reached:
- Large warning icon
- Clear message explaining the situation
- Upgrade buttons for Pro and Business plans
- Blocks access to all features

## 🔄 Auto-Refresh

The system automatically refreshes usage data:
- **Every 30 seconds** - Background refresh
- **Manual refresh** - User-triggered via button
- **Plan changes** - When user upgrades/downgrades
- **Monthly reset** - At the start of each month

## 🧪 Testing

Run the integration test:
```bash
./test-usage-overview-integration.sh
```

This will verify:
- All components are created
- Integration with billing page
- SQL functions are implemented
- Enforcement logic works
- UI components render correctly

## 📝 API Reference

### **useUsageOverview Hook**

```typescript
interface UsageOverviewData {
  subscription: SubscriptionData;
  usage: UsageData;
  limits: PlanLimits;
  remaining: PlanLimits;
  percentages: PlanLimits;
  isTrialExpired: boolean;
  isLimitReached: PlanLimits;
  monthStart: string;
}

const { data, loading, refreshing, error, refresh } = useUsageOverview(userId);
```

### **checkFeatureAccess Function**

```typescript
interface UsageEnforcementResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

const result = await checkFeatureAccess(userId, 'feedback');
```

### **FeatureGuard Component Props**

```typescript
interface FeatureGuardProps {
  userId: string;
  featureType: 'feedback' | 'insights' | 'analytics' | 'reports';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgrade?: (plan: 'pro' | 'business') => void;
}
```

## 🚨 Error Handling

The system handles various error scenarios:
- **No subscription found** - Defaults to trial
- **Database errors** - Shows user-friendly messages
- **Network issues** - Graceful degradation
- **Invalid data** - Fallback to safe defaults

## 🔐 Security

- **Row Level Security (RLS)** - Users can only see their own data
- **Function Security** - All functions use `SECURITY DEFINER`
- **Input Validation** - All inputs are validated
- **Error Sanitization** - No sensitive data in error messages

## 📊 Performance

- **Efficient Queries** - Uses indexes and optimized SQL
- **Caching** - React state management for UI updates
- **Lazy Loading** - Components load data only when needed
- **Background Refresh** - Non-blocking updates

## 🎯 Future Enhancements

- **Usage Analytics** - Historical usage trends
- **Predictive Limits** - AI-powered usage predictions
- **Custom Limits** - Admin-configurable limits
- **Usage Alerts** - Email notifications for high usage
- **API Rate Limiting** - Backend enforcement of limits

---

## ✨ **Your NoteX platform now has a complete, production-ready usage overview system!** ✨

The system provides:
- ✅ Real-time usage tracking
- ✅ Plan-based access control
- ✅ Professional UI/UX
- ✅ Seamless billing integration
- ✅ Comprehensive error handling
- ✅ Security and performance optimization