import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Zap, Crown } from 'lucide-react';

interface UsageEnforcementProps {
  children: React.ReactNode;
  feature: 'feedback' | 'insights' | 'analytics' | 'reports';
  usageCheck: {
    canUse: boolean;
    currentUsage: number;
    limit: number;
    remaining: number;
    isUnlimited: boolean;
    planCode: string;
    planName: string;
  };
  onUpgrade?: (plan: 'pro' | 'business') => void;
  showUpgradePrompt?: boolean;
}

export default function UsageEnforcement({
  children,
  feature,
  usageCheck,
  onUpgrade,
  showUpgradePrompt = true
}: UsageEnforcementProps) {
  if (usageCheck.canUse) {
    return <>{children}</>;
  }

  const featureName = feature.charAt(0).toUpperCase() + feature.slice(1);
  const isUnlimited = usageCheck.limit === -1;

  return (
    <div className="space-y-4">
      <Alert className="border-red-200 bg-red-50">
        <Lock className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>{featureName} limit reached!</strong> You've used {usageCheck.currentUsage} out of {usageCheck.limit} available.
          {showUpgradePrompt && onUpgrade && (
            <div className="mt-3">
              <p className="text-sm mb-3">Upgrade your plan to continue using this feature:</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onUpgrade('pro')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpgrade('business')}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Business
                </Button>
              </div>
            </div>
          )}
        </AlertDescription>
      </Alert>
      
      {/* Show disabled version of the component */}
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    </div>
  );
}