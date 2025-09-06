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
  plan_type: 'trial' | 'pro' | 'business';
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

const PLAN_LIMITS = {
  trial: {
    feedback: 50,
    insights: 10,
    analytics: 10,
    reports: 5,
  },
  pro: {
    feedback: 300,
    insights: 50,
    analytics: 100,
    reports: 20,
  },
  business: {
    feedback: -1, // Unlimited
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
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('plan_type, renewal_date, trial_start, trial_end, is_active')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.warn('No subscription found, using trial defaults:', error);
      return {
        plan_type: 'trial',
        renewal_date: null,
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      };
    }

    return subscription;
  };

  const fetchUsageData = async (monthStart: string): Promise<UsageData> => {
    const [feedbacksResult, insightsResult, analyticsResult, reportsResult] = await Promise.all([
      supabase
        .from('feedbacks')
        .select('id', { count: 'exact' })
        .gte('timestamp', monthStart),
      
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('event_type', 'insight')
        .gte('created_at', monthStart),
      
      supabase
        .from('analytics_history')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', monthStart),
      
      supabase
        .from('analytics_events')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('event_type', 'report')
        .gte('created_at', monthStart),
    ]);

    return {
      feedback_count: feedbacksResult.count || 0,
      insights_count: insightsResult.count || 0,
      analytics_count: analyticsResult.count || 0,
      reports_count: reportsResult.count || 0,
    };
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

  const calculateUsageData = (
    subscription: SubscriptionData,
    usage: UsageData,
    monthStart: string
  ): UsageOverviewData => {
    const planType = subscription.plan_type;
    const limits = PLAN_LIMITS[planType];
    
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
    if (!userId) return;

    try {
      setError(null);
      const monthStart = getCurrentMonthStart();
      
      // Refresh usage counters first
      await refreshUsageCounters(monthStart);
      
      // Fetch subscription and usage data in parallel
      const [subscription, usage] = await Promise.all([
        fetchSubscription(),
        fetchUsageData(monthStart),
      ]);

      const usageData = calculateUsageData(subscription, usage, monthStart);
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

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
  };
};