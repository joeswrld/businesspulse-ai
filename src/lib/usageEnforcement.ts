import { supabase } from '@/integrations/supabase/client';

export type FeatureType = 'feedback' | 'insights' | 'analytics' | 'reports';

export interface UsageEnforcementResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
}

/**
 * Check if a user can perform a specific action based on their usage limits
 */
export async function checkFeatureAccess(
  userId: string, 
  featureType: FeatureType
): Promise<UsageEnforcementResult> {
  try {
    const { data, error } = await supabase.rpc('check_usage_limit', {
      user_uuid: userId,
      feature_type: featureType
    });

    if (error) {
      console.error('Error checking usage limit:', error);
      return {
        allowed: false,
        reason: 'Unable to verify usage limits',
        upgradeRequired: true
      };
    }

    if (data === true) {
      return { allowed: true };
    }

    // Get user's plan to determine the appropriate message
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', userId)
      .single();

    const planType = subscription?.plan_type || 'trial';
    
    if (planType === 'trial') {
      return {
        allowed: false,
        reason: 'Trial expired or limit reached. Upgrade to Pro or Business to continue.',
        upgradeRequired: true
      };
    } else {
      return {
        allowed: false,
        reason: 'Usage limit reached. Upgrade to Business for unlimited access.',
        upgradeRequired: true
      };
    }
  } catch (error) {
    console.error('Error in checkFeatureAccess:', error);
    return {
      allowed: false,
      reason: 'Unable to verify usage limits',
      upgradeRequired: true
    };
  }
}

/**
 * Check if a user's trial has expired
 */
export async function isTrialExpired(userId: string): Promise<boolean> {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('plan_type, trial_end')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      // If no subscription found, assume trial expired
      return true;
    }

    if (subscription.plan_type !== 'trial') {
      return false;
    }

    if (!subscription.trial_end) {
      return true;
    }

    return new Date() > new Date(subscription.trial_end);
  } catch (error) {
    console.error('Error checking trial status:', error);
    return true; // Assume expired on error
  }
}

/**
 * Get user's current plan type
 */
export async function getUserPlanType(userId: string): Promise<'trial' | 'pro' | 'business'> {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      return 'trial';
    }

    return subscription.plan_type as 'trial' | 'pro' | 'business';
  } catch (error) {
    console.error('Error getting user plan type:', error);
    return 'trial';
  }
}

/**
 * Create or update user subscription
 */
export async function createOrUpdateSubscription(
  userId: string,
  planType: 'trial' | 'pro' | 'business',
  renewalDate?: string,
  trialEnd?: string
): Promise<boolean> {
  try {
    const subscriptionData: any = {
      user_id: userId,
      plan_type: planType,
      is_active: true,
      updated_at: new Date().toISOString()
    };

    if (renewalDate) {
      subscriptionData.renewal_date = renewalDate;
    }

    if (trialEnd) {
      subscriptionData.trial_end = trialEnd;
    }

    if (planType === 'trial') {
      subscriptionData.trial_start = new Date().toISOString();
      subscriptionData.trial_end = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { error } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('Error creating/updating subscription:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createOrUpdateSubscription:', error);
    return false;
  }
}

/**
 * Refresh user usage data for the current month
 */
export async function refreshUserUsage(userId: string): Promise<boolean> {
  try {
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const { error } = await supabase.rpc('refresh_user_usage', {
      user_uuid: userId,
      target_month_start: currentMonthStart.toISOString().split('T')[0]
    });

    if (error) {
      console.error('Error refreshing user usage:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in refreshUserUsage:', error);
    return false;
  }
}

/**
 * Hook for feature access checking with React
 */
export function useFeatureAccess(userId: string) {
  const checkAccess = async (featureType: FeatureType) => {
    return await checkFeatureAccess(userId, featureType);
  };

  const checkTrialStatus = async () => {
    return await isTrialExpired(userId);
  };

  const getPlanType = async () => {
    return await getUserPlanType(userId);
  };

  const refreshUsage = async () => {
    return await refreshUserUsage(userId);
  };

  return {
    checkAccess,
    checkTrialStatus,
    getPlanType,
    refreshUsage
  };
}