import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Lock, 
  Crown, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  RefreshCw
} from 'lucide-react';
import { useUnifiedTrial } from '@/contexts/UnifiedTrialContext';

interface PlatformLockProps {
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
}

export default function PlatformLock({ children, fallbackComponent }: PlatformLockProps) {
  const { trialStatus, checkAccess, getTrialMessage, isTrialExpired } = useUnifiedTrial();

  // Check if platform should be locked
  const shouldLock = !checkAccess();

  // If platform should not be locked, render children
  if (!shouldLock) {
    return <>{children}</>;
  }

  // If custom fallback component provided, use it
  if (fallbackComponent) {
    return <>{fallbackComponent}</>;
  }

  const isTrialExpiredUser = trialStatus.plan === 'free_trial' && isTrialExpired();
  const isBusinessInactive = trialStatus.plan === 'business' && !trialStatus.isActive;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleUpgrade = () => {
    // Navigate to billing page
    window.location.href = '/billing';
  };

  const handleRetry = () => {
    // Refresh the page to recheck status
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center shadow-xl border-0">
        <div className="mb-6">
          <div className="p-4 bg-red-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Lock className="h-10 w-10 text-red-600" />
          </div>
          
          {isTrialExpiredUser && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Free Trial Expired
              </h1>
              <div className="mb-4 space-y-2">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <Clock className="h-3 w-3 mr-1" />
                  Trial ended: {formatDate(trialStatus.trialEnd)}
                </Badge>
              </div>
              <p className="text-gray-600 mb-6">
                Your 8-day free trial has expired. Upgrade to Business plan to continue 
                collecting feedback and generating insights.
              </p>
            </>
          )}

          {isBusinessInactive && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Subscription Inactive
              </h1>
              <div className="mb-4 space-y-2">
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Business Plan - Inactive
                </Badge>
              </div>
              <p className="text-gray-600 mb-6">
                Your Business subscription is currently inactive. This could be due to a 
                payment issue or subscription cancellation. Please contact support or 
                reactivate your subscription.
              </p>
            </>
          )}

          {/* Show trial status message */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">{getTrialMessage()}</p>
          </div>
        </div>

        {/* Features locked behind paywall */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">What you're missing:</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Unlimited feedback collection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Advanced AI insights</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Comprehensive analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Detailed reports</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Priority support</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {isTrialExpiredUser && (
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              size="lg"
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Business Plan
            </Button>
          )}

          {isBusinessInactive && (
            <>
              <Button
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                size="lg"
              >
                <Zap className="h-5 w-5 mr-2" />
                Reactivate Subscription
              </Button>
              
              <Button
                onClick={handleRetry}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Status Again
              </Button>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Need help? Contact our support team for assistance.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}