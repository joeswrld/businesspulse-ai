# Feedback Usage Limits Implementation

This document outlines the implementation of feedback usage limits and tracking for the NoteX feedback system.

## Overview

The system now enforces monthly feedback submission limits based on user subscription plans:
- **Free Trial**: 50 feedback submissions per month
- **Pro Plan**: 200 feedback submissions per month
- **Business Plan**: Unlimited feedback submissions
- **Enterprise Plan**: Unlimited feedback submissions

## Changes Made

### 1. Updated Usage Enforcement Library (`src/lib/usageEnforcement.ts`)

- Modified `PLAN_LIMITS` to reflect new feedback limits:
  - Free: 20 → 50
  - Pro: 500 → 200
  - Business/Enterprise: Unlimited (-1)

### 2. Updated Usage Enforcement Hook (`src/hooks/useUsageEnforcement.ts`)

- Updated default state values to match new limits
- Ensured consistency with the library changes

### 3. Enhanced Billing Page (`src/pages/Billing.tsx`)

- Updated feedback usage display to show clear plan-specific limits
- Added detailed descriptions for each plan's feedback allowance
- Enhanced usage summary with feedback-specific information
- Added remaining usage count display

### 4. Modified Feedback Widget (`public/feedback-widget.js`)

- Added usage limit check before allowing feedback submissions
- Integrated with new check-usage API endpoint
- Shows informative error messages when limits are reached
- Includes admin upgrade prompts in limit reached scenarios

### 5. Created Check Usage API (`supabase/functions/check-usage/`)

- New Edge Function to verify usage limits
- Checks user's plan and current usage before allowing submissions
- Returns detailed usage information for the feedback widget
- Handles project_id to user_id mapping securely

### 6. Enhanced Feedback API (`supabase/functions/feedback-api/`)

- Added usage counter increment after successful feedback submission
- Integrates with existing `increment_usage` database function
- Ensures accurate usage tracking

### 7. Updated Usage Function (`supabase/functions/usage/`)

- Synchronized plan limits with the new feedback limits
- Maintains consistency across all usage-related functions

## How It Works

### Usage Check Flow

1. **User submits feedback** via the embedded widget
2. **Widget calls check-usage API** to verify limits
3. **API validates project_id** and looks up user
4. **System checks current usage** against plan limits
5. **If within limits**: Allows submission and increments counter
6. **If limit reached**: Shows upgrade prompt and blocks submission

### Usage Tracking Flow

1. **Feedback submitted successfully**
2. **Feedback API increments usage counter**
3. **Usage data updated in real-time**
4. **Billing page reflects current usage**
5. **Real-time updates via Supabase subscriptions**

## Database Integration

### Tables Used

- `usage_tracking`: Stores monthly usage counts per user
- `user_subscriptions`: Contains user's current plan information
- `feedback_settings`: Maps project_id to user_id
- `feedbacks`: Stores actual feedback submissions

### Functions Used

- `increment_usage(p_user_id, p_action)`: Increments usage counters
- `get_or_create_usage_tracking(user_uuid)`: Ensures usage record exists

## Security Features

- **Project validation**: Only valid project_ids can check usage
- **User isolation**: Users can only access their own usage data
- **Service role access**: API functions use secure database access
- **CORS protection**: Proper headers for cross-origin requests

## User Experience

### For Website Visitors

- Seamless feedback submission when limits not reached
- Clear error messages when limits are exceeded
- Professional appearance maintained

### For Admins

- Real-time usage monitoring on billing page
- Clear upgrade prompts when limits are reached
- Detailed usage statistics and remaining counts
- Plan comparison information

## Deployment

### New Functions to Deploy

1. **check-usage**: `./deploy-check-usage.sh`
2. **Updated feedback-api**: Existing deployment process
3. **Updated usage**: Existing deployment process

### Frontend Updates

- All changes are in the source code and will be deployed with the next build
- No additional deployment steps required for frontend changes

## Testing

### Test Scenarios

1. **Free trial user** submitting 50th feedback (should succeed)
2. **Free trial user** submitting 51st feedback (should be blocked)
3. **Pro user** submitting 200th feedback (should succeed)
4. **Pro user** submitting 201st feedback (should be blocked)
5. **Business user** submitting unlimited feedback (should always succeed)

### Test Commands

```bash
# Test check-usage function
curl -X POST https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/check-usage \
  -H 'Content-Type: application/json' \
  -d '{"project_id": "test-project", "feature": "feedback"}'

# Test feedback submission
curl -X POST https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/feedback-api \
  -F 'project_id=test-project' \
  -F 'name=Test User' \
  -F 'email=test@example.com' \
  -F 'message=Test feedback message'
```

## Monitoring

### What to Monitor

- Usage check API response times
- Feedback submission success/failure rates
- Usage counter increment success rates
- Error logs for limit reached scenarios

### Key Metrics

- Total feedback submissions per month
- Limit reached occurrences by plan type
- Upgrade conversion rates after limit reached
- API performance and reliability

## Future Enhancements

### Potential Improvements

1. **Usage reset**: Monthly usage counter reset functionality
2. **Grace period**: Allow overages with upgrade prompts
3. **Usage analytics**: Detailed usage patterns and insights
4. **Plan recommendations**: AI-powered plan suggestions
5. **Bulk operations**: Batch usage updates for efficiency

### Scalability Considerations

- Current implementation handles individual requests efficiently
- Database indexes ensure fast lookups
- Caching could be added for frequently accessed usage data
- Rate limiting could be implemented for API endpoints

## Troubleshooting

### Common Issues

1. **Usage not incrementing**: Check `increment_usage` function permissions
2. **Limit checks failing**: Verify project_id to user_id mapping
3. **Plan detection issues**: Check subscription table structure
4. **Widget errors**: Verify API endpoint URLs and CORS settings

### Debug Steps

1. Check browser console for widget errors
2. Verify API function logs in Supabase dashboard
3. Confirm database permissions and RLS policies
4. Test API endpoints directly with curl commands

## Conclusion

This implementation provides a robust, secure, and user-friendly feedback usage limit system that:

- Protects free users from excessive usage
- Encourages plan upgrades when appropriate
- Maintains accurate usage tracking
- Provides clear user feedback and admin information
- Scales efficiently with the existing infrastructure

The system is now ready for production use and will help manage feedback submission volumes while encouraging user engagement and plan upgrades.