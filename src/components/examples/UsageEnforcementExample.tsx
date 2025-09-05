import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Brain, 
  BarChart3, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Unlock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { 
  enforceUsageLimitWithCounters,
  checkUsageWithCounters,
  getUsageSummaryWithCounters 
} from '@/lib/usageEnforcement';

/**
 * Example of how to integrate usage enforcement into feedback submission
 */
export function FeedbackFormWithUsageEnforcement() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [usageInfo, setUsageInfo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim() || !user) return;

    setLoading(true);

    try {

      // Check usage before allowing feedback submission
      const canSubmit = await enforceUsageLimitWithCounters(
        user.id, 
        'feedback',
        () => {
          console.log('Feedback limit reached - user needs to upgrade');
        }
      );

      if (!canSubmit) {
        setLoading(false);
        return;

      // First check if user can use the feature
      const canUse = await enforceUsageLimit(feature as any, feature as any);

      if (canUse) {
        // Track usage
        await trackUsage(feature as any);
        console.log(`${feature} usage tracked successfully`);

      }

      // If we can submit, proceed with feedback creation
      console.log('Feedback submitted:', feedback);
      
      // Simulate feedback creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh usage info to show updated counts
      const updatedUsage = await getUsageSummaryWithCounters(user.id);
      setUsageInfo(updatedUsage);
      
      setFeedback('');
      toast.success('Feedback submitted successfully!');
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const checkUsage = async () => {
    if (!user) return;
    
    try {
      const usage = await getUsageSummaryWithCounters(user.id);
      setUsageInfo(usage);
      toast.success('Usage info refreshed');
    } catch (error) {
      console.error('Error checking usage:', error);
      toast.error('Failed to check usage');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Feedback Form with Usage Enforcement
        </CardTitle>
        <CardDescription>
          This form demonstrates how to enforce usage limits before allowing feedback submission.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Info Display */}
        {usageInfo && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3">Current Usage</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Plan:</span>
                <Badge variant="outline" className="ml-2">{usageInfo.plan_name}</Badge>
              </div>
              <div>
                <span className="text-gray-600">Feedback:</span>
                <span className="ml-2 font-medium">
                  {usageInfo.feedback_count} / {usageInfo.feedback_limit === -1 ? '∞' : usageInfo.feedback_limit}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Remaining:</span>
                <span className="ml-2 font-medium">
                  {usageInfo.feedback_remaining === -1 ? '∞' : usageInfo.feedback_remaining}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                {usageInfo.feedback_count < usageInfo.feedback_limit || usageInfo.feedback_limit === -1 ? (
                  <Badge variant="default" className="ml-2">
                    <Unlock className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="ml-2">
                    <Lock className="h-3 w-3 mr-1" />
                    Limit Reached
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium mb-2">
              Your Feedback
            </label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              disabled={loading}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={loading || !feedback.trim()}
              className="flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              Submit Feedback
            </Button>
            
            <Button 
              type="button"
              variant="outline"
              onClick={checkUsage}
              disabled={loading}
            >
              Check Usage
            </Button>
          </div>
        </form>

        {/* Usage Enforcement Info */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> Before submitting feedback, the system checks your current usage against plan limits. 
            If you've reached your limit, you'll see an upgrade prompt. Free users get 50 feedback submissions, 
            Pro users get 300, and Business users have unlimited access.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
