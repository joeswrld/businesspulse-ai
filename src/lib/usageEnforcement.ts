import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'free_trial' | 'business';

export interface UsageLimits {
  feedbackCount: number;
  insightsCount: number;
  analyticsCount: number;
  reportsCount: number;
}

export interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

const PLAN_LIMITS: Record<PlanType, UsageLimits> = {
  free_trial: {
    feedbackCount: 50,
    insightsCount: 10,
    analyticsCount: 5,
    reportsCount: 2,
  },
  business: {
    feedbackCount: -1, // Unlimited
    insightsCount: -1,
    analyticsCount: -1,
    reportsCount: -1,
  },
};

/**
 * Check if a user can perform a specific action based on their plan and current usage
 */
export async function checkUsageLimit(userId: string, action: keyof UsageLimits): Promise<EnforcementResult> {
  try {
    // Use profiles table for plan information
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan, is_active, trial_end')
      .eq('user_id', userId)
      .single();

    const planType = (profile?.plan || 'free_trial') as PlanType;
    
    // Check if user has active business plan
    if (planType === 'business' && profile?.is_active) {
      return { allowed: true };
    }

    // Check if trial is expired
    if (planType === 'free_trial' && profile?.trial_end) {
      const isExpired = new Date() > new Date(profile.trial_end);
      if (isExpired) {
        return {
          allowed: false,
          reason: 'Trial expired. Upgrade to Business to continue.',
          upgradeRequired: true
        };
      }
    }
    
    // Get plan limits
    const limits = PLAN_LIMITS[planType];
    const limit = limits[action];
    
    // If unlimited (-1), allow
    if (limit === -1) {
      return { allowed: true };
    }
    
    // Get current usage
    const currentUsage = await getCurrentUsage(userId, action);
    
    if (currentUsage >= limit) {
      return {
        allowed: false,
        reason: `${action} limit reached (${limit}). Upgrade to Business for unlimited access.`,
        upgradeRequired: true
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking usage limit:', error);
    return {
      allowed: false,
      reason: 'Error checking usage limits',
      upgradeRequired: false
    };
  }
}

/**
 * Check if trial has expired for a user
 */
export async function isTrialExpired(userId: string): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan, trial_end, is_active')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      // If no profile found, assume trial expired
      return true;
    }

    // Business users with active subscription are never expired
    if (profile.plan === 'business' && profile.is_active) {
      return false;
    }

    // Check trial expiration for free trial users
    if (profile.plan === 'free_trial' && profile.trial_end) {
      return new Date() > new Date(profile.trial_end);
    }

    // Default to expired if no trial end date
    return true;
  } catch (error) {
    console.error('Error checking trial status:', error);
    return true; // Assume expired on error
  }
}

/**
 * Get user's current plan type
 */
export async function getUserPlanType(userId: string): Promise<PlanType> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      return 'free_trial';
    }

    return (profile.plan || 'free_trial') as PlanType;
  } catch (error) {
    console.error('Error getting user plan type:', error);
    return 'free_trial';
  }
}

/**
 * Get current usage count for a specific action
 */
async function getCurrentUsage(userId: string, action: keyof UsageLimits): Promise<number> {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01
    
    const { data: usage, error } = await supabase
      .from('usage_counters')
      .select('*')
      .eq('user_id', userId)
      .eq('month_start', currentMonth)
      .single();
    
    if (error || !usage) {
      return 0;
    }
    
    switch (action) {
      case 'feedbackCount':
        return usage.feedback_count || 0;
      case 'insightsCount':
        return usage.insights_count || 0;
      case 'analyticsCount':
        return usage.analytics_count || 0;
      case 'reportsCount':
        return usage.reports_count || 0;
      default:
        return 0;
    }
  } catch (error) {
    console.error('Error getting current usage:', error);
    return 0;
  }
}

/**
 * Increment usage counter for a specific action
 */
export async function incrementUsage(userId: string, action: keyof UsageLimits): Promise<void> {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01
    
    // First ensure the usage counter exists
    const { error: upsertError } = await supabase
      .from('usage_counters')
      .upsert({
        user_id: userId,
        month_start: currentMonth,
        feedback_count: 0,
        insights_count: 0,
        analytics_count: 0,
        reports_count: 0,
      }, { 
        onConflict: 'user_id,month_start',
        ignoreDuplicates: true 
      });
    
    if (upsertError) {
      console.warn('Error ensuring usage counter exists:', upsertError);
    }
    
    // Then increment the specific counter
    let updateField: string;
    switch (action) {
      case 'feedbackCount':
        updateField = 'feedback_count';
        break;
      case 'insightsCount':
        updateField = 'insights_count';
        break;
      case 'analyticsCount':
        updateField = 'analytics_count';
        break;
      case 'reportsCount':
        updateField = 'reports_count';
        break;
      default:
        return;
    }
    
    // Get current count and increment by 1
    const { data: current, error: fetchError } = await supabase
      .from('usage_counters')
      .select(updateField)
      .eq('user_id', userId)
      .eq('month_start', currentMonth)
      .single();
    
    if (fetchError) {
      console.warn('Error fetching current usage:', fetchError);
      return;
    }
    
    const newValue = (current?.[updateField] || 0) + 1;
    
    const { error } = await supabase
      .from('usage_counters')
      .update({ [updateField]: newValue })
      .eq('user_id', userId)
      .eq('month_start', currentMonth);
    
    if (error) {
      console.error(`Error incrementing ${action}:`, error);
    }
  } catch (error) {
    console.error('Error incrementing usage:', error);
  }
}

/**
 * Get usage summary for a user
 */
export async function getUsageSummary(userId: string): Promise<UsageLimits & { planType: PlanType }> {
  try {
    const planType = await getUserPlanType(userId);
    const currentUsage = await Promise.all([
      getCurrentUsage(userId, 'feedbackCount'),
      getCurrentUsage(userId, 'insightsCount'),
      getCurrentUsage(userId, 'analyticsCount'),
      getCurrentUsage(userId, 'reportsCount'),
    ]);
    
    return {
      feedbackCount: currentUsage[0],
      insightsCount: currentUsage[1],
      analyticsCount: currentUsage[2],
      reportsCount: currentUsage[3],
      planType,
    };
  } catch (error) {
    console.error('Error getting usage summary:', error);
    return {
      feedbackCount: 0,
      insightsCount: 0,
      analyticsCount: 0,
      reportsCount: 0,
      planType: 'free_trial',
    };
  }
}