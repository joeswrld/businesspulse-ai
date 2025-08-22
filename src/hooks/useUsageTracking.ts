import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface UsageData {
  ai_insights: {
    current: number;
    limit: number;
    remaining: number;
    reset_date: string;
  };
  data_sources: {
    current: number;
    limit: number;
    remaining: number;
  };
  team_members: {
    current: number;
    limit: number;
    remaining: number;
  };
  ai_reports: {
    current: number;
    limit: number;
    remaining: number;
    reset_date: string;
  };
  business_analytics: {
    current: number;
    limit: number;
    remaining: number;
  };
}

export interface UsageLimits {
  ai_insights_limit: number;
  data_sources_limit: number;
  team_members_limit: number;
  ai_reports_limit: number;
  business_analytics_limit: number;
}

export interface UsageResponse {
  success: boolean;
  can_perform: boolean;
  current_usage: {
    ai_insights_used: number;
    data_sources_used: number;
    team_members_used: number;
    ai_reports_used: number;
    business_analytics_used: number;
  };
  limits: UsageLimits;
  remaining: {
    ai_insights: number;
    data_sources: number;
    team_members: number;
    ai_reports: number;
    business_analytics: number;
  };
  message?: string;
}

export const useUsageTracking = () => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData>({
    ai_insights: { current: 0, limit: 20, remaining: 20, reset_date: '' },
    data_sources: { current: 0, limit: 1, remaining: 1 },
    team_members: { current: 1, limit: 1, remaining: 0 },
    ai_reports: { current: 0, limit: 2, remaining: 2, reset_date: '' },
    business_analytics: { current: 0, limit: 1, remaining: 1 }
  });
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);

  // Fetch current usage data
  const fetchUsage = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Try to get usage from Supabase first
      const { data, error } = await supabase.functions.invoke('usageTracking', {
        body: {
          user_id: user.id,
          resource_type: 'ai_insights',
          action: 'get'
        }
      });

      if (error) {
        console.error('Error fetching usage from Supabase:', error);
        // Fallback to localStorage for now
        await fetchUsageFromLocalStorage();
      } else if (data) {
        // Update usage with Supabase data
        setUsage({
          ai_insights: {
            current: data.current_usage.ai_insights_used,
            limit: data.limits.ai_insights_limit,
            remaining: data.remaining.ai_insights,
            reset_date: new Date().toISOString()
          },
          data_sources: {
            current: data.current_usage.data_sources_used,
            limit: data.limits.data_sources_limit,
            remaining: data.remaining.data_sources
          },
          team_members: {
            current: data.current_usage.team_members_used,
            limit: data.limits.team_members_limit,
            remaining: data.remaining.team_members
          },
          ai_reports: {
            current: data.current_usage.ai_reports_used,
            limit: data.limits.ai_reports_limit,
            remaining: data.remaining.ai_reports,
            reset_date: new Date().toISOString()
          },
          business_analytics: {
            current: data.current_usage.business_analytics_used,
            limit: data.limits.business_analytics_limit,
            remaining: data.remaining.business_analytics
          }
        });
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
      // Fallback to localStorage
      await fetchUsageFromLocalStorage();
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fallback to localStorage for development/testing
  const fetchUsageFromLocalStorage = async () => {
    try {
      const savedInsights = localStorage.getItem('insightsHistory');
      const insightsCount = savedInsights ? JSON.parse(savedInsights).length : 0;

      // Get reports count from localStorage
      const savedReports = localStorage.getItem('userReports');
      const reportsCount = savedReports ? JSON.parse(savedReports).length : 0;

      setUsage(prev => ({
        ...prev,
        ai_insights: {
          ...prev.ai_insights,
          current: insightsCount,
          remaining: Math.max(0, prev.ai_insights.limit - insightsCount)
        },
        ai_reports: {
          ...prev.ai_reports,
          current: reportsCount,
          remaining: Math.max(0, prev.ai_reports.limit - reportsCount)
        }
      }));
    } catch (error) {
      console.error('Error fetching from localStorage:', error);
    }
  };

  // Check if user can perform an action
  const checkUsage = useCallback(async (
    resourceType: keyof UsageData,
    requiredCount: number = 1
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('usageTracking', {
        body: {
          user_id: user.id,
          resource_type: resourceType,
          count: requiredCount,
          action: 'check'
        }
      });

      if (error) {
        console.error('Error checking usage:', error);
        // Fallback check
        return checkUsageFallback(resourceType, requiredCount);
      }

      return data?.can_perform || false;
    } catch (error) {
      console.error('Error checking usage:', error);
      return checkUsageFallback(resourceType, requiredCount);
    }
  }, [user]);

  // Fallback usage check
  const checkUsageFallback = (resourceType: keyof UsageData, requiredCount: number = 1): boolean => {
    const currentUsage = usage[resourceType];
    if (!currentUsage) return false;

    // Check if unlimited (-1) or within limits
    if (currentUsage.limit === -1) return true;
    return (currentUsage.current + requiredCount) <= currentUsage.limit;
  };

  // Increment usage for a resource
  const incrementUsage = useCallback(async (
    resourceType: keyof UsageData,
    count: number = 1
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('usageTracking', {
        body: {
          user_id: user.id,
          resource_type: resourceType,
          count: count,
          action: 'increment'
        }
      });

      if (error) {
        console.error('Error incrementing usage:', error);
        // Fallback increment
        return incrementUsageFallback(resourceType, count);
      }

      if (data?.success) {
        // Update local state with new usage data
        setUsage(prev => ({
          ...prev,
          ai_insights: {
            current: data.current_usage.ai_insights_used,
            limit: data.limits.ai_insights_limit,
            remaining: data.remaining.ai_insights,
            reset_date: prev.ai_insights.reset_date
          },
          data_sources: {
            current: data.current_usage.data_sources_used,
            limit: data.limits.data_sources_limit,
            remaining: data.remaining.data_sources
          },
          team_members: {
            current: data.current_usage.team_members_used,
            limit: data.limits.team_members_limit,
            remaining: data.remaining.team_members
          },
          ai_reports: {
            current: data.current_usage.ai_reports_used,
            limit: data.limits.ai_reports_limit,
            remaining: data.remaining.ai_reports,
            reset_date: prev.ai_reports.reset_date
          },
          business_analytics: {
            current: data.current_usage.business_analytics_used,
            limit: data.limits.business_analytics_limit,
            remaining: data.remaining.business_analytics
          }
        }));

        // Show success message
        if (data.can_perform) {
          toast.success('Usage updated successfully');
        } else {
          toast.error('Usage limit exceeded');
        }

        return data.can_perform;
      }

      return false;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return incrementUsageFallback(resourceType, count);
    }
  }, [user]);

  // Fallback usage increment
  const incrementUsageFallback = (resourceType: keyof UsageData, count: number = 1): boolean => {
    const currentUsage = usage[resourceType];
    if (!currentUsage) return false;

    // Check if unlimited (-1) or within limits
    if (currentUsage.limit === -1) {
      setUsage(prev => ({
        ...prev,
        [resourceType]: {
          ...prev[resourceType],
          current: prev[resourceType].current + count,
          remaining: -1
        }
      }));
      return true;
    }

    if ((currentUsage.current + count) <= currentUsage.limit) {
      setUsage(prev => ({
        ...prev,
        [resourceType]: {
          ...prev[resourceType],
          current: prev[resourceType].current + count,
          remaining: Math.max(0, prev[resourceType].limit - (prev[resourceType].current + count))
        }
      }));
      return true;
    }

    toast.error('Usage limit exceeded');
    return false;
  };

  // Reset usage for a resource (server preferred, with local fallback)
  const resetUsage = useCallback(async (resourceType: keyof UsageData): Promise<boolean> => {
    if (!user) return false;
    try {
      const { data, error } = await supabase.functions.invoke('usageTracking', {
        body: {
          user_id: user.id,
          resource_type: resourceType,
          action: 'reset'
        }
      });

      if (error) {
        console.error('Error resetting usage:', error);
        // Fallback: reset locally for today
        setUsage(prev => ({
          ...prev,
          [resourceType]: {
            ...prev[resourceType],
            current: resourceType === 'team_members' ? 1 : 0,
            remaining: prev[resourceType].limit === -1 
              ? -1 
              : Math.max(0, prev[resourceType].limit - (resourceType === 'team_members' ? 1 : 0))
          }
        }));
        toast.success('Usage reset locally');
        return true;
      }

      if (data?.success) {
        // Sync from server response
        setUsage(prev => ({
          ...prev,
          ai_insights: {
            current: data.current_usage.ai_insights_used,
            limit: data.limits.ai_insights_limit,
            remaining: data.remaining.ai_insights,
            reset_date: prev.ai_insights.reset_date
          },
          data_sources: {
            current: data.current_usage.data_sources_used,
            limit: data.limits.data_sources_limit,
            remaining: data.remaining.data_sources
          },
          team_members: {
            current: data.current_usage.team_members_used,
            limit: data.limits.team_members_limit,
            remaining: data.remaining.team_members
          },
          ai_reports: {
            current: data.current_usage.ai_reports_used,
            limit: data.limits.ai_reports_limit,
            remaining: data.remaining.ai_reports,
            reset_date: prev.ai_reports.reset_date
          },
          business_analytics: {
            current: data.current_usage.business_analytics_used,
            limit: data.limits.business_analytics_limit,
            remaining: data.remaining.business_analytics
          }
        }));
        toast.success('Usage reset successfully');
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error in resetUsage:', err);
      return false;
    }
  }, [user, usage]);

  // Get usage percentage
  const getUsagePercentage = useCallback((resourceType: keyof UsageData): number => {
    const currentUsage = usage[resourceType];
    if (!currentUsage || currentUsage.limit === -1) return 0;
    return Math.min((currentUsage.current / currentUsage.limit) * 100, 100);
  }, [usage]);

  // Get usage status (normal, warning, critical)
  const getUsageStatus = useCallback((resourceType: keyof UsageData): 'normal' | 'warning' | 'critical' => {
    const percentage = getUsagePercentage(resourceType);
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'normal';
  }, [getUsagePercentage]);

  // Set up real-time subscription for usage updates
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchUsage();

    // Set up real-time subscription for usage changes
    const channel = supabase
      .channel('usage-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_usage'
        },
        (payload) => {
          console.log('Usage changed:', payload);
          // Refresh usage data when changes occur
          fetchUsage();
        }
      )
      .subscribe();

    // Set up real-time subscription for subscription changes
    const subscriptionChannel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions'
        },
        (payload) => {
          console.log('Subscription changed:', payload);
          // Refresh usage data when subscription changes
          fetchUsage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(subscriptionChannel);
    };
  }, [user, fetchUsage]);

  // Auto-refresh usage every 5 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchUsage();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, fetchUsage]);

  return {
    usage,
    loading,
    subscription,
    fetchUsage,
    checkUsage,
    incrementUsage,
    getUsagePercentage,
    getUsageStatus,
    refreshUsage: fetchUsage,
    resetUsage
  };
};