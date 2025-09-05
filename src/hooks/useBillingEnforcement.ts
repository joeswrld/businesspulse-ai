import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  checkFeatureUsage,
  enforceUsageLimit,
  getUsageSummary,
  needsUpgrade,
  getFeaturesNeedingUpgrade,
  formatUsageDisplay,
  getUpgradeOptions,
  type PlanTier,
  type FeatureType,
  type UsageCheckResult,
  type UsageData,
  type SubscriptionData,
  type UsageLimits
} from '@/lib/billingEnforcement';

export interface UseBillingEnforcementReturn {
  // Data
  usage: UsageData | null;
  subscription: SubscriptionData | null;
  plan: PlanTier;
  limits: UsageLimits;
  checks: Record<FeatureType, UsageCheckResult>;
  isTrialExpired: boolean;
  daysUntilExpiry: number;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  checkUsage: (feature: FeatureType) => Promise<UsageCheckResult | null>;
  enforceLimit: (feature: FeatureType, onLimitReached?: () => void) => Promise<boolean>;
  refreshData: () => Promise<void>;
  
  // Utilities
  needsUpgrade: boolean;
  featuresNeedingUpgrade: FeatureType[];
  formatUsage: (feature: FeatureType) => string;
  getUpgradeOptions: () => PlanTier[];
  hasActiveAccess: boolean;
  isTrialActive: boolean;
}

/**
 * React hook for billing enforcement and usage tracking
 * 
 * @returns Object containing billing data, usage checks, and enforcement functions
 * 
 * @example
 * ```tsx
 * const { 
 *   usage, 
 *   subscription, 
 *   plan, 
 *   enforceLimit, 
 *   hasActiveAccess,
 *   isTrialActive 
 * } = useBillingEnforcement();
 * 
 * async function handleSubmitFeedback() {
 *   const canUse = await enforceLimit('feedback');
 *   if (canUse) {
 *     // Proceed with feedback submission
 *   }
 * }
 * ```
 */
export function useBillingEnforcement(): UseBillingEnforcementReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Billing data state
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [plan, setPlan] = useState<PlanTier>('free');
  const [limits, setLimits] = useState<UsageLimits>({
    feedback: 50,
    insights: 5,
    reports: 2,
    retention_days: 30
  });
  const [checks, setChecks] = useState<Record<FeatureType, UsageCheckResult>>({
    feedback: {
      canUse: true,
      currentUsage: 0,
      limit: 50,
      plan: 'free',
      feature: 'feedback',
      isUnlimited: false,
      remaining: 50,
      isTrialExpired: false,
      daysUntilExpiry: 8
    },
    insights: {
      canUse: true,
      currentUsage: 0,
      limit: 5,
      plan: 'free',
      feature: 'insights',
      isUnlimited: false,
      remaining: 5,
      isTrialExpired: false,
      daysUntilExpiry: 8
    },
    reports: {
      canUse: true,
      currentUsage: 0,
      limit: 2,
      plan: 'free',
      feature: 'reports',
      isUnlimited: false,
      remaining: 2,
      isTrialExpired: false,
      daysUntilExpiry: 8
    }
  });
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState(8);

  /**
   * Refresh billing data
   */
  const refreshData = useCallback(async () => {
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
      setIsTrialExpired(summary.isTrialExpired);
      setDaysUntilExpiry(summary.daysUntilExpiry);

    } catch (err) {
      console.error('Error refreshing billing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Check usage for a specific feature
   */
  const checkUsage = useCallback(async (feature: FeatureType): Promise<UsageCheckResult | null> => {
    if (!user) return null;

    try {
      return await checkFeatureUsage(user.id, feature);
    } catch (err) {
      console.error('Error checking usage:', err);
      setError(err instanceof Error ? err.message : 'Failed to check usage');
      return null;
    }
  }, [user]);

  /**
   * Enforce usage limit for a feature
   */
  const enforceLimit = useCallback(async (
    feature: FeatureType, 
    onLimitReached?: () => void
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      return await enforceUsageLimit(user.id, feature, onLimitReached);
    } catch (err) {
      console.error('Error enforcing limit:', err);
      setError(err instanceof Error ? err.message : 'Failed to enforce limit');
      return false;
    }
  }, [user]);

  /**
   * Format usage display for a feature
   */
  const formatUsage = useCallback((feature: FeatureType): string => {
    const check = checks[feature];
    return formatUsageDisplay(check.currentUsage, check.limit, plan, feature);
  }, [checks, plan]);

  /**
   * Get upgrade options for current plan
   */
  const getUpgradeOptionsForPlan = useCallback((): PlanTier[] => {
    return getUpgradeOptions(plan);
  }, [plan]);

  // Computed values
  const needsUpgradeCheck = needsUpgrade(checks);
  const featuresNeedingUpgrade = getFeaturesNeedingUpgrade(checks);
  const hasActiveAccess = subscription?.status === 'active' || (!isTrialExpired && subscription?.status === 'trialing');
  const isTrialActive = subscription?.status === 'trialing' && !isTrialExpired;

  // Load data on mount and when user changes
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    // Data
    usage,
    subscription,
    plan,
    limits,
    checks,
    isTrialExpired,
    daysUntilExpiry,
    
    // State
    loading,
    error,
    
    // Actions
    checkUsage,
    enforceLimit,
    refreshData,
    
    // Utilities
    needsUpgrade: needsUpgradeCheck,
    featuresNeedingUpgrade,
    formatUsage,
    getUpgradeOptions: getUpgradeOptionsForPlan,
    hasActiveAccess,
    isTrialActive
  };
}

/**
 * Hook for tracking usage with automatic enforcement
 * This version automatically checks and enforces limits before allowing actions
 */
export function useBillingEnforcementWithTracking(): UseBillingEnforcementReturn & {
  trackUsage: (feature: FeatureType, onLimitReached?: () => void) => Promise<boolean>;
} {
  const billingData = useBillingEnforcement();
  const [trackingLoading, setTrackingLoading] = useState(false);

  const trackUsage = useCallback(async (
    feature: FeatureType, 
    onLimitReached?: () => void
  ): Promise<boolean> => {
    setTrackingLoading(true);
    
    try {
      // First check if user can use the feature
      const canUse = await billingData.enforceLimit(feature, onLimitReached);
      
      if (!canUse) {
        return false;
      }

      // If they can use it, track the usage via the usage API
      // This will increment the counter and enforce limits server-side
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session found');
      }

      const supabaseUrl = (supabase as any).supabaseUrl;
      const response = await fetch(`${supabaseUrl}/functions/v1/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: feature }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to track usage');
      }

      // Refresh billing data to get updated usage counts
      await billingData.refreshData();
      
      return true;
    } catch (error) {
      console.error('Error tracking usage:', error);
      return false;
    } finally {
      setTrackingLoading(false);
    }
  }, [billingData]);

  return {
    ...billingData,
    loading: billingData.loading || trackingLoading,
    trackUsage
  };
}