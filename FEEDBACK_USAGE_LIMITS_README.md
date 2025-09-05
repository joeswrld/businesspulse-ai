# Feedback Usage Limits System

A comprehensive plan-based feedback usage limit system for NoteX that enforces monthly limits based on user subscription plans.

## 📊 Plan Limits

| Plan | Monthly Limit | Description |
|------|---------------|-------------|
| **Free** | 50 feedbacks | Basic plan for new users |
| **Pro** | 300 feedbacks | Professional plan for active users |
| **Business** | Unlimited | Enterprise plan with no limits |

## 🏗️ Architecture

### Database Schema

#### `usage_counters` Table
```sql
CREATE TABLE usage_counters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  feedback_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month_start)
);
```

#### `billing_profiles` Table
```sql
-- Already exists in your system
CREATE TABLE billing_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  plan TEXT CHECK (plan IN ('trial','free','pro','business')) DEFAULT 'trial',
  -- ... other fields
);
```

### Edge Function: `create-feedback`

**Endpoint**: `POST /functions/v1/create-feedback`

**Headers**:
- `Authorization: Bearer <user_token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "project_id": "string",
  "message": "string",
  "name": "string (optional)",
  "email": "string (optional)",
  "sentiment": "positive|negative|neutral (optional)",
  "tags": ["string"] (optional)
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "message": "Feedback created successfully",
  "data": {
    "feedback_id": "uuid",
    "user_id": "uuid",
    "plan": "free|pro|business",
    "usage": {
      "current": 25,
      "limit": 50,
      "reset_date": "2024-02-01"
    }
  }
}
```

**Error Response (429 - Limit Exceeded)**:
```json
{
  "error": "Feedback limit reached",
  "message": "Free plan limit (50 feedbacks) reached. Upgrade to Pro or Business to continue.",
  "plan": "free",
  "current_usage": 50,
  "limit": 50,
  "reset_date": "2024-02-01"
}
```

## 🚀 Deployment

### 1. Deploy Edge Function
```bash
supabase functions deploy create-feedback
```

### 2. Apply Database Schema
Run the SQL in `usage_counters_schema.sql` in your Supabase SQL Editor:

```sql
-- Copy and paste the entire content of usage_counters_schema.sql
-- This creates the usage_counters table with proper indexes and RLS policies
```

### 3. Update Frontend

#### Add Usage Display Component
```tsx
import FeedbackUsageDisplay from '@/components/FeedbackUsageDisplay';

// In your feedback page
<FeedbackUsageDisplay onUpgrade={(plan) => handleUpgrade(plan)} />
```

#### Use Usage Hook
```tsx
import { useFeedbackUsage } from '@/hooks/useFeedbackUsage';

const { usageInfo, canSubmitFeedback, getRemainingFeedback } = useFeedbackUsage();
```

## 🔧 Implementation Details

### Usage Validation Flow

1. **Authentication**: Verify user token
2. **Plan Lookup**: Get user's plan from `billing_profiles`
3. **Usage Check**: Get current month's usage from `usage_counters`
4. **Limit Validation**: Compare usage against plan limits
5. **Feedback Creation**: If under limit, create feedback and increment counter
6. **Error Response**: If over limit, return appropriate error message

### Monthly Reset Logic

- Usage counters are automatically reset when `month_start` doesn't match current month
- New month starts on the 1st day of each month
- Business users bypass all usage checks

### Error Messages

- **Free Plan (≥50)**: "Free plan limit (50 feedbacks) reached. Upgrade to Pro or Business to continue."
- **Pro Plan (≥300)**: "Pro plan limit (300 feedbacks) reached. Upgrade to Business to continue."
- **Business Plan**: Always allowed (unlimited)

## 🧪 Testing

### Manual Testing

1. **Create Test User**:
   ```sql
   INSERT INTO billing_profiles (id, plan) 
   VALUES ('user-uuid', 'free');
   ```

2. **Test Free Plan Limit**:
   - Submit 50 feedbacks (should succeed)
   - Submit 51st feedback (should fail with limit error)

3. **Test Pro Plan Limit**:
   - Update user to Pro plan
   - Submit 300 feedbacks (should succeed)
   - Submit 301st feedback (should fail with limit error)

4. **Test Business Plan**:
   - Update user to Business plan
   - Submit unlimited feedbacks (should always succeed)

### Automated Testing

```bash
# Run the test script
node test-usage-limits.js
```

## 📱 Frontend Integration

### Usage Display Component

The `FeedbackUsageDisplay` component shows:
- Current plan and usage
- Progress bar with usage percentage
- Remaining feedback count
- Upgrade prompts when approaching limits
- Error alerts when limits are reached

### Usage Hook

The `useFeedbackUsage` hook provides:
- Real-time usage information
- Plan validation
- Usage calculations
- Refresh functionality

## 🔍 Monitoring

### Supabase Logs
```bash
# Monitor Edge Function logs
supabase functions logs create-feedback --follow
```

### Database Queries
```sql
-- Check user usage
SELECT * FROM usage_counters 
WHERE user_id = 'user-uuid' 
AND month_start = '2024-01-01';

-- Check plan distribution
SELECT plan, COUNT(*) FROM billing_profiles GROUP BY plan;

-- Check usage distribution
SELECT 
  CASE 
    WHEN feedback_count < 10 THEN '0-9'
    WHEN feedback_count < 50 THEN '10-49'
    WHEN feedback_count < 100 THEN '50-99'
    ELSE '100+'
  END as usage_range,
  COUNT(*) as user_count
FROM usage_counters 
WHERE month_start = '2024-01-01'
GROUP BY usage_range;
```

## 🛠️ Troubleshooting

### Common Issues

1. **"User not found" error**:
   - Ensure user has a billing profile
   - Check if user is properly authenticated

2. **"Usage counter not found" error**:
   - Check if `usage_counters` table exists
   - Verify RLS policies are correct

3. **"Plan not found" error**:
   - Ensure `billing_profiles` table exists
   - Check if user has a billing profile

4. **Edge Function deployment fails**:
   - Check Supabase CLI is installed and logged in
   - Verify environment variables are set

### Debug Steps

1. Check Edge Function logs
2. Verify database schema is applied
3. Test with different user plans
4. Check RLS policies
5. Verify authentication tokens

## 📈 Analytics

### Usage Metrics
- Monthly feedback submission counts
- Plan distribution across users
- Usage limit hit rates
- Upgrade conversion rates

### Business Intelligence
- Track which users hit limits most
- Monitor upgrade patterns
- Analyze feedback volume trends
- Plan effectiveness metrics

## 🔒 Security

### Row Level Security (RLS)
- Users can only access their own usage counters
- Proper authentication required for all operations
- Service role key used for Edge Function operations

### Data Privacy
- Usage data is user-specific
- No cross-user data leakage
- Proper data retention policies

## 🚀 Future Enhancements

1. **Usage Analytics Dashboard**
2. **Automated Plan Recommendations**
3. **Usage Alerts and Notifications**
4. **Custom Limits per User**
5. **Usage Rollover for Unused Quota**
6. **Team-based Usage Limits**

---

## 📞 Support

For issues or questions about the usage limits system:
1. Check the troubleshooting section
2. Review Supabase logs
3. Test with the provided test scripts
4. Contact the development team

**System Status**: ✅ Ready for Production
**Last Updated**: January 2024
**Version**: 1.0.0