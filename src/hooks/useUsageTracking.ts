import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types for the usage tracking
export type UsageAction = 'feedback' | 'analytics' | 'reports' | 'insights' | 'teams';

interface UsageRequest {
  action: UsageAction;
}

interface UsageResponse {
  success: boolean;
  data?: {
    id: string;
    user_id: string;
    feedback_count: number;
    analytics_count: number;
    reports_count: number;
    insights_count: number;
    teams_count: number;
    created_at: string;
    updated_at: string;
  };
  error?: string;
}

interface UseUsageTrackingReturn {
  trackUsage: (action: UsageAction) => Promise<void>;
  loading: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

/**
 * React hook for tracking user usage of different features
 * 
 * @returns Object containing trackUsage function and state management
 * 
 * @example
 * ```tsx
 * const { trackUsage, loading, error, success } = useUsageTracking();
 * 
 * async function handleSubmitFeedback() {
 *   await trackUsage("feedback");
 * }
 * ```
 */
export function useUsageTracking(): UseUsageTrackingReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  /**
   * Track usage for a specific action
   * 
   * @param action - The action to track (feedback, analytics, reports, insights, teams)
   */
  const trackUsage = useCallback(async (action: UsageAction): Promise<void> => {
    // Reset previous state
    reset();
    
    // Check if user is authenticated
    if (!user) {
      setError('User not authenticated');
      return;
    }

    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      setError('Authentication session not found');
      return;
    }

    setLoading(true);

    try {
      // Get the Supabase URL from the client
      const supabaseUrl = supabase.supabaseUrl;
      
      // Make the API call to the usage tracking function
      const response = await fetch(`${supabaseUrl}/functions/v1/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action } as UsageRequest),
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
          case 500:
            setError('Server error. Please try again later.');
            break;
          default:
            setError(result.error || 'An unexpected error occurred');
        }
        return;
      }

      if (!result.success) {
        setError(result.error || 'Failed to track usage');
        return;
      }

      // Success!
      setSuccess(true);
      
      // Optional: Log success for debugging
      console.log(`Usage tracked successfully for action: ${action}`, result.data);

    } catch (err) {
      // Handle network errors or other exceptions
      console.error('Error tracking usage:', err);
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
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
  };
}

/**
 * Hook for tracking usage with automatic success reset
 * This version automatically resets success state after a delay
 */
export function useUsageTrackingWithAutoReset(delay: number = 3000): UseUsageTrackingReturn {
  const { trackUsage, loading, error, success, reset } = useUsageTracking();
  const [autoResetTimeout, setAutoResetTimeout] = useState<NodeJS.Timeout | null>(null);

  // Enhanced trackUsage that auto-resets success state
  const trackUsageWithAutoReset = useCallback(async (action: UsageAction): Promise<void> => {
    // Clear any existing timeout
    if (autoResetTimeout) {
      clearTimeout(autoResetTimeout);
      setAutoResetTimeout(null);
    }

    await trackUsage(action);

    // Set up auto-reset for success state
    if (success) {
      const timeout = setTimeout(() => {
        reset();
        setAutoResetTimeout(null);
      }, delay);
      setAutoResetTimeout(timeout);
    }
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
  };
}

/**
 * Hook for tracking usage with optimistic updates
 * This version provides immediate feedback while making the API call
 */
export function useUsageTrackingOptimistic(): UseUsageTrackingReturn & { 
  optimisticSuccess: boolean;
  trackUsageOptimistic: (action: UsageAction) => Promise<void>;
} {
  const { trackUsage, loading, error, success, reset } = useUsageTracking();
  const [optimisticSuccess, setOptimisticSuccess] = useState(false);

  const trackUsageOptimistic = useCallback(async (action: UsageAction): Promise<void> => {
    // Set optimistic success immediately
    setOptimisticSuccess(true);
    
    // Reset after a short delay for visual feedback
    setTimeout(() => setOptimisticSuccess(false), 1000);

    // Make the actual API call
    await trackUsage(action);
  }, [trackUsage]);

  return {
    trackUsage,
    trackUsageOptimistic,
    loading,
    error,
    success,
    optimisticSuccess,
    reset,
  };
}