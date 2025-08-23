import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  checkFeatureUsage,
  getUsageSummary,
  enforceUsageLimit,
  showUpgradePrompt,
  type FeatureType,
  type UsageCheckResult,
  type PlanType,
  type UsageLimits,
  type UsageData,
  type Subscription
} from '@/lib/usageEnforcement';

interface UseUsageEnforcementReturn {
  // State
  loading: boolean;
  error: string | null;
  usage: UsageData | null;
  subscription: Subscription | null;
  plan: PlanType;
  limits: UsageLimits;
  checks: Record<FeatureType, UsageCheckResult>;
  
  // Actions
  checkUsage: (feature: FeatureType) => Promise<UsageCheckResult | null>;
  enforceLimit: (feature: FeatureType, onLimitReached?: () => void) => Promise<boolean>;
  refreshUsage: () => Promise<void>;
  
  // Utilities
  canUseFeature: (feature: FeatureType) => boolean;
  getRemainingUsage: (feature: FeatureType) => number;
  needsUpgrade: boolean;
  featuresNeedingUpgrade: FeatureType[];
}

export function useUsageEnforcement(): UseUsageEnforcementReturn {
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<PlanType>('free');
  const [limits, setLimits] = useState<UsageLimits>({
    feedback: 20,
    analytics: 5,
    reports: 2,
    insights: 5,
    teams: 1
  });
  const [checks, setChecks] = useState<Record<FeatureType, UsageCheckResult>>({
    feedback: { canUse: true, currentUsage: 0, limit: 20, plan: 'free', feature: 'feedback', isUnlimited: false, remaining: 20 },
    analytics: { canUse: true, currentUsage: 0, limit: 5, plan: 'free', feature: 'analytics', isUnlimited: false, remaining: 5 },
    reports: { canUse: true, currentUsage: 0, limit: 2, plan: 'free', feature: 'reports', isUnlimited: false, remaining: 2 },
    insights: { canUse: true, currentUsage: 0, limit: 5, plan: 'free', feature: 'insights', isUnlimited: false, remaining: 5 },
    teams: { canUse: true, currentUsage: 0, limit: 1, plan: 'free', feature: 'teams', isUnlimited: false, remaining: 1 }
  });

  // Load usage data
  const loadUsageData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const summary = await getUsageSummary(user.id);
      
      setUsage(summary.usage);
      setSubscription(summary.subscription);
      setPlan(summary.plan);
      setLimits(summary.limits);
      setChecks(summary.checks);
      
    } catch (err) {
      console.error('Error loading usage data:', err);
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data on mount and when user changes
  useEffect(() => {
    loadUsageData();
  }, [loadUsageData]);

  // Check usage for a specific feature
  const checkUsage = useCallback(async (feature: FeatureType): Promise<UsageCheckResult | null> => {
    if (!user) return null;
    
    try {
      const result = await checkFeatureUsage(user.id, feature);
      
      // Update local state if successful
      if (result) {
        setChecks(prev => ({
          ...prev,
          [feature]: result
        }));
      }
      
      return result;
    } catch (err) {
      console.error('Error checking usage:', err);
      return null;
    }
  }, [user]);

  // Enforce usage limit
  const enforceLimit = useCallback(async (
    feature: FeatureType,
    onLimitReached?: () => void
  ): Promise<boolean> => {
    if (!user) return false;
    
    return await enforceUsageLimit(user.id, feature, onLimitReached);
  }, [user]);

  // Refresh usage data
  const refreshUsage = useCallback(async () => {
    await loadUsageData();
  }, [loadUsageData]);

  // Check if user can use a feature (from local state)
  const canUseFeature = useCallback((feature: FeatureType): boolean => {
    return checks[feature]?.canUse ?? false;
  }, [checks]);

  // Get remaining usage for a feature
  const getRemainingUsage = useCallback((feature: FeatureType): number => {
    return checks[feature]?.remaining ?? 0;
  }, [checks]);

  // Check if user needs upgrade
  const needsUpgrade = Object.values(checks).some(check => !check.canUse);

  // Get features that need upgrade
  const featuresNeedingUpgrade = Object.entries(checks)
    .filter(([_, check]) => !check.canUse)
    .map(([feature, _]) => feature as FeatureType);

  return {
    // State
    loading,
    error,
    usage,
    subscription,
    plan,
    limits,
    checks,
    
    // Actions
    checkUsage,
    enforceLimit,
    refreshUsage,
    
    // Utilities
    canUseFeature,
    getRemainingUsage,
    needsUpgrade,
    featuresNeedingUpgrade
  };
}

// Hook for checking a specific feature
export function useFeatureUsage(feature: FeatureType) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<UsageCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkUsage = useCallback(async () => {
    if (!user) return null;
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await checkFeatureUsage(user.id, feature);
      setCheckResult(result);
      
      return result;
    } catch (err) {
      console.error('Error checking feature usage:', err);
      setError('Failed to check usage');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, feature]);

  const enforceLimit = useCallback(async (onLimitReached?: () => void): Promise<boolean> => {
    if (!user) return false;
    
    return await enforceUsageLimit(user.id, feature, onLimitReached);
  }, [user, feature]);

  return {
    loading,
    error,
    checkResult,
    checkUsage,
    enforceLimit,
    canUse: checkResult?.canUse ?? false,
    currentUsage: checkResult?.currentUsage ?? 0,
    limit: checkResult?.limit ?? 0,
    remaining: checkResult?.remaining ?? 0,
    isUnlimited: checkResult?.isUnlimited ?? false
  };
}