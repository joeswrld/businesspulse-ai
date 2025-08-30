# Usage Tracking Edge Function

This Supabase Edge Function provides an API endpoint for tracking user usage of different features in your application.

## Features

- **Authentication**: Uses Supabase JWT for user authentication
- **Usage Tracking**: Increments counters for different user actions
- **Validation**: Validates request parameters and actions
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
- **Logging**: Detailed logging for debugging and monitoring
- **CORS Support**: Handles cross-origin requests

## Supported Actions

- `feedback` - Tracks feedback submissions
- `analytics` - Tracks analytics queries
- `reports` - Tracks report generation
- `insights` - Tracks insights access
- `teams` - Tracks team interactions (placeholder for future use)

## API Endpoint

**POST** `/functions/v1/usage`

### Request Headers

```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

### Request Body

```json
{
  "action": "feedback"
}
```

### Response

#### Success (200)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "user_uuid",
    "feedback_count": 5,
    "analytics_count": 12,
    "reports_count": 3,
    "insights_count": 8,
    "teams_count": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

#### Error Responses

**400 Bad Request** - Invalid action or missing required fields
```json
{
  "success": false,
  "error": "Invalid action. Valid actions are: feedback, analytics, reports, insights, teams"
}
```

**401 Unauthorized** - Missing or invalid authentication
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**405 Method Not Allowed** - Wrong HTTP method
```json
{
  "success": false,
  "error": "Method not allowed. Only POST requests are supported."
}
```

**500 Internal Server Error** - Database or server error
```json
{
  "success": false,
  "error": "Failed to update usage data"
}
```

## Deployment

### Prerequisites

1. Supabase CLI installed
2. Supabase project set up
3. Database migrations run (including `usage_tracking` table and `increment_usage` function)

### Deploy the Function

```bash
# Navigate to your project root
cd your-project

# Deploy the function
supabase functions deploy usage

# Or deploy all functions
supabase functions deploy
```

### Environment Variables

The function uses these environment variables (automatically set by Supabase):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

## Usage Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')

// Get user session
const { data: { session } } = await supabase.auth.getSession()

if (session) {
  // Track feedback usage
  const response = await fetch('https://your-project.supabase.co/functions/v1/usage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'feedback' }),
  })

  const result = await response.json()
  console.log('Usage updated:', result)
}
```

### cURL

```bash
# Track feedback usage
curl -X POST 'https://your-project.supabase.co/functions/v1/usage' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"action": "feedback"}'

# Track analytics usage
curl -X POST 'https://your-project.supabase.co/functions/v1/usage' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"action": "analytics"}'
```

## Testing

### Local Testing

```bash
# Start Supabase locally
supabase start

# Serve the function locally
supabase functions serve usage

# Test with curl
curl -X POST 'http://localhost:54321/functions/v1/usage' \
  -H 'Authorization: Bearer YOUR_LOCAL_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"action": "feedback"}'
```

### Using the Test File

```typescript
import { runTests } from './test.ts'

// Run tests with your credentials
await runTests('YOUR_SUPABASE_URL', 'YOUR_ACCESS_TOKEN')
```

## Database Schema

This function works with the `usage_tracking` table created by the database migration:

```sql
CREATE TABLE usage_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_count INTEGER DEFAULT 0,
    analytics_count INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    insights_count INTEGER DEFAULT 0,
    teams_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

## Security

- **Authentication**: Requires valid Supabase JWT token
- **Authorization**: Users can only update their own usage data
- **Input Validation**: All inputs are validated and sanitized
- **RLS**: Row Level Security policies ensure data isolation
- **CORS**: Proper CORS headers for cross-origin requests

## Monitoring

The function includes comprehensive logging:

- Request processing logs
- Authentication success/failure logs
- Database operation logs
- Error logs with context

Logs can be viewed in the Supabase dashboard under Functions > Logs.

## Error Handling

The function handles various error scenarios:

- Invalid authentication tokens
- Missing or invalid request parameters
- Database connection issues
- Invalid action types
- JSON parsing errors
- Unexpected server errors

All errors return appropriate HTTP status codes and descriptive error messages.