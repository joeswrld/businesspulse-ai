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
    console.log('Fetching subscription for user:', userId);
    
      // Use profiles table instead of subscriptions for trial data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan, trial_start, trial_end, is_active')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.warn('No profile found, creating defaults:', profileError);
        
        // Create default profile with 8-day trial
        const trialEnd = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
        const defaultProfile = {
          plan: 'free_trial' as const,
          trial_start: new Date().toISOString(),
          trial_end: trialEnd.toISOString(),
          is_active: true,
        };
        
        // Attempt to create profile (will be handled by trigger)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            ...defaultProfile
          });
        
        if (insertError) {
          console.warn('Failed to create default profile:', insertError);
        } else {
          console.log('✓ Created default trial profile');
        }
        
        return {
          plan_type: 'trial' as const,
          renewal_date: null,
          trial_start: defaultProfile.trial_start,
          trial_end: defaultProfile.trial_end,
          is_active: defaultProfile.is_active,
        };
      }

      console.log('✓ Found profile:', profile);
      return {
        plan_type: profile.plan === 'business' ? 'business' as const : 'trial' as const,
        renewal_date: null,
        trial_start: profile.trial_start,
        trial_end: profile.trial_end,
        is_active: profile.is_active,
      };
  };

  const fetchUsageData = async (monthStart: string): Promise<UsageData> => {
    try {
      const [feedbacksResult, insightsResult, analyticsResult, reportsResult] = await Promise.all([
        supabase
          .from('feedback')
          .select('id', { count: 'exact', head: true })
          .gte('timestamp', monthStart),
        
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('event_type', 'insight')
          .gte('created_at', monthStart),
        
        supabase
          .from('analytics_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', monthStart),
        
        supabase
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('event_type', 'report')
          .gte('created_at', monthStart),
      ]);

      return {
        feedback_count: (feedbacksResult && typeof feedbacksResult.count === 'number') ? feedbacksResult.count : 0,
        insights_count: (insightsResult && typeof insightsResult.count === 'number') ? insightsResult.count : 0,
        analytics_count: (analyticsResult && typeof analyticsResult.count === 'number') ? analyticsResult.count : 0,
        reports_count: (reportsResult && typeof reportsResult.count === 'number') ? reportsResult.count : 0,
      };
    } catch (e) {
      console.warn('Usage queries failed, defaulting to zeros:', e);
      return {
        feedback_count: 0,
        insights_count: 0,
        analytics_count: 0,
        reports_count: 0,
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
    if (!userId) {
      console.log('No userId provided to useUsageOverview');
      return;
    }

    try {
      setError(null);
      console.log('Loading usage overview data for user:', userId);
      
      const monthStart = getCurrentMonthStart();
      console.log('Current month start:', monthStart);
      
      // Refresh usage counters first
      await refreshUsageCounters(monthStart);
      
      // Fetch subscription and usage data in parallel
      const [subscription, usage] = await Promise.all([
        fetchSubscription(),
        fetchUsageData(monthStart),
      ]);

      console.log('Fetched data:', { subscription, usage });

      const usageData = calculateUsageData(subscription, usage, monthStart);
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