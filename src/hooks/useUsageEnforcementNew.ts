import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type UsageAction = 'feedback' | 'analytics' | 'reports' | 'insights';

interface UsageLimits {
  can_submit_feedback: boolean;
  can_use_ai_insights: boolean;
  can_generate_analytics: boolean;
  can_generate_reports: boolean;
}

interface UseUsageEnforcementReturn {
  checkLimits: () => Promise<UsageLimits | null>;
  incrementUsage: (action: UsageAction) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  limits: UsageLimits | null;
}

/**
 * React hook for usage enforcement using the new database functions
 * 
 * @returns Object containing usage enforcement functions and state
 * 
 * @example
 * ```tsx
 * const { checkLimits, incrementUsage, limits } = useUsageEnforcement();
 * 
 * async function handleSubmitFeedback() {
 *   const canProceed = await incrementUsage('feedback');
 *   if (canProceed) {
 *     // Proceed with feedback submission
 *   }
 * }
 * ```
 */
export function useUsageEnforcement(): UseUsageEnforcementReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);

  /**
   * Check current usage limits for the user
   */
  const checkLimits = useCallback(async (): Promise<UsageLimits | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: limitsError } = await supabase
        .rpc('check_usage_limit', { user_uuid: user.id });

      if (limitsError) {
        throw limitsError;
      }

      if (!data || data.length === 0) {
        throw new Error('No usage limits data returned');
      }

      const usageLimits = data[0] as UsageLimits;
      setLimits(usageLimits);
      return usageLimits;

    } catch (err) {
      console.error('Error checking usage limits:', err);
      setError(err instanceof Error ? err.message : 'Failed to check usage limits');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Increment usage for a specific action if within limits
   */
  const incrementUsage = useCallback(async (action: UsageAction): Promise<boolean> => {
    if (!user) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: incrementError } = await supabase
        .rpc('increment_usage_counter', { 
          p_user_id: user.id, 
          p_action: action 
        });

      if (incrementError) {
        throw incrementError;
      }

      // Refresh limits after successful increment
      await checkLimits();

      return data === true;

    } catch (err) {
      console.error('Error incrementing usage:', err);
      setError(err instanceof Error ? err.message : 'Failed to increment usage');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, checkLimits]);

  return {
    checkLimits,
    incrementUsage,
    loading,
    error,
    limits,
  };
}

/**
 * Hook for usage enforcement with automatic limit checking
 * This version automatically checks limits when the component mounts
 */
export function useUsageEnforcementWithAutoCheck(): UseUsageEnforcementReturn {
  const { checkLimits, incrementUsage, loading, error, limits } = useUsageEnforcement();
  const [hasChecked, setHasChecked] = useState(false);

  // Auto-check limits on mount
  React.useEffect(() => {
    if (!hasChecked) {
      checkLimits().then(() => setHasChecked(true));
    }
  }, [checkLimits, hasChecked]);

  return {
    checkLimits,
    incrementUsage,
    loading,
    error,
    limits,
  };
}

/**
 * Hook for usage enforcement with optimistic updates
 * This version provides immediate feedback while making the API call
 */
export function useUsageEnforcementOptimistic(): UseUsageEnforcementReturn & {
  optimisticLimits: UsageLimits | null;
  incrementUsageOptimistic: (action: UsageAction) => Promise<boolean>;
} {
  const { checkLimits, incrementUsage, loading, error, limits } = useUsageEnforcement();
  const [optimisticLimits, setOptimisticLimits] = useState<UsageLimits | null>(null);

  const incrementUsageOptimistic = useCallback(async (action: UsageAction): Promise<boolean> => {
    // Set optimistic limits immediately
    if (limits) {
      const newLimits = { ...limits };
      switch (action) {
        case 'feedback':
          newLimits.can_submit_feedback = false; // Assume limit reached
          break;
        case 'insights':
          newLimits.can_use_ai_insights = false;
          break;
        case 'analytics':
          newLimits.can_generate_analytics = false;
          break;
        case 'reports':
          newLimits.can_generate_reports = false;
          break;
      }
      setOptimisticLimits(newLimits);
    }

    // Make the actual API call
    const result = await incrementUsage(action);

    // Reset optimistic limits after API call
    setTimeout(() => setOptimisticLimits(null), 1000);

    return result;
  }, [limits, incrementUsage]);

  return {
    checkLimits,
    incrementUsage,
    incrementUsageOptimistic,
    loading,
    error,
    limits: optimisticLimits || limits,
    optimisticLimits,
  };
}