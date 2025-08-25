# Check Usage Function

This Edge Function checks if a user can use a specific feature based on their current plan and usage limits.

## Purpose

The check-usage function is primarily used by the feedback widget to verify if a user has reached their monthly feedback submission limit before allowing new submissions.

## Usage Limits by Plan

- **Free Trial**: 50 feedback submissions per month
- **Pro Plan**: 200 feedback submissions per month  
- **Business Plan**: Unlimited feedback submissions
- **Enterprise Plan**: Unlimited feedback submissions

## API Endpoint

```
POST /functions/v1/check-usage
```

## Request Body

```json
{
  "project_id": "string",
  "feature": "feedback"
}
```

### Parameters

- `project_id` (required): The project identifier from the feedback widget
- `feature` (required): The feature to check (currently supports: feedback, analytics, reports, insights, teams)

## Response

### Success Response (200)

```json
{
  "success": true,
  "canUse": true,
  "currentUsage": 25,
  "limit": 50,
  "plan": "free",
  "remaining": 25,
  "isUnlimited": false
}
```

### Error Response (400/404/500)

```json
{
  "success": false,
  "error": "Error message"
}
```

## Response Fields

- `success`: Boolean indicating if the request was successful
- `canUse`: Boolean indicating if the user can use the feature
- `currentUsage`: Current usage count for the feature
- `limit`: Maximum allowed usage for the user's plan (-1 for unlimited)
- `plan`: User's current plan (free, pro, business, enterprise)
- `remaining`: Remaining usage available (if not unlimited)
- `isUnlimited`: Boolean indicating if the plan has unlimited usage
- `error`: Error message (only present on failure)

## How It Works

1. Receives project_id and feature from the feedback widget
2. Looks up the user_id associated with the project_id
3. Fetches the user's current usage data from the usage_tracking table
4. Fetches the user's subscription data from the user_subscriptions table
5. Determines the user's plan and applies the appropriate limits
6. Returns whether the user can use the feature and their current usage status

## Integration with Feedback Widget

The feedback widget calls this function before submitting feedback to:

1. Check if the user has reached their monthly limit
2. Show appropriate error messages if limits are reached
3. Inform admins to upgrade their plan when needed
4. Prevent unnecessary API calls when limits are exceeded

## Security

- Uses Supabase service role key for database access
- Validates project_id against feedback_settings table
- Only allows POST requests
- Includes proper CORS headers for cross-origin requests

## Error Handling

- Gracefully handles missing usage data (creates default values)
- Continues operation even if subscription data is unavailable
- Provides detailed error messages for debugging
- Logs all errors for monitoring and troubleshooting