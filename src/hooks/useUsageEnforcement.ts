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
      const { data, error } = await supabase.rpc('get_user_usage_summary', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error loading usage data:', error);
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