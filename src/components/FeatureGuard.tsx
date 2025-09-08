import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  AlertTriangle, 
  Lock, 
  Zap, 
  Crown,
  Loader2 
} from 'lucide-react';
import { checkUsageLimit, isTrialExpired, PlanType } from '@/lib/usageEnforcement';

interface FeatureGuardProps {
  userId: string;
  featureType: keyof import('@/lib/usageEnforcement').UsageLimits;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onUpgrade?: (plan: 'business') => void;
}

export default function FeatureGuard({ 
  userId, 
  featureType, 
  children, 
  fallback,
  onUpgrade 
}: FeatureGuardProps) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reason, setReason] = useState<string>('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!userId) {
        setIsAllowed(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await checkUsageLimit(userId, featureType);
        
        setIsAllowed(result.allowed);
        setReason(result.reason || '');
        setUpgradeRequired(result.upgradeRequired || false);
      } catch (error) {
        console.error('Error checking feature access:', error);
        setIsAllowed(false);
        setReason('Unable to verify access');
        setUpgradeRequired(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [userId, featureType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span>Checking access...</span>
      </div>
    );
  }

  if (isAllowed === false) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              <strong>Access Restricted</strong>
              <p className="mt-2">{reason}</p>
              {upgradeRequired && onUpgrade && (
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onUpgrade('business')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Business
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

/**
 * Hook for checking feature access in components
 */
export function useFeatureAccess(userId: string, featureType: keyof import('@/lib/usageEnforcement').UsageLimits) {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reason, setReason] = useState<string>('');
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!userId) {
        setIsAllowed(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await checkUsageLimit(userId, featureType);
        
        setIsAllowed(result.allowed);
        setReason(result.reason || '');
        setUpgradeRequired(result.upgradeRequired || false);
      } catch (error) {
        console.error('Error checking feature access:', error);
        setIsAllowed(false);
        setReason('Unable to verify access');
        setUpgradeRequired(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [userId, featureType]);

  const refresh = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const result = await checkUsageLimit(userId, featureType);
      
      setIsAllowed(result.allowed);
      setReason(result.reason || '');
      setUpgradeRequired(result.upgradeRequired || false);
    } catch (error) {
      console.error('Error refreshing feature access:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAllowed,
    isLoading,
    reason,
    upgradeRequired,
    refresh
  };
}