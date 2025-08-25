import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export type PlanType = 'free' | 'pro' | 'business' | 'enterprise';
export type FeatureType = 'feedback' | 'analytics' | 'reports' | 'insights' | 'teams';

export interface UsageLimits {
  feedback: number;
  analytics: number;
  reports: number;
  insights: number;
  teams: number;
}

export interface UsageData {
  id: string;
  user_id: string;
  feedback_count: number;
  analytics_count: number;
  reports_count: number;
  insights_count: number;
  teams_count: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: 'active' | 'trialing' | 'cancelled' | 'past_due';
  plan_id: string;
  current_period_start: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageCheckResult {
  canUse: boolean;
  currentUsage: number;
  limit: number;
  plan: PlanType;
  feature: FeatureType;
  isUnlimited: boolean;
  remaining: number;
}

// Plan limits configuration
export const PLAN_LIMITS: Record<PlanType, UsageLimits> = {
  free: {
    feedback: 50,
    analytics: 5,
    reports: 2,
    insights: 5,
    teams: 1
  },
  pro: {
    feedback: 200,
    analytics: 100,
    reports: 20,
    insights: 50,
    teams: 5
  },
  business: {
    feedback: -1, // unlimited
    analytics: -1,
    reports: -1,
    insights: -1,
    teams: -1
  },
  enterprise: {
    feedback: -1, // unlimited
    analytics: -1,
    reports: -1,
    insights: -1,
    teams: -1
  }
};

// Plan upgrade paths
export const UPGRADE_PATHS: Record<PlanType, PlanType[]> = {
  free: ['pro', 'business'],
  pro: ['business'],
  business: ['enterprise'],
  enterprise: []
};

// Plan display names
export const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Free Trial',
  pro: 'Pro Plan',
  business: 'Business Plan',
  enterprise: 'Enterprise Plan'
};

// Plan pricing (for upgrade prompts)
export const PLAN_PRICING: Record<PlanType, string> = {
  free: 'Free',
  pro: '$29/month',
  business: '$99/month',
  enterprise: 'Contact Sales'
};

/**
 * Determine user's plan from subscription data
 */
export function getUserPlan(subscription: Subscription | null): PlanType {
  if (!subscription) return 'free';
  
  const planId = subscription.plan_id?.toLowerCase() || '';
  
  if (planId.includes('enterprise')) return 'enterprise';
  if (planId.includes('business')) return 'business';
  if (planId.includes('pro') || planId.includes('premium')) return 'pro';
  
  return 'free';
}

/**
 * Check if user can use a specific feature
 */
export function checkUsage(
  feature: FeatureType,
  currentUsage: number,
  plan: PlanType
): UsageCheckResult {
  const limit = PLAN_LIMITS[plan][feature];
  const isUnlimited = limit === -1;
  const canUse = isUnlimited || currentUsage < limit;
  const remaining = isUnlimited ? -1 : Math.max(0, limit - currentUsage);

  return {
    canUse,
    currentUsage,
    limit,
    plan,
    feature,
    isUnlimited,
    remaining
  };
}

/**
 * Get usage data for a user
 */
export async function getUserUsage(userId: string): Promise<UsageData | null> {
  try {
    const { data, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching usage data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserUsage:', error);
    return null;
  }
}

/**
 * Get subscription data for a user
 */
export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserSubscription:', error);
    return null;
  }
}

/**
 * Check if user can use a feature (with data fetching)
 */
export async function checkFeatureUsage(
  userId: string,
  feature: FeatureType
): Promise<UsageCheckResult | null> {
  try {
    const [usage, subscription] = await Promise.all([
      getUserUsage(userId),
      getUserSubscription(userId)
    ]);

    if (!usage) {
      console.error('No usage data found for user:', userId);
      return null;
    }

    const plan = getUserPlan(subscription);
    const currentUsage = usage[`${feature}_count` as keyof UsageData] as number;

    return checkUsage(feature, currentUsage, plan);
  } catch (error) {
    console.error('Error in checkFeatureUsage:', error);
    return null;
  }
}

/**
 * Format usage display string
 */
export function formatUsageDisplay(
  currentUsage: number,
  limit: number,
  plan: PlanType,
  feature: FeatureType
): string {
  const featureName = feature.charAt(0).toUpperCase() + feature.slice(1);
  
  if (limit === -1) {
    return `${featureName}: ${currentUsage} (Unlimited - ${PLAN_NAMES[plan]})`;
  }
  
  return `${featureName}: ${currentUsage} / ${limit} (${PLAN_NAMES[plan]})`;
}

/**
 * Get upgrade options for current plan
 */
export function getUpgradeOptions(currentPlan: PlanType): PlanType[] {
  return UPGRADE_PATHS[currentPlan] || [];
}

/**
 * Show upgrade prompt
 */
export function showUpgradePrompt(
  feature: FeatureType,
  currentPlan: PlanType,
  currentUsage: number,
  limit: number
): void {
  const upgradeOptions = getUpgradeOptions(currentPlan);
  
  if (upgradeOptions.length === 0) {
    toast.error('Limit Reached', {
      description: `You have reached your ${feature} limit (${currentUsage}/${limit}). Contact support for assistance.`
    });
    return;
  }

  const nextPlan = upgradeOptions[0];
  const nextPlanLimit = PLAN_LIMITS[nextPlan][feature];
  const nextPlanLimitText = nextPlanLimit === -1 ? 'Unlimited' : nextPlanLimit.toString();

  toast.error('Limit Reached', {
    description: `You have reached your ${feature} limit (${currentUsage}/${limit}). Upgrade to ${PLAN_NAMES[nextPlan]} for ${nextPlanLimitText} ${feature}.`,
    action: {
      label: 'Upgrade Now',
      onClick: () => {
        // Navigate to billing page or upgrade flow
        window.location.href = '/billing';
      }
    }
  });
}

/**
 * Enforce usage limit with UI feedback
 */
export async function enforceUsageLimit(
  userId: string,
  feature: FeatureType,
  onLimitReached?: () => void
): Promise<boolean> {
  try {
    const result = await checkFeatureUsage(userId, feature);
    
    if (!result) {
      toast.error('Error', {
        description: 'Unable to check usage limits. Please try again.'
      });
      return false;
    }

    if (!result.canUse) {
      showUpgradePrompt(feature, result.plan, result.currentUsage, result.limit);
      onLimitReached?.();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in enforceUsageLimit:', error);
    toast.error('Error', {
      description: 'Unable to check usage limits. Please try again.'
    });
    return false;
  }
}

/**
 * Get usage summary for all features
 */
export async function getUsageSummary(userId: string): Promise<{
  usage: UsageData | null;
  subscription: Subscription | null;
  plan: PlanType;
  limits: UsageLimits;
  checks: Record<FeatureType, UsageCheckResult>;
}> {
  try {
    const [usage, subscription] = await Promise.all([
      getUserUsage(userId),
      getUserSubscription(userId)
    ]);

    const plan = getUserPlan(subscription);
    const limits = PLAN_LIMITS[plan];

    const checks: Record<FeatureType, UsageCheckResult> = {
      feedback: checkUsage('feedback', usage?.feedback_count || 0, plan),
      analytics: checkUsage('analytics', usage?.analytics_count || 0, plan),
      reports: checkUsage('reports', usage?.reports_count || 0, plan),
      insights: checkUsage('insights', usage?.insights_count || 0, plan),
      teams: checkUsage('teams', usage?.teams_count || 0, plan)
    };

    return {
      usage,
      subscription,
      plan,
      limits,
      checks
    };
  } catch (error) {
    console.error('Error in getUsageSummary:', error);
    throw error;
  }
}

/**
 * Check if user needs to upgrade
 */
export function needsUpgrade(checks: Record<FeatureType, UsageCheckResult>): boolean {
  return Object.values(checks).some(check => !check.canUse);
}

/**
 * Get features that need upgrade
 */
export function getFeaturesNeedingUpgrade(checks: Record<FeatureType, UsageCheckResult>): FeatureType[] {
  return Object.entries(checks)
    .filter(([_, check]) => !check.canUse)
    .map(([feature, _]) => feature as FeatureType);
}