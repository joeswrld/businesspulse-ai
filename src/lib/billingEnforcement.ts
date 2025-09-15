import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for the billing enforcement system
export type PlanTier = 'free' | 'pro' | 'business';
export type FeatureType = 'feedback' | 'insights' | 'reports';

export interface UsageLimits {
  feedback: number;
  insights: number;
  reports: number;
  retention_days: number | null;
}

export interface UsageData {
  user_id: string;
  period_start: string;
  period_end: string;
  feedback_count: number;
  insights_count: number;
  reports_count: number;
  last_reset: string;
  updated_at: string;
}

export interface SubscriptionData {
  id: string;
  user_id: string;
  plan_code: string;
  plan_tier: PlanTier;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  paystack_subscription_code?: string;
  paystack_email_token?: string;
  created_at: string;
  updated_at: string;
}

export interface PlanData {
  code: string;
  name: string;
  tier: PlanTier;
  interval: string;
  price_kobo: number;
  limits: UsageLimits;
}

export interface UsageCheckResult {
  canUse: boolean;
  currentUsage: number;
  limit: number;
  plan: PlanTier;
  feature: FeatureType;
  isUnlimited: boolean;
  remaining: number;
  isTrialExpired: boolean;
  daysUntilExpiry: number;
}

// Plan limits configuration - matches the real-world billing flow
export const PLAN_LIMITS: Record<PlanTier, UsageLimits> = {
  free: {
    feedback: 50,
    insights: 5,
    reports: 5,
    retention_days: 8
  },
  pro: {
    feedback: 300,
    insights: 50,
    reports: 20,
    retention_days: 365
  },
  business: {
    feedback: -1, // unlimited
    insights: -1,
    reports: -1,
    retention_days: null // unlimited
  }
};

// Plan display names
export const PLAN_NAMES: Record<PlanTier, string> = {
  free: 'Free Plan',
  pro: 'Pro Plan',
  business: 'Business Plan'
};

// Plan pricing (for upgrade prompts)
export const PLAN_PRICING: Record<PlanTier, string> = {
  free: 'Free',
  pro: '₦35,000/month',
  business: '₦53,000/month'
};

/**
 * Get user's current subscription data
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionData | null> {
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

    // Map the data to match SubscriptionData interface
    if (data) {
      return {
        id: data.id,
        user_id: data.user_id,
        plan_code: data.plan_code || 'free',
        plan_tier: data.plan_name?.toLowerCase() === 'pro' ? 'pro' : 
                   data.plan_name?.toLowerCase() === 'business' ? 'business' : 'free',
        status: data.status as any,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        cancel_at_period_end: data.cancel_at_period_end || false,
        paystack_subscription_code: (data as any).paystack_subscription_id,
        paystack_email_token: (data as any).paystack_email_token,
        created_at: data.created_at,
        updated_at: data.updated_at,
      } as SubscriptionData;
    }

    return null;
  } catch (error) {
    console.error('Error in getUserSubscription:', error);
    return null;
  }
}

/**
 * Get user's current usage data
 */
export async function getUserUsage(userId: string): Promise<UsageData | null> {
  try {
    // Use rolling 30-day cycle from usage_counters via RPC
    const { data, error } = await (supabase as any)
      .rpc('ensure_current_cycle_usage', { user_uuid: userId });

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching usage data:', error);
      return null;
    }

    // ensure_current_cycle_usage returns a row or array; normalize
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      const cycleStart = row.cycle_start || row.period_start || row.month_start;
      const updatedAt = row.updated_at || new Date().toISOString();
      return {
        user_id: row.user_id,
        period_start: cycleStart,
        period_end: new Date(new Date(cycleStart).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        feedback_count: row.feedback_count || 0,
        insights_count: row.insights_count || 0,
        reports_count: row.reports_count || 0,
        last_reset: updatedAt,
        updated_at: updatedAt,
      } as UsageData;
    }

    return null;
  } catch (error) {
    console.error('Error in getUserUsage:', error);
    return null;
  }
}

/**
 * Check if user can use a specific feature
 */
export function checkUsageLimit(
  feature: FeatureType,
  currentUsage: number,
  plan: PlanTier,
  isTrialExpired: boolean = false
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
    remaining,
    isTrialExpired,
    daysUntilExpiry: 0
  };
}

/**
 * Check if user's trial has expired
 */
export function isTrialExpired(subscription: SubscriptionData | null): boolean {
  // Free plan rolls every 30 days; no expiration concept
  return false;
}

/**
 * Get days until trial/subscription expires
 */
export function getDaysUntilExpiry(subscription: SubscriptionData | null): number {
  // Handled in getUsageSummary using the rolling cycle window
  return 0;
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

    if (!usage || !subscription) {
      console.error('No usage or subscription data found for user:', userId);
      return null;
    }

    const plan = subscription.plan_tier;
    const currentUsage = usage[`${feature}_count` as keyof UsageData] as number;
    const trialExpired = isTrialExpired(subscription);
    // Compute days until cycle reset
    let daysUntilExpiry = 0;
    if (usage?.period_end) {
      const end = new Date(usage.period_end);
      const now = new Date();
      daysUntilExpiry = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const result = checkUsageLimit(feature, currentUsage, plan, trialExpired);
    
    return {
      ...result,
      isTrialExpired: trialExpired,
      daysUntilExpiry
    };
  } catch (error) {
    console.error('Error in checkFeatureUsage:', error);
    return null;
  }
}

/**
 * Show upgrade prompt based on the result
 */
export function showUpgradePrompt(result: UsageCheckResult): void {
  if (result.isTrialExpired) {
    toast.error('Trial Expired', {
      description: `Your free trial has ended. Upgrade to continue using ${result.feature} features.`,
      action: {
        label: 'Upgrade Now',
        onClick: () => {
          window.location.href = '/billing';
        }
      }
    });
    return;
  }

  if (result.isUnlimited) {
    return; // No need to show upgrade prompt for unlimited plans
  }

  const nextPlan = result.plan === 'free' ? 'pro' : 'business';
  const nextPlanLimit = PLAN_LIMITS[nextPlan][result.feature];
  const nextPlanLimitText = nextPlanLimit === -1 ? 'Unlimited' : nextPlanLimit.toString();

  toast.error('Limit Reached', {
    description: `You have reached your ${result.feature} limit (${result.currentUsage}/${result.limit}). Upgrade to ${PLAN_NAMES[nextPlan]} for ${nextPlanLimitText} ${result.feature}.`,
    action: {
      label: 'Upgrade Now',
      onClick: () => {
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
      showUpgradePrompt(result);
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
  subscription: SubscriptionData | null;
  plan: PlanTier;
  limits: UsageLimits;
  checks: Record<FeatureType, UsageCheckResult>;
  isTrialExpired: boolean;
  daysUntilExpiry: number;
}> {
  try {
    const [usage, subscription] = await Promise.all([
      getUserUsage(userId),
      getUserSubscription(userId)
    ]);

    const plan = subscription?.plan_tier || 'free';
    const limits = PLAN_LIMITS[plan];
    const trialExpired = isTrialExpired(subscription);
    const daysUntilExpiry = getDaysUntilExpiry(subscription);

    const checks: Record<FeatureType, UsageCheckResult> = {
      feedback: checkUsageLimit('feedback', usage?.feedback_count || 0, plan, trialExpired),
      insights: checkUsageLimit('insights', usage?.insights_count || 0, plan, trialExpired),
      reports: checkUsageLimit('reports', usage?.reports_count || 0, plan, trialExpired)
    };

    return {
      usage,
      subscription,
      plan,
      limits,
      checks,
      isTrialExpired: trialExpired,
      daysUntilExpiry
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

/**
 * Format usage display string
 */
export function formatUsageDisplay(
  currentUsage: number,
  limit: number,
  plan: PlanTier,
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
export function getUpgradeOptions(currentPlan: PlanTier): PlanTier[] {
  switch (currentPlan) {
    case 'free':
      return ['pro', 'business'];
    case 'pro':
      return ['business'];
    case 'business':
      return [];
    default:
      return [];
  }
}