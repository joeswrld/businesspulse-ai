import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Crown, 
  Zap,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useFeedbackUsage } from '@/hooks/useFeedbackUsage';

interface FeedbackUsageDisplayProps {
  onUpgrade?: (plan: 'pro' | 'business') => void;
}

const FeedbackUsageDisplay: React.FC<FeedbackUsageDisplayProps> = ({ onUpgrade }) => {
  const { 
    usageInfo, 
    loading, 
    error, 
    refreshUsage, 
    canSubmitFeedback, 
    getUsagePercentage, 
    getRemainingFeedback 
  } = useFeedbackUsage();

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Loading usage information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load usage information: {error}
            </AlertDescription>
          </Alert>
        </Card>
      </Card>
    );
  }

  if (!usageInfo) {
    return null;
  }

  const usagePercentage = getUsagePercentage();
  const remainingFeedback = getRemainingFeedback();
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = !canSubmitFeedback();

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'free':
        return <BarChart3 className="h-4 w-4" />;
      case 'pro':
        return <Zap className="h-4 w-4" />;
      case 'business':
        return <Crown className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'pro':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'business':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Feedback Usage</CardTitle>
              <CardDescription>
                Monthly feedback submission limits
              </CardDescription>
            </div>
          </div>
          <Badge className={`${getPlanColor(usageInfo.plan)} px-3 py-1 text-sm font-medium border`}>
            <div className="flex items-center gap-2">
              {getPlanIcon(usageInfo.plan)}
              {usageInfo.plan.charAt(0).toUpperCase() + usageInfo.plan.slice(1)} Plan
            </div>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {usageInfo.isUnlimited ? (
          <div className="text-center py-4">
            <Crown className="h-12 w-12 text-purple-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unlimited Feedback</h3>
            <p className="text-sm text-gray-600">
              You have unlimited feedback submissions with your Business plan.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">This month's usage</span>
                <span className="font-medium">
                  {usageInfo.current} / {usageInfo.limit} feedbacks
                </span>
              </div>
              
              <Progress 
                value={usagePercentage} 
                className={`h-2 ${
                  isAtLimit ? 'bg-red-100' : 
                  isNearLimit ? 'bg-yellow-100' : 'bg-green-100'
                }`}
              />
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>0</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Resets on {new Date(usageInfo.resetDate).toLocaleDateString()}
                </span>
                <span>{usageInfo.limit}</span>
              </div>
            </div>

            {isAtLimit && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Feedback limit reached!</strong> You've used all {usageInfo.limit} feedbacks for this month.
                  {onUpgrade && (
                    <div className="mt-3 flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => onUpgrade('pro')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Upgrade to Pro
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onUpgrade('business')}
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        <Crown className="h-4 w-4 mr-1" />
                        Upgrade to Business
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isNearLimit && !isAtLimit && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Approaching limit!</strong> You have {remainingFeedback} feedbacks remaining this month.
                  {onUpgrade && (
                    <div className="mt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onUpgrade('pro')}
                        className="text-green-700 border-green-300 hover:bg-green-50"
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Upgrade to Pro
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {!isNearLimit && !isAtLimit && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>
                  {remainingFeedback} feedbacks remaining this month
                </span>
              </div>
            )}
          </>
        )}

        <div className="pt-3 border-t border-gray-200">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshUsage}
            className="text-gray-600 hover:text-gray-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Usage
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackUsageDisplay;