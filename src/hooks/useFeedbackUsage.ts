import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UsageInfo {
  current: number;
  limit: number;
  plan: string;
  resetDate: string;
  isUnlimited: boolean;
}

interface PlanLimits {
  free: number;
  pro: number;
  business: number;
}

const PLAN_LIMITS: PlanLimits = {
  free: 50,
  pro: 300,
  business: -1 // unlimited
};

export const useFeedbackUsage = () => {
  const { user } = useAuth();
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageInfo = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current month start date
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      // Get user's billing profile
      const { data: billingProfile, error: billingError } = await supabase
        .from('billing_profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      if (billingError) {
        throw new Error('Failed to fetch billing profile');
      }

      const userPlan = billingProfile?.plan || 'free';
      const planLimit = PLAN_LIMITS[userPlan as keyof PlanLimits];

      // Get usage counter for current month
      const { data: usageCounter, error: usageError } = await supabase
        .from('usage_counters')
        .select('feedback_count')
        .eq('user_id', user.id)
        .eq('month_start', monthStartStr)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        throw new Error('Failed to fetch usage counter');
      }

      const currentUsage = usageCounter?.feedback_count || 0;
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];

      setUsageInfo({
        current: currentUsage,
        limit: planLimit,
        plan: userPlan,
        resetDate: resetDate,
        isUnlimited: userPlan === 'business'
      });

    } catch (err) {
      console.error('Error fetching usage info:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch usage information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageInfo();
  }, [user]);

  const refreshUsage = () => {
    fetchUsageInfo();
  };

  const canSubmitFeedback = (): boolean => {
    if (!usageInfo) return false;
    if (usageInfo.isUnlimited) return true;
    return usageInfo.current < usageInfo.limit;
  };

  const getUsagePercentage = (): number => {
    if (!usageInfo || usageInfo.isUnlimited) return 0;
    return Math.round((usageInfo.current / usageInfo.limit) * 100);
  };

  const getRemainingFeedback = (): number => {
    if (!usageInfo || usageInfo.isUnlimited) return -1; // unlimited
    return Math.max(0, usageInfo.limit - usageInfo.current);
  };

  return {
    usageInfo,
    loading,
    error,
    refreshUsage,
    canSubmitFeedback,
    getUsagePercentage,
    getRemainingFeedback
  };
};