import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UsageEnforcementResult {
  success: boolean;
  can_use?: boolean;
  error?: string;
  current_usage?: number;
  is_disabled?: boolean;
  plan?: string;
  feature?: string;
}

export function useUsageEnforcementSystem() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const checkFeatureUsage = useCallback(async (
    feature: 'feedback' | 'insights' | 'analytics' | 'reports'
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('usage-enforcement', {
        body: {
          action: 'check',
          user_id: user.id,
          feature
        }
      });

      if (error) {
        console.error('Usage check error:', error);
        return false;
      }

      return data?.can_use === true;
    } catch (error) {
      console.error('Error checking feature usage:', error);
      return false;
    }
  }, [user]);

  const incrementUsage = useCallback(async (
    feature: 'feedback' | 'insights' | 'analytics' | 'reports'
  ): Promise<UsageEnforcementResult> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('usage-enforcement', {
        body: {
          action: 'increment',
          user_id: user.id,
          feature
        }
      });

      if (error) {
        console.error('Usage increment error:', error);
        return { success: false, error: 'Failed to increment usage' };
      }

      return data as UsageEnforcementResult;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return { success: false, error: 'Unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const enforceUsageWithFeedback = useCallback(async (
    feature: 'feedback' | 'insights' | 'analytics' | 'reports',
    onLimitReached?: () => void
  ): Promise<boolean> => {
    const canUse = await checkFeatureUsage(feature);
    
    if (!canUse) {
      const featureName = feature.charAt(0).toUpperCase() + feature.slice(1);
      toast.error(`${featureName} limit reached! Upgrade your plan to continue.`);
      onLimitReached?.();
      return false;
    }

    return true;
  }, [checkFeatureUsage]);

  const submitWithUsageTracking = useCallback(async <T>(
    feature: 'feedback' | 'insights' | 'analytics' | 'reports',
    submitFunction: () => Promise<T>,
    onLimitReached?: () => void
  ): Promise<T | null> => {
    // First check if user can use the feature
    const canUse = await enforceUsageWithFeedback(feature, onLimitReached);
    if (!canUse) return null;

    // Execute the actual submission
    const result = await submitFunction();

    // Increment usage counter after successful submission
    await incrementUsage(feature);

    return result;
  }, [enforceUsageWithFeedback, incrementUsage]);

  const getCurrentUsage = useCallback(async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('usage_counters')
        .select(`
          *,
          billing_profiles!inner(plan)
        `)
        .eq('user_id', user.id)
        .eq('month_start', new Date().toISOString().split('T')[0])
        .single();

      if (error) {
        console.error('Error fetching usage:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting current usage:', error);
      return null;
    }
  }, [user]);

  return {
    loading,
    checkFeatureUsage,
    incrementUsage,
    enforceUsageWithFeedback,
    submitWithUsageTracking,
    getCurrentUsage
  };
}