import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  useUsageTracking, 
  useUsageTrackingWithAutoReset, 
  useUsageTrackingOptimistic,
  UsageAction 
} from '@/hooks/useUsageTracking';
import { 
  MessageSquare, 
  BarChart3, 
  FileText, 
  Brain, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';

/**
 * Example component demonstrating the useUsageTracking hook
 */
export function UsageTrackingExample() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Usage Tracking Examples</h2>
        <p className="text-muted-foreground">
          Examples of how to use the useUsageTracking hook in different scenarios.
        </p>
      </div>

      {/* Basic Usage Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Basic Usage Tracking</span>
          </CardTitle>
          <CardDescription>
            Simple usage tracking with manual state management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BasicUsageExample />
        </CardContent>
      </Card>

      {/* Auto Reset Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Auto Reset Usage Tracking</span>
          </CardTitle>
          <CardDescription>
            Usage tracking that automatically resets success state after 3 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutoResetUsageExample />
        </CardContent>
      </Card>

      {/* Optimistic Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5" />
            <span>Optimistic Usage Tracking</span>
          </CardTitle>
          <CardDescription>
            Usage tracking with immediate visual feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OptimisticUsageExample />
        </CardContent>
      </Card>

      {/* All Actions Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>All Available Actions</span>
          </CardTitle>
          <CardDescription>
            Track all available usage actions in one place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AllActionsExample />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Basic usage example
 */
function BasicUsageExample() {
  const { trackUsage, loading, error, success, reset } = useUsageTracking();

  const handleSubmitFeedback = async () => {
    await trackUsage("feedback");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button 
          onClick={handleSubmitFeedback} 
          disabled={loading}
          className="flex items-center space-x-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          <span>Submit Feedback</span>
        </Button>
        
        {success && (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Success!
          </Badge>
        )}
        
        <Button variant="outline" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Usage tracked successfully! The success state will remain until manually reset.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Auto reset usage example
 */
function AutoResetUsageExample() {
  const { trackUsage, loading, error, success } = useUsageTrackingWithAutoReset(3000);

  const handleAnalytics = async () => {
    await trackUsage("analytics");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button 
          onClick={handleAnalytics} 
          disabled={loading}
          className="flex items-center space-x-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BarChart3 className="h-4 w-4" />
          )}
          <span>Track Analytics</span>
        </Button>
        
        {success && (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Success! (Auto-reset in 3s)
          </Badge>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Usage tracked successfully! This success state will automatically reset in 3 seconds.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Optimistic usage example
 */
function OptimisticUsageExample() {
  const { 
    trackUsageOptimistic, 
    loading, 
    error, 
    success, 
    optimisticSuccess 
  } = useUsageTrackingOptimistic();

  const handleReports = async () => {
    await trackUsageOptimistic("reports");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button 
          onClick={handleReports} 
          disabled={loading}
          className="flex items-center space-x-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          <span>Generate Report</span>
        </Button>
        
        {optimisticSuccess && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Optimistic Success!
          </Badge>
        )}
        
        {success && (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmed Success!
          </Badge>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {optimisticSuccess && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Optimistic success! The UI updated immediately while the API call is in progress.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * All actions example
 */
function AllActionsExample() {
  const { trackUsage, loading, error, success } = useUsageTracking();

  const actions: { action: UsageAction; label: string; icon: React.ReactNode }[] = [
    { action: 'feedback', label: 'Feedback', icon: <MessageSquare className="h-4 w-4" /> },
    { action: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { action: 'reports', label: 'Reports', icon: <FileText className="h-4 w-4" /> },
    { action: 'insights', label: 'Insights', icon: <Brain className="h-4 w-4" /> },
    { action: 'teams', label: 'Teams', icon: <Users className="h-4 w-4" /> },
  ];

  const handleAction = async (action: UsageAction) => {
    await trackUsage(action);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {actions.map(({ action, label, icon }) => (
          <Button
            key={action}
            onClick={() => handleAction(action)}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex flex-col items-center space-y-1 h-auto py-3"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              icon
            )}
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Usage tracked successfully! You can track any of the available actions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Real-world usage example in a feedback form
 */
export function FeedbackFormWithUsageTracking() {
  const { trackUsage, loading, error, success } = useUsageTracking();
  const [feedback, setFeedback] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim()) return;

    // Track usage first
    await trackUsage("feedback");
    
    // If successful, you could submit the feedback to your backend
    if (success) {
      console.log('Feedback submitted:', feedback);
      setFeedback('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback Form with Usage Tracking</CardTitle>
        <CardDescription>
          This form tracks usage when feedback is submitted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium mb-2">
              Your Feedback
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full p-3 border rounded-md"
              rows={4}
              placeholder="Share your thoughts..."
              disabled={loading}
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={loading || !feedback.trim()}
            className="flex items-center space-x-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            <span>Submit Feedback</span>
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Feedback submitted and usage tracked successfully!
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}