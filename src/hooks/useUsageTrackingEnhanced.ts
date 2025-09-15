import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for the enhanced usage tracking
export type UsageAction = 'feedback' | 'ai_insights' | 'reports' | 'team_members';

interface UsageRequest {
  action: UsageAction;
  amount?: number;
}

interface UsageResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage_info?: {
    current_usage: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
}

interface UsageData {
  feature_type: string;
  usage_count: number;
  limit: number;
  remaining: number;
  percentage: number;
  is_unlimited: boolean;
}

interface UseUsageTrackingReturn {
  trackUsage: (action: UsageAction, amount?: number) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
  usageInfo: UsageData | null;
  canPerformAction: (action: UsageAction, amount?: number) => Promise<boolean>;
}

/**
 * Enhanced React hook for tracking user usage of different features
 * Includes real-time usage checking and limit enforcement
 * 
 * @returns Object containing trackUsage function and state management
 * 
 * @example
 * ```tsx
 * const { trackUsage, loading, error, success, usageInfo } = useUsageTracking();
 * 
 * async function handleSubmitFeedback() {
 *   const canSubmit = await trackUsage("feedback");
 *   if (canSubmit) {
 *     // Proceed with feedback submission
 *   }
 * }
 * ```
 */
export function useUsageTracking(): UseUsageTrackingReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [usageInfo, setUsageInfo] = useState<UsageData | null>(null);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  /**
   * Check if user can perform a specific action
   */
  const canPerformAction = useCallback(async (action: UsageAction, amount: number = 1): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('can_perform_action', {
        user_uuid: user.id,
        feature_name: action,
        required_amount: amount
      });

      if (error) {
        console.error('Error checking action permission:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking action permission:', error);
      return false;
    }
  }, [user]);

  /**
   * Track usage for a specific action
   * 
   * @param action - The action to track (feedback, ai_insights, reports, team_members)
   * @param amount - Amount to increment (default: 1)
   * @returns Promise<boolean> - Whether the action was successfully tracked
   */
  const trackUsage = useCallback(async (action: UsageAction, amount: number = 1): Promise<boolean> => {
    // Reset previous state
    reset();
    
    // Check if user is authenticated
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      setError('Authentication session not found');
      return false;
    }

    setLoading(true);

    try {
      // Get the Supabase URL from the client  
      const supabaseUrl = (supabase as any).supabaseUrl;
      
      // Make the API call to the enhanced usage tracking function
      const response = await fetch(`${supabaseUrl}/functions/v1/usage-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, amount } as UsageRequest),
      });

      const result: UsageResponse = await response.json();

      if (!response.ok) {
        // Handle different error status codes
        switch (response.status) {
          case 401:
            setError('Authentication failed. Please log in again.');
            break;
          case 400:
            setError(result.error || 'Invalid request');
            break;
          case 429:
            setError(result.error || 'Usage limit reached');
            // Show upgrade prompt for limit reached
            toast.error('You\'ve reached your plan limit. Please upgrade to continue.', {
              action: {
                label: 'Upgrade',
                onClick: () => window.location.href = '/billing'
              }
            });
            break;
          case 500:
            setError('Server error. Please try again later.');
            break;
          default:
            setError(result.error || 'An unexpected error occurred');
        }
        return false;
      }

      if (!result.success) {
        setError(result.error || 'Failed to track usage');
        return false;
      }

      // Success!
      setSuccess(true);
      setUsageInfo(result.usage_info || null);
      
      // Show success toast for high usage
      if (result.usage_info && result.usage_info.percentage >= 80 && result.usage_info.percentage < 100) {
        toast.warning(`You've used ${result.usage_info.percentage}% of your ${action} limit. Consider upgrading your plan.`, {
          action: {
            label: 'View Plans',
            onClick: () => window.location.href = '/billing'
          }
        });
      }

      // Optional: Log success for debugging
      console.log(`Usage tracked successfully for action: ${action}`, result.data);

      return true;

    } catch (err) {
      // Handle network errors or other exceptions
      console.error('Error tracking usage:', err);
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, reset]);

  return {
    trackUsage,
    loading,
    error,
    success,
    reset,
    usageInfo,
    canPerformAction,
  };
}

/**
 * Hook for tracking usage with automatic success reset
 * This version automatically resets success state after a delay
 */
export function useUsageTrackingWithAutoReset(delay: number = 3000): UseUsageTrackingReturn {
  const { trackUsage, loading, error, success, reset, usageInfo, canPerformAction } = useUsageTracking();
  const [autoResetTimeout, setAutoResetTimeout] = useState<NodeJS.Timeout | null>(null);

  // Enhanced trackUsage that auto-resets success state
  const trackUsageWithAutoReset = useCallback(async (action: UsageAction, amount: number = 1): Promise<boolean> => {
    // Clear any existing timeout
    if (autoResetTimeout) {
      clearTimeout(autoResetTimeout);
      setAutoResetTimeout(null);
    }

    const result = await trackUsage(action, amount);

    // Set up auto-reset for success state
    if (success) {
      const timeout = setTimeout(() => {
        reset();
        setAutoResetTimeout(null);
      }, delay);
      setAutoResetTimeout(timeout);
    }

    return result;
  }, [trackUsage, success, reset, delay, autoResetTimeout]);

  // Cleanup timeout on unmount
  const resetWithCleanup = useCallback(() => {
    if (autoResetTimeout) {
      clearTimeout(autoResetTimeout);
      setAutoResetTimeout(null);
    }
    reset();
  }, [autoResetTimeout, reset]);

  return {
    trackUsage: trackUsageWithAutoReset,
    loading,
    error,
    success,
    reset: resetWithCleanup,
    usageInfo,
    canPerformAction,
  };
}

/**
 * Hook for tracking usage with optimistic updates
 * This version provides immediate feedback while making the API call
 */
export function useUsageTrackingOptimistic(): UseUsageTrackingReturn & { 
  optimisticSuccess: boolean;
  trackUsageOptimistic: (action: UsageAction, amount?: number) => Promise<boolean>;
} {
  const { trackUsage, loading, error, success, reset, usageInfo, canPerformAction } = useUsageTracking();
  const [optimisticSuccess, setOptimisticSuccess] = useState(false);

  const trackUsageOptimistic = useCallback(async (action: UsageAction, amount: number = 1): Promise<boolean> => {
    // Set optimistic success immediately
    setOptimisticSuccess(true);
    
    // Reset after a short delay for visual feedback
    setTimeout(() => setOptimisticSuccess(false), 1000);

    // Make the actual API call
    return await trackUsage(action, amount);
  }, [trackUsage]);

  return {
    trackUsage,
    trackUsageOptimistic,
    loading,
    error,
    success,
    optimisticSuccess,
    reset,
    usageInfo,
    canPerformAction,
  };
}

/**
 * Hook for getting current usage information without tracking
 */
export function useUsageInfo() {
  const { user } = useAuth();
  const [usageData, setUsageData] = useState<Record<string, UsageData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsageInfo = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_billing_dashboard')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading usage info:', error);
        setError('Failed to load usage information');
        return;
      }

      // Transform billing data to usage info format
      const usageInfo: Record<string, UsageData> = {
        feedback: {
          feature_type: 'feedback',
          usage_count: data.current_feedback_usage || 0,
          limit: data.feedback_limit,
          remaining: data.feedback_limit === -1 ? null : Math.max(0, data.feedback_limit - (data.current_feedback_usage || 0)),
          percentage: data.feedback_limit === -1 ? 0 : Math.round(((data.current_feedback_usage || 0) / data.feedback_limit) * 100),
          is_unlimited: data.feedback_limit === -1
        },
        ai_insights: {
          feature_type: 'ai_insights',
          usage_count: data.current_ai_insights_usage || 0,
          limit: data.ai_insights_limit,
          remaining: data.ai_insights_limit === -1 ? null : Math.max(0, data.ai_insights_limit - (data.current_ai_insights_usage || 0)),
          percentage: data.ai_insights_limit === -1 ? 0 : Math.round(((data.current_ai_insights_usage || 0) / data.ai_insights_limit) * 100),
          is_unlimited: data.ai_insights_limit === -1
        },
        reports: {
          feature_type: 'reports',
          usage_count: data.current_reports_usage || 0,
          limit: data.reports_limit,
          remaining: data.reports_limit === -1 ? null : Math.max(0, data.reports_limit - (data.current_reports_usage || 0)),
          percentage: data.reports_limit === -1 ? 0 : Math.round(((data.current_reports_usage || 0) / data.reports_limit) * 100),
          is_unlimited: data.reports_limit === -1
        },
        team_members: {
          feature_type: 'team_members',
          usage_count: data.current_team_members_usage || 0,
          limit: data.team_members_limit,
          remaining: data.team_members_limit === -1 ? null : Math.max(0, data.team_members_limit - (data.current_team_members_usage || 0)),
          percentage: data.team_members_limit === -1 ? 0 : Math.round(((data.current_team_members_usage || 0) / data.team_members_limit) * 100),
          is_unlimited: data.team_members_limit === -1
        }
      };

      setUsageData(usageInfo);

    } catch (error) {
      console.error('Error loading usage info:', error);
      setError('Failed to load usage information');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadUsageInfo();
  }, [loadUsageInfo]);

  return {
    usageData,
    loading,
    error,
    refetch: loadUsageInfo
  };
}

/**
 * Hook for tracking feedback submissions specifically
 * This is a specialized hook for the most common usage tracking scenario
 */
export function useFeedbackTracking() {
  const { trackUsage, loading, error, success, reset, usageInfo, canPerformAction } = useUsageTracking();

  const trackFeedbackSubmission = useCallback(async (): Promise<boolean> => {
    return await trackUsage('feedback', 1);
  }, [trackUsage]);

  const canSubmitFeedback = useCallback(async (): Promise<boolean> => {
    return await canPerformAction('feedback', 1);
  }, [canPerformAction]);

  return {
    trackFeedbackSubmission,
    canSubmitFeedback,
    loading,
    error,
    success,
    reset,
    usageInfo,
  };
}