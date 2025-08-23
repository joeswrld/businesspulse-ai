# useUsageTracking Hook

A React hook for tracking user usage of different features in your application. This hook integrates with the Supabase Edge Function `/usage` to track user actions and maintain usage statistics.

## Features

- ✅ **Authentication**: Automatically uses Supabase JWT for authentication
- ✅ **Error Handling**: Comprehensive error handling with user-friendly messages
- ✅ **Loading States**: Built-in loading states for UI feedback
- ✅ **TypeScript**: Full TypeScript support with proper types
- ✅ **Multiple Variants**: Basic, auto-reset, and optimistic versions
- ✅ **Production Ready**: Handles network errors, authentication failures, and edge cases

## Basic Usage

```tsx
import { useUsageTracking } from '@/hooks/useUsageTracking';

function MyComponent() {
  const { trackUsage, loading, error, success } = useUsageTracking();

  async function handleSubmitFeedback() {
    await trackUsage("feedback");
  }

  return (
    <div>
      <button onClick={handleSubmitFeedback} disabled={loading}>
        {loading ? 'Tracking...' : 'Submit Feedback'}
      </button>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Usage tracked!</div>}
    </div>
  );
}
```

## Available Actions

The hook supports tracking these actions:

- `"feedback"` - Tracks feedback submissions
- `"analytics"` - Tracks analytics queries
- `"reports"` - Tracks report generation
- `"insights"` - Tracks insights access
- `"teams"` - Tracks team interactions (placeholder)

## Hook Variants

### 1. Basic Hook (`useUsageTracking`)

The standard hook with manual state management.

```tsx
const { trackUsage, loading, error, success, reset } = useUsageTracking();
```

**Returns:**
- `trackUsage(action)` - Function to track usage
- `loading` - Boolean indicating if request is in progress
- `error` - Error message string or null
- `success` - Boolean indicating if last request was successful
- `reset()` - Function to reset all states

### 2. Auto Reset Hook (`useUsageTrackingWithAutoReset`)

Automatically resets success state after a specified delay.

```tsx
const { trackUsage, loading, error, success } = useUsageTrackingWithAutoReset(3000); // 3 seconds
```

### 3. Optimistic Hook (`useUsageTrackingOptimistic`)

Provides immediate visual feedback while making the API call.

```tsx
const { 
  trackUsageOptimistic, 
  loading, 
  error, 
  success, 
  optimisticSuccess 
} = useUsageTrackingOptimistic();
```

## Integration Examples

### In a Feedback Form

```tsx
function FeedbackForm() {
  const { trackUsage, loading, error, success } = useUsageTracking();
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Track usage first
    await trackUsage("feedback");
    
    // If successful, submit the actual feedback
    if (success) {
      // Submit feedback to your backend
      await submitFeedback(feedback);
      setFeedback('');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea 
        value={feedback} 
        onChange={(e) => setFeedback(e.target.value)}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !feedback.trim()}>
        {loading ? 'Submitting...' : 'Submit Feedback'}
      </button>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Feedback submitted!</div>}
    </form>
  );
}
```

### In an Analytics Dashboard

```tsx
function AnalyticsDashboard() {
  const { trackUsage, loading } = useUsageTrackingWithAutoReset(2000);

  const handleViewAnalytics = async () => {
    await trackUsage("analytics");
    // Analytics tracking happens automatically
  };

  return (
    <div>
      <button onClick={handleViewAnalytics} disabled={loading}>
        {loading ? 'Loading...' : 'View Analytics'}
      </button>
    </div>
  );
}
```

### In a Report Generator

```tsx
function ReportGenerator() {
  const { trackUsageOptimistic, loading, optimisticSuccess } = useUsageTrackingOptimistic();

  const handleGenerateReport = async () => {
    await trackUsageOptimistic("reports");
    // UI updates immediately, then API call happens
  };

  return (
    <div>
      <button onClick={handleGenerateReport} disabled={loading}>
        Generate Report
      </button>
      
      {optimisticSuccess && (
        <div className="optimistic-feedback">
          Report generation started!
        </div>
      )}
    </div>
  );
}
```

## Error Handling

The hook handles various error scenarios:

- **401 Unauthorized**: User not authenticated or token expired
- **400 Bad Request**: Invalid action or missing parameters
- **500 Server Error**: Database or server issues
- **Network Errors**: Connection problems

All errors are captured in the `error` state with user-friendly messages.

## Authentication

The hook automatically:
1. Gets the current user from the AuthContext
2. Retrieves the current session from Supabase
3. Attaches the JWT token to API requests
4. Handles authentication failures gracefully

## State Management

The hook manages these states internally:

- **Loading**: Set to `true` during API calls
- **Error**: Contains error message or `null`
- **Success**: Set to `true` when API call succeeds
- **Reset**: Function to clear all states

## Best Practices

1. **Use appropriate variant**: Choose the hook variant that fits your use case
2. **Handle loading states**: Always show loading indicators during API calls
3. **Display errors**: Show error messages to users when things go wrong
4. **Reset when needed**: Use the reset function to clear states between actions
5. **Combine with business logic**: Track usage before or after your main business logic

## Integration with Existing Components

To add usage tracking to existing components:

```tsx
// Before
function ExistingComponent() {
  const handleAction = () => {
    // Your existing logic
  };
  
  return <button onClick={handleAction}>Do Something</button>;
}

// After
function ExistingComponent() {
  const { trackUsage, loading } = useUsageTracking();
  
  const handleAction = async () => {
    // Track usage first
    await trackUsage("feedback");
    
    // Your existing logic
    // ...
  };
  
  return (
    <button onClick={handleAction} disabled={loading}>
      {loading ? 'Processing...' : 'Do Something'}
    </button>
  );
}
```

## Testing

The hook can be tested by mocking the Supabase client and checking state changes:

```tsx
// Mock Supabase
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn()
    },
    supabaseUrl: 'https://test.supabase.co'
  }
}));

// Test the hook
const { result } = renderHook(() => useUsageTracking());
await act(async () => {
  await result.current.trackUsage('feedback');
});
expect(result.current.success).toBe(true);
```

## Dependencies

The hook depends on:
- `@/contexts/AuthContext` - For user authentication
- `@/integrations/supabase/client` - For Supabase client
- React hooks (`useState`, `useCallback`)

Make sure these dependencies are properly set up in your project.