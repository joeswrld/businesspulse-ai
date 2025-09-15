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
  trial: {
    feedback: 50,
    insights: 5,
    analytics: 10,
    reports: 5,
  },
  business: {
    feedback: -1,
    insights: -1,
    analytics: -1,
    reports: -1,
  },
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
    console.log('Fetching subscription for user:', userId);

    // Prefer user_subscriptions for active plan
    const { data: sub, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subError && sub && (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due')) {
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

    // Fallback to profiles for trial/free users
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
      // Use RPC that ensures monthly reset window
      const { data: usageRows, error } = await supabase
        .rpc('get_user_usage_with_monthly_reset', { user_uuid: userId });

      if (error) throw error;

      const row = Array.isArray(usageRows) && usageRows.length > 0 ? usageRows[0] : null;
      if (row) {
        // Compute feedback_count based on user's feedback_settings projects
        let feedbackCount = 0;
        try {
          const { data: settings } = await supabase
            .from('feedback_settings')
            .select('project_id')
            .eq('user_id', userId);

          const projectIds = (settings || []).map((s: any) => s.project_id);
          if (projectIds.length > 0) {
            const { count } = await supabase
              .from('feedback')
              .select('id', { count: 'exact', head: true })
              .in('project_id', projectIds)
              .gte('created_at', row.month_start || monthStart);
            feedbackCount = typeof count === 'number' ? count : 0;
          }
        } catch (e) {
          console.warn('Failed to count feedback usage:', e);
        }
        return {
          usage: {
            feedback_count: feedbackCount,
            insights_count: row.insights_count || 0,
            analytics_count: row.analytics_count || 0,
            reports_count: row.reports_count || 0,
          },
          monthStartOut: row.month_start || monthStart,
        };
      }

      return {
        usage: { feedback_count: 0, insights_count: 0, analytics_count: 0, reports_count: 0 },
        monthStartOut: monthStart,
      };
    } catch (e) {
      console.warn('Usage RPC failed, defaulting to zeros:', e);
      return {
        usage: { feedback_count: 0, insights_count: 0, analytics_count: 0, reports_count: 0 },
        monthStartOut: monthStart,
      };
    }
  };

  const refreshUsageCounters = async (monthStart: string) => {
    try {
      const { error } = await supabase.rpc('refresh_user_usage', {
        user_uuid: userId,
        target_month_start: monthStart,
      });

      if (error) {
        console.warn('Failed to refresh usage counters:', error);
      }
    } catch (err) {
      console.warn('Error refreshing usage counters:', err);
    }
  };

  const fetchPlanLimits = async (subscription: SubscriptionData) => {
    // Try server-side limits first
    if (subscription.plan_code) {
      const { data: limitsJson, error } = await supabase.rpc('get_plan_limits', {
        plan_code: subscription.plan_code,
      });
      if (!error && limitsJson) {
        try {
          const parsed = limitsJson as any;
          return {
            feedback: typeof parsed.feedback === 'number' ? parsed.feedback : FALLBACK_PLAN_LIMITS[subscription.plan_type].feedback,
            insights: typeof parsed.insights === 'number' ? parsed.insights : FALLBACK_PLAN_LIMITS[subscription.plan_type].insights,
            analytics: typeof parsed.analytics === 'number' ? parsed.analytics : FALLBACK_PLAN_LIMITS[subscription.plan_type].analytics,
            reports: typeof parsed.reports === 'number' ? parsed.reports : FALLBACK_PLAN_LIMITS[subscription.plan_type].reports,
          };
        } catch (_) {
          // fall through to defaults
        }
      }
    }
    // Fallback
    return FALLBACK_PLAN_LIMITS[subscription.plan_type];
  };

  const calculateUsageData = (
    subscription: SubscriptionData,
    usage: UsageData,
    limits: { feedback: number; insights: number; analytics: number; reports: number },
    monthStart: string
  ): UsageOverviewData => {
    const planType = subscription.plan_type;
    
    // Check if trial is expired
    const isTrialExpired = planType === 'trial' && (
      !subscription.trial_end || 
      new Date() > new Date(subscription.trial_end) ||
      usage.feedback_count >= limits.feedback ||
      usage.insights_count >= limits.insights ||
      usage.analytics_count >= limits.analytics ||
      usage.reports_count >= limits.reports
    );

    // Calculate remaining usage
    const remaining = {
      feedback: limits.feedback === -1 ? -1 : Math.max(0, limits.feedback - usage.feedback_count),
      insights: limits.insights === -1 ? -1 : Math.max(0, limits.insights - usage.insights_count),
      analytics: limits.analytics === -1 ? -1 : Math.max(0, limits.analytics - usage.analytics_count),
      reports: limits.reports === -1 ? -1 : Math.max(0, limits.reports - usage.reports_count),
    };

    // Calculate percentages
    const percentages = {
      feedback: limits.feedback === -1 ? 0 : Math.min(100, (usage.feedback_count / limits.feedback) * 100),
      insights: limits.insights === -1 ? 0 : Math.min(100, (usage.insights_count / limits.insights) * 100),
      analytics: limits.analytics === -1 ? 0 : Math.min(100, (usage.analytics_count / limits.analytics) * 100),
      reports: limits.reports === -1 ? 0 : Math.min(100, (usage.reports_count / limits.reports) * 100),
    };

    // Check if limits are reached
    const isLimitReached = {
      feedback: limits.feedback !== -1 && usage.feedback_count >= limits.feedback,
      insights: limits.insights !== -1 && usage.insights_count >= limits.insights,
      analytics: limits.analytics !== -1 && usage.analytics_count >= limits.analytics,
      reports: limits.reports !== -1 && usage.reports_count >= limits.reports,
    };

    return {
      subscription,
      usage,
      limits,
      remaining,
      percentages,
      isTrialExpired,
      isLimitReached,
      monthStart,
    };
  };

  const loadData = useCallback(async () => {
    if (!userId) {
      console.log('No userId provided to useUsageOverview');
      return;
    }

    try {
      setError(null);
      console.log('Loading usage overview data for user:', userId);
      
      const monthStartGuess = getCurrentMonthStart();
      console.log('Current month start (guess):', monthStartGuess);

      // Fetch subscription first to know plan/limits
      const subscription = await fetchSubscription();

      // Refresh usage counters using guess (server will normalize)
      await refreshUsageCounters(monthStartGuess);

      // Fetch usage via RPC (includes server month_start)
      const { usage, monthStartOut } = await fetchUsageData(monthStartGuess);

      // Fetch limits via RPC or fallback
      const limits = await fetchPlanLimits(subscription);

      console.log('Fetched data:', { subscription, usage, limits, monthStartOut });

      const usageData = calculateUsageData(subscription, usage, limits, monthStartOut);
      console.log('Calculated usage data:', usageData);
      
      setData(usageData);
    } catch (err) {
      console.error('Error loading usage overview data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
      toast.success('Usage data refreshed');
    } catch (err) {
      toast.error('Failed to refresh usage data');
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData, userId]);

  // Realtime reactivity: refresh on relevant table changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('usage-overview-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analytics_events' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'analytics_history' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usage_counters', filter: `user_id=eq.${userId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions', filter: `user_id=eq.${userId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` }, () => loadData())
      .subscribe();

    return () => {
      try { channel.unsubscribe(); } catch (_) {}
    };
  }, [userId, loadData]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
  };
};