// hooks/useUsageOverview.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UsageData {
  feedback_count: number;
  insights_count: number;
  analytics_count: number;
  reports_count: number;
}

export interface SubscriptionData {
  plan_type: 'trial' | 'business';
  plan_code: string | null;
  plan_name: string | null;
  renewal_date: string | null;
  trial_start: string | null;
  trial_end: string | null;
  is_active: boolean;
}

export interface UsageOverviewData {
  subscription: SubscriptionData;
  usage: UsageData;
  limits: {
    feedback: number;
    insights: number;
    analytics: number;
    reports: number;
  };
  remaining: {
    feedback: number;
    insights: number;
    analytics: number;
    reports: number;
  };
  percentages: {
    feedback: number;
    insights: number;
    analytics: number;
    reports: number;
  };
  isTrialExpired: boolean;
  isLimitReached: {
    feedback: boolean;
    insights: boolean;
    analytics: boolean;
    reports: boolean;
  };
  monthStart: string;
}

const FALLBACK_PLAN_LIMITS = {
  trial: { feedback: 50, insights: 5, analytics: 10, reports: 5 },
  business: { feedback: -1, insights: -1, analytics: -1, reports: -1 },
};

export const useUsageOverview = (userId: string) => {
  const [data, setData] = useState<UsageOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentMonthStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  };

  const fetchSubscription = async (): Promise<SubscriptionData> => {
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sub && ['active', 'trialing', 'past_due'].includes(sub.status)) {
      const isBusiness = (sub.plan_code || '').toLowerCase().includes('business');
      return {
        plan_type: isBusiness ? 'business' : 'trial',
        plan_code: sub.plan_code || null,
        plan_name: sub.plan_name || null,
        renewal_date: sub.current_period_end,
        trial_start: null,
        trial_end: sub.current_period_end,
        is_active: sub.status === 'active',
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, trial_start, trial_end, is_active')
      .eq('user_id', userId)
      .single();

    const planType = profile?.plan === 'business' ? 'business' as const : 'trial' as const;
    return {
      plan_type: planType,
      plan_code: planType === 'business' ? 'business' : 'trial',
      plan_name: planType === 'business' ? 'Business' : 'Free Trial',
      renewal_date: null,
      trial_start: profile?.trial_start || null,
      trial_end: profile?.trial_end || null,
      is_active: Boolean(profile?.is_active),
    };
  };

  const fetchUsageData = async (monthStart: string): Promise<{ usage: UsageData; monthStartOut: string }> => {
    try {
      const { data: usageRows } = await supabase.rpc('get_user_usage_with_monthly_reset', { user_uuid: userId });
      const row = Array.isArray(usageRows) && usageRows.length ? usageRows[0] : null;

      // Total feedback count for this user
      let feedbackCount = 0;
      try {
        const { count } = await supabase
          .from('feedback')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', row?.month_start || monthStart);

        feedbackCount = typeof count === 'number' ? count : 0;
      } catch (e) {
        console.warn('Failed to count total feedback usage:', e);
      }

      return {
        usage: {
          feedback_count: feedbackCount,
          insights_count: row?.insights_count || 0,
          analytics_count: row?.analytics_count || 0,
          reports_count: row?.reports_count || 0,
        },
        monthStartOut: row?.month_start || monthStart,
      };
    } catch (e) {
      return {
        usage: { feedback_count: 0, insights_count: 0, analytics_count: 0, reports_count: 0 },
        monthStartOut: monthStart,
      };
    }
  };

  const fetchPlanLimits = async (subscription: SubscriptionData) => {
    if (subscription.plan_code) {
      const { data: limitsJson } = await supabase.rpc('get_plan_limits', { plan_code: subscription.plan_code });
      if (limitsJson) {
        return {
          feedback: typeof limitsJson.feedback === 'number' ? limitsJson.feedback : FALLBACK_PLAN_LIMITS[subscription.plan_type].feedback,
          insights: typeof limitsJson.insights === 'number' ? limitsJson.insights : FALLBACK_PLAN_LIMITS[subscription.plan_type].insights,
          analytics: typeof limitsJson.analytics === 'number' ? limitsJson.analytics : FALLBACK_PLAN_LIMITS[subscription.plan_type].analytics,
          reports: typeof limitsJson.reports === 'number' ? limitsJson.reports : FALLBACK_PLAN_LIMITS[subscription.plan_type].reports,
        };
      }
    }
    return FALLBACK_PLAN_LIMITS[subscription.plan_type];
  };

  const calculateUsageData = (
    subscription: SubscriptionData,
    usage: UsageData,
    limits: { feedback: number; insights: number; analytics: number; reports: number },
    monthStart: string
  ): UsageOverviewData => {
    const planType = subscription.plan_type;
    const isTrialExpired = planType === 'trial' && (
      !subscription.trial_end || new Date() > new Date(subscription.trial_end)
    );

    const remaining = {
      feedback: limits.feedback === -1 ? -1 : Math.max(0, limits.feedback - usage.feedback_count),
      insights: limits.insights === -1 ? -1 : Math.max(0, limits.insights - usage.insights_count),
      analytics: limits.analytics === -1 ? -1 : Math.max(0, limits.analytics - usage.analytics_count),
      reports: limits.reports === -1 ? -1 : Math.max(0, limits.reports - usage.reports_count),
    };

    const percentages = {
      feedback: limits.feedback === -1 ? 0 : Math.min(100, (usage.feedback_count / limits.feedback) * 100),
      insights: limits.insights === -1 ? 0 : Math.min(100, (usage.insights_count / limits.insights) * 100),
      analytics: limits.analytics === -1 ? 0 : Math.min(100, (usage.analytics_count / limits.analytics) * 100),
      reports: limits.reports === -1 ? 0 : Math.min(100, (usage.reports_count / limits.reports) * 100),
    };

    const isLimitReached = {
      feedback: limits.feedback !== -1 && usage.feedback_count >= limits.feedback,
      insights: limits.insights !== -1 && usage.insights_count >= limits.insights,
      analytics: limits.analytics !== -1 && usage.analytics_count >= limits.analytics,
      reports: limits.reports !== -1 && usage.reports_count >= limits.reports,
    };

    return { subscription, usage, limits, remaining, percentages, isTrialExpired, isLimitReached, monthStart };
  };

  const loadData = useCallback(async () => {
    if (!userId) return;

    setError(null);
    setLoading(true);

    try {
      const monthStart = getCurrentMonthStart();
      const subscription = await fetchSubscription();
      const { usage, monthStartOut } = await fetchUsageData(monthStart);
      const limits = await fetchPlanLimits(subscription);
      const usageData = calculateUsageData(subscription, usage, limits, monthStartOut);
      setData(usageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  return { data, loading, refreshing, error, refresh };
};
