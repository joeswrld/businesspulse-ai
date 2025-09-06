import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UsageCheckResult {
  canUse: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  planCode: string;
  planName: string;
}

export interface UsageLimits {
  feedback: number;
  insights: number;
  analytics: number;
  reports: number;
}

export function useUsageEnforcement() {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadUsageData = useCallback(async () => {
    if (!user) return;

    try {
      // First try RPC function
      const { data, error } = await supabase.rpc('get_user_usage_summary', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error loading usage data from RPC:', error);
        
        // Fallback: try to get data directly from tables
        try {
          const { data: usageData, error: usageError } = await supabase
            .from('usage_counters')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (!usageError && usageData) {
            // Create usage summary from usage counters data
            const { data: billingData } = await supabase
              .from('billing_profiles')
              .select('plan')
              .eq('id', user.id)
              .single();

            const plan = billingData?.plan || 'free';
            const planLimits = getPlanLimits(plan);

            setUsageData({
              plan_code: plan,
              plan_name: getPlanDisplayName(plan),
              feedback_count: usageData.feedback_count || 0,
              insights_count: usageData.insights_count || 0,
              analytics_count: usageData.analytics_count || 0,
              reports_count: usageData.reports_count || 0,
              feedback_limit: planLimits.feedback,
              insights_limit: planLimits.insights,
              analytics_limit: planLimits.analytics,
              reports_limit: planLimits.reports,
              feedback_remaining: Math.max(0, planLimits.feedback - (usageData.feedback_count || 0)),
              insights_remaining: Math.max(0, planLimits.insights - (usageData.insights_count || 0)),
              analytics_remaining: Math.max(0, planLimits.analytics - (usageData.analytics_count || 0)),
              reports_remaining: Math.max(0, planLimits.reports - (usageData.reports_count || 0))
            });
          } else {
            console.warn('No usage data found, creating default');
            // Create default usage record
            await supabase.from('usage_counters').insert({
              user_id: user.id,
              feedback_count: 0,
              insights_count: 0,
              analytics_count: 0,
              reports_count: 0,
              month_start: new Date().toISOString().split('T')[0]
            });
          }
        } catch (fallbackError) {
          console.error('Fallback data loading failed:', fallbackError);
        }
        return;
      }
      
      if (data && data.length > 0) {
        setUsageData(data[0]);
      }
    } catch (error) {
      console.error('Error in loadUsageData:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Helper functions
  const getPlanLimits = (planCode: string) => {
    const limits = {
      'trial': { feedback: 50, insights: 5, analytics: 5, reports: 2 },
      'free': { feedback: 50, insights: 5, analytics: 5, reports: 2 },
      'pro': { feedback: 300, insights: 50, analytics: 100, reports: 20 },
      'business': { feedback: -1, insights: -1, analytics: -1, reports: -1 }
    };
    return limits[planCode as keyof typeof limits] || limits.trial;
  };

  const getPlanDisplayName = (planCode: string) => {
    const names = {
      'trial': 'Free Trial',
      'free': 'Free Trial',
      'pro': 'Pro Plan',
      'business': 'Business Plan'
    };
    return names[planCode as keyof typeof names] || 'Free Trial';
  };

  useEffect(() => {
    loadUsageData();
  }, [loadUsageData]);

  const checkUsage = useCallback(async (feature: 'feedback' | 'insights' | 'analytics' | 'reports'): Promise<UsageCheckResult> => {
    if (!user) {
      return {
        canUse: false,
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        isUnlimited: false,
        planCode: 'none',
        planName: 'None'
      };
    }

    try {
      // Refresh usage data to get latest counts
      await loadUsageData();
      
      if (!usageData) {
        return {
          canUse: false,
          currentUsage: 0,
          limit: 0,
          remaining: 0,
          isUnlimited: false,
          planCode: 'none',
          planName: 'None'
        };
      }

      const currentUsage = usageData[`${feature}_count`] || 0;
      const limit = usageData[`${feature}_limit`] || 0;
      const remaining = usageData[`${feature}_remaining`] || 0;
      const isUnlimited = limit === -1;
      const canUse = isUnlimited || currentUsage < limit;

      return {
        canUse,
        currentUsage,
        limit,
        remaining,
        isUnlimited,
        planCode: usageData.plan_code,
        planName: usageData.plan_name
      };
    } catch (error) {
      console.error('Error checking usage:', error);
      return {
        canUse: false,
        currentUsage: 0,
        limit: 0,
        remaining: 0,
        isUnlimited: false,
        planCode: 'none',
        planName: 'None'
      };
    }
  }, [user, usageData, loadUsageData]);

  const enforceUsage = useCallback(async (feature: 'feedback' | 'insights' | 'analytics' | 'reports'): Promise<boolean> => {
    const result = await checkUsage(feature);
    
    if (!result.canUse) {
      const featureName = feature.charAt(0).toUpperCase() + feature.slice(1);
      toast.error(`${featureName} limit reached! Upgrade your plan to continue.`);
      return false;
    }
    
    return true;
  }, [checkUsage]);

  const getUsageSummary = useCallback(() => {
    if (!usageData) return null;
    
    return {
      planCode: usageData.plan_code,
      planName: usageData.plan_name,
      features: {
        feedback: {
          count: usageData.feedback_count,
          limit: usageData.feedback_limit,
          remaining: usageData.feedback_remaining
        },
        insights: {
          count: usageData.insights_count,
          limit: usageData.insights_limit,
          remaining: usageData.insights_remaining
        },
        analytics: {
          count: usageData.analytics_count,
          limit: usageData.analytics_limit,
          remaining: usageData.analytics_remaining
        },
        reports: {
          count: usageData.reports_count,
          limit: usageData.reports_limit,
          remaining: usageData.reports_remaining
        }
      }
    };
  }, [usageData]);

  const refreshUsage = useCallback(() => {
    loadUsageData();
  }, [loadUsageData]);

  return {
    usageData,
    loading,
    checkUsage,
    enforceUsage,
    getUsageSummary,
    refreshUsage
  };
}