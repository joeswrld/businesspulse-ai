# Usage Enforcement System Documentation

## 🎯 **Overview**

The NoteX platform implements strict usage enforcement to manage feature access based on user subscription plans. This system ensures users cannot exceed their plan limits and provides clear upgrade paths.

## 📋 **Plan Limits**

### **Free Trial Plan**
```typescript
{
  feedback: 20,    // 20 feedback submissions
  analytics: 5,    // 5 analytics reports
  reports: 2,      // 2 executive reports
  insights: 5,     // 5 AI insights
  teams: 1         // 1 team member
}
```

### **Pro Plan**
```typescript
{
  feedback: 500,   // 500 feedback submissions
  analytics: 100,  // 100 analytics reports
  reports: 20,     // 20 executive reports
  insights: 50,    // 50 AI insights
  teams: 5         // 5 team members
}
```

### **Business Plan**
```typescript
{
  feedback: -1,    // Unlimited
  analytics: -1,   // Unlimited
  reports: -1,     // Unlimited
  insights: -1,    // Unlimited
  teams: -1        // Unlimited
}
```

### **Enterprise Plan**
```typescript
{
  feedback: -1,    // Unlimited
  analytics: -1,   // Unlimited
  reports: -1,     // Unlimited
  insights: -1,    // Unlimited
  teams: -1        // Unlimited
}
```

## 🔧 **Core Functions**

### **1. Usage Checking**
```typescript
import { checkUsage, enforceUsageLimit } from '@/lib/usageEnforcement';

// Check if user can use a feature
const result = checkUsage('feedback', currentUsage, plan);
// Returns: { canUse: boolean, currentUsage: number, limit: number, ... }

// Enforce limit with UI feedback
const canUse = await enforceUsageLimit(userId, 'feedback', () => {
  // Callback when limit is reached
  console.log('Limit reached!');
});
```

### **2. React Hooks**
```typescript
import { useUsageEnforcement, useFeatureUsage } from '@/hooks/useUsageEnforcement';

// Main hook for all usage data
const {
  loading,
  usage,
  plan,
  limits,
  checks,
  canUseFeature,
  needsUpgrade,
  enforceLimit
} = useUsageEnforcement();

// Individual feature hook
const {
  canUse,
  currentUsage,
  limit,
  remaining,
  enforceLimit
} = useFeatureUsage('feedback');
```

## 🚀 **Implementation Examples**

### **Frontend Enforcement**

#### **Basic Usage Check**
```typescript
import { useUsageEnforcement } from '@/hooks/useUsageEnforcement';

const MyComponent = () => {
  const { canUseFeature, enforceLimit } = useUsageEnforcement();

  const handleSubmitFeedback = async () => {
    // Check if user can use feedback feature
    const canUse = await enforceLimit('feedback');
    
    if (!canUse) {
      // User will see upgrade prompt automatically
      return;
    }

    // Proceed with feedback submission
    await submitFeedback();
  };

  return (
    <Button 
      onClick={handleSubmitFeedback}
      disabled={!canUseFeature('feedback')}
    >
      Submit Feedback
    </Button>
  );
};
```

#### **Usage Display**
```typescript
import { formatUsageDisplay } from '@/lib/usageEnforcement';

const UsageDisplay = () => {
  const { usage, plan, checks } = useUsageEnforcement();

  return (
    <div>
      {Object.entries(checks).map(([feature, check]) => (
        <div key={feature} className={!check.canUse ? 'text-red-600' : ''}>
          {formatUsageDisplay(
            check.currentUsage,
            check.limit,
            plan,
            feature as any
          )}
        </div>
      ))}
    </div>
  );
};
```

#### **Upgrade Prompts**
```typescript
import { showUpgradePrompt } from '@/lib/usageEnforcement';

const handleLimitReached = () => {
  showUpgradePrompt('feedback', plan, currentUsage, limit);
  // Shows toast with upgrade button
};
```

### **Backend Enforcement**

#### **Edge Function Integration**
```typescript
// In your Edge Function or API route
import { checkUsageLimit, getUserPlan } from '@/lib/usageEnforcement';

const handleFeatureUsage = async (req, res) => {
  const { userId, feature } = req.body;
  
  // Get current usage and subscription
  const [usage, subscription] = await Promise.all([
    getUserUsage(userId),
    getUserSubscription(userId)
  ]);
  
  const plan = getUserPlan(subscription);
  const currentUsage = usage[`${feature}_count`];
  
  // Check limit before allowing usage
  if (!checkUsageLimit(feature, currentUsage, plan)) {
    return res.status(429).json({
      error: `Usage limit reached for ${feature}`
    });
  }
  
  // Proceed with feature usage
  await incrementUsage(userId, feature);
};
```

## 🎨 **UI Components**

### **Usage Cards**
```typescript
const UsageCard = ({ feature, check }) => (
  <Card className={!check.canUse ? 'border-red-200 bg-red-50' : ''}>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span className="capitalize">{feature}</span>
        <Badge variant={check.canUse ? 'default' : 'destructive'}>
          {check.canUse ? 'Available' : 'Limit Reached'}
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Progress value={(check.currentUsage / check.limit) * 100} />
      <div className="text-sm">
        {check.currentUsage} / {check.limit === -1 ? '∞' : check.limit}
      </div>
    </CardContent>
  </Card>
);
```

### **Upgrade Alerts**
```typescript
const UpgradeAlert = ({ needsUpgrade, featuresNeedingUpgrade }) => (
  needsUpgrade && (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div>
            <strong>Upgrade Required:</strong> You've reached limits on{' '}
            {featuresNeedingUpgrade.join(', ')}.
          </div>
          <Button size="sm" onClick={handleUpgrade}>
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
);
```

## 🔄 **Real-time Updates**

### **Supabase Realtime Integration**
```typescript
useEffect(() => {
  if (!user) return;

  // Subscribe to usage changes
  const channel = supabase
    .channel('usage-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'usage_tracking',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        // Refresh usage data when changes occur
        refreshUsage();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
```

## 🛡️ **Security Features**

### **Backend Validation**
- ✅ JWT authentication required
- ✅ User ownership validation
- ✅ Plan-based limit enforcement
- ✅ Rate limiting support
- ✅ Audit logging

### **Frontend Protection**
- ✅ Real-time usage checking
- ✅ Disabled state management
- ✅ Upgrade prompt integration
- ✅ Error handling
- ✅ Loading states

## 📊 **Monitoring & Analytics**

### **Usage Tracking**
```typescript
// Track feature usage
const { trackUsage } = useUsageTracking();

const handleFeatureUse = async () => {
  await trackUsage('feedback');
  // Automatically increments usage counter
};
```

### **Limit Monitoring**
```typescript
// Check if user needs upgrade
const { needsUpgrade, featuresNeedingUpgrade } = useUsageEnforcement();

if (needsUpgrade) {
  console.log('User needs upgrade for:', featuresNeedingUpgrade);
  // Show upgrade prompts
}
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Required for backend enforcement
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional for advanced features
USAGE_ENFORCEMENT_ENABLED=true
UPGRADE_PROMPT_ENABLED=true
```

### **Database Tables**
```sql
-- usage_tracking table
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  feedback_count INTEGER DEFAULT 0,
  analytics_count INTEGER DEFAULT 0,
  reports_count INTEGER DEFAULT 0,
  insights_count INTEGER DEFAULT 0,
  teams_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- user_subscriptions table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  plan_id VARCHAR(50),
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🧪 **Testing**

### **Unit Tests**
```typescript
describe('Usage Enforcement', () => {
  test('should allow usage within limits', () => {
    const result = checkUsage('feedback', 5, 'free');
    expect(result.canUse).toBe(true);
  });

  test('should block usage over limits', () => {
    const result = checkUsage('feedback', 25, 'free');
    expect(result.canUse).toBe(false);
  });

  test('should allow unlimited usage for business plan', () => {
    const result = checkUsage('feedback', 1000, 'business');
    expect(result.canUse).toBe(true);
  });
});
```

### **Integration Tests**
```typescript
describe('Usage Enforcement Integration', () => {
  test('should enforce limits in Edge Function', async () => {
    // Test Edge Function with limit exceeded
    const response = await fetch('/functions/v1/usage', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'feedback' })
    });

    expect(response.status).toBe(429);
  });
});
```

## 🚀 **Deployment**

### **Frontend Deployment**
1. Ensure all hooks and utilities are imported
2. Configure environment variables
3. Test usage enforcement flows
4. Deploy with proper error handling

### **Backend Deployment**
1. Deploy Edge Functions with enforcement
2. Configure database triggers
3. Set up monitoring and alerts
4. Test limit enforcement

## 📈 **Performance Considerations**

### **Optimization Tips**
- Cache usage data for short periods
- Use optimistic updates for better UX
- Implement batch usage tracking
- Monitor database query performance

### **Scaling**
- Use connection pooling
- Implement rate limiting
- Consider caching strategies
- Monitor usage patterns

## 🔄 **Migration Guide**

### **From No Limits to Enforced Limits**
1. Deploy usage tracking tables
2. Implement enforcement gradually
3. Notify users of new limits
4. Provide upgrade paths

### **Updating Plan Limits**
1. Update `PLAN_LIMITS` configuration
2. Deploy changes
3. Notify affected users
4. Monitor impact

## 📞 **Support**

For questions or issues with the usage enforcement system:
- Check the implementation examples
- Review the testing documentation
- Monitor usage analytics
- Contact the development team

---

This documentation provides a comprehensive guide to implementing and maintaining the usage enforcement system in the NoteX platform.