import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for Unified Trial System
export interface UnifiedTrialStatus {
  hasAccess: boolean;
  plan: 'free_trial' | 'business';
  isActive: boolean;
  trialExpired: boolean;
  daysLeft: number;
  trialStart: string | null;
  trialEnd: string | null;
  subscriptionActive: boolean;
  subscriptionExpiryDate: string | null;
  loading: boolean;
  error: string | null;
}

export interface UnifiedTrialContextType {
  trialStatus: UnifiedTrialStatus;
  refreshTrialStatus: () => Promise<void>;
  upgradeToBusiness: () => Promise<void>;
  checkAccess: () => boolean;
  getTrialMessage: () => string;
  isTrialExpired: () => boolean;
  getDaysLeft: () => number;
  getLockReason: () => 'trial_expired' | 'subscription_inactive' | 'loading' | 'none';
}

// Create context
const UnifiedTrialContext = createContext<UnifiedTrialContextType | undefined>(undefined);

// Provider component
export const UnifiedTrialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<UnifiedTrialStatus>({
    hasAccess: false,
    plan: 'free_trial',
    isActive: false,
    trialExpired: false,
    daysLeft: 0,
    trialStart: null,
    trialEnd: null,
    subscriptionActive: false,
    subscriptionExpiryDate: null,
    loading: true,
    error: null,
  });

  // Initialize trial for new user (8 days from signup)
  // SECURITY: Always creates trial in database, localStorage is for display only
  const initializeTrial = async (): Promise<UnifiedTrialStatus> => {
    if (!user) {
      return {
        hasAccess: false,
        plan: 'free_trial',
        isActive: false,
        trialExpired: true,
        daysLeft: 0,
        trialStart: null,
        trialEnd: null,
        subscriptionActive: false,
        subscriptionExpiryDate: null,
        loading: false,
        error: 'No user logged in',
      };
    }

    // Check if user has trial data in database first
    try {
      const { data: existingData, error: dbError } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingData && !dbError) {
        console.log('🔄 Using existing trial data from database');
        const now = new Date();
        const trialStart = existingData.created_at;
        const trialEnd = existingData.trial_ends_at;
        
        if (trialStart && trialEnd) {
          const trialStartDate = new Date(trialStart);
          const trialEndDate = new Date(trialEnd);
          const daysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          
          const status = {
            hasAccess: daysLeft > 0,
            plan: 'free_trial' as const,
            isActive: daysLeft > 0,
            subscriptionActive: false,
            trialExpired: daysLeft <= 0,
            daysLeft,
            trialStart,
            trialEnd,
            subscriptionExpiryDate: null,
            loading: false,
            error: null,
          };

          // Cache for display only
          localStorage.setItem(`unified_trial_${user.id}_cache`, JSON.stringify(status));
          return status;
        }
      }
    } catch (error) {
      console.warn('Error checking existing trial data:', error);
    }

    // Create new trial - 8 days from now
    const now = new Date();
    const trialStart = now.toISOString();
    const trialEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();

    console.log('🆕 Initializing new trial for user:', user.id, {
      trialStart,
      trialEnd,
      daysLeft: 8
    });

    // Create in database
    try {
      const { error } = await supabase.rpc('initialize_user_trial', {
        user_uuid: user.id,
      });
      
      if (error) {
        console.error('Failed to initialize trial in database:', error);
      } else {
        console.log('✅ Trial initialized in database successfully');
      }
    } catch (error) {
      console.error('Error initializing trial:', error);
    }

    const status = {
      hasAccess: true,
      plan: 'free_trial' as const,
      isActive: true,
      subscriptionActive: false,
      trialExpired: false,
      daysLeft: 8,
      trialStart,
      trialEnd,
      subscriptionExpiryDate: null,
      loading: false,
      error: null,
    };

    // Cache for display only - not used for authorization
    localStorage.setItem(`unified_trial_${user.id}_cache`, JSON.stringify(status));

    return status;
  };

  // Fetch trial status from database
  // SECURITY: Always fetches from database, never trusts localStorage for authorization
  const fetchTrialStatus = async (): Promise<UnifiedTrialStatus> => {
    if (!user) {
      return {
        hasAccess: false,
        plan: 'free_trial',
        isActive: false,
        trialExpired: true,
        daysLeft: 0,
        trialStart: null,
        trialEnd: null,
        subscriptionActive: false,
        subscriptionExpiryDate: null,
        loading: false,
        error: 'No user logged in',
      };
    }

    try {
      console.log('🔍 Fetching trial status for user:', user.id);
      
      const { data, error } = await supabase.rpc('check_user_access', {
        user_uuid: user.id,
      });

      if (error) {
        console.error('Database error:', error);
        // SECURITY: On error, deny access - do NOT fall back to localStorage
        return {
          hasAccess: false,
          plan: 'free_trial',
          isActive: false,
          trialExpired: true,
          daysLeft: 0,
          trialStart: null,
          trialEnd: null,
          subscriptionActive: false,
          subscriptionExpiryDate: null,
          loading: false,
          error: error.message,
        };
      }

      if (!data || data.length === 0) {
        // No data in database, create new trial
        console.log('📝 No trial data found, creating new trial');
        return await initializeTrial();
      }

      const result = data[0];
      const now = new Date();
      
      // Calculate days left
      let daysLeft = 0;
      if (result.plan === 'business' && result.is_active) {
        const upgradeDate = new Date(result.trial_end || new Date());
        daysLeft = Math.max(0, Math.floor((now.getTime() - upgradeDate.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (result.plan === 'free_trial' && result.trial_end) {
        const trialEndDate = new Date(result.trial_end);
        daysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      const status = {
        hasAccess: result.has_access,
        plan: (result.plan || 'free_trial') as "free_trial" | "business",
        isActive: result.is_active || (result.plan === 'free_trial' && daysLeft > 0),
        subscriptionActive: result.is_active || false,
        trialExpired: result.trial_expired || (result.plan === 'free_trial' && daysLeft <= 0),
        daysLeft: daysLeft,
        trialStart: result.trial_end,
        trialEnd: result.trial_end,
        subscriptionExpiryDate: null,
        loading: false,
        error: null,
      };

      console.log('📊 Trial status fetched:', {
        hasAccess: status.hasAccess,
        plan: status.plan,
        subscriptionActive: status.subscriptionActive,
        trialExpired: status.trialExpired,
        daysLeft: status.daysLeft
      });

      // Cache for display only - not used for authorization
      localStorage.setItem(`unified_trial_${user.id}_cache`, JSON.stringify(status));

      return status;
    } catch (error) {
      console.error('Error in fetchTrialStatus:', error);
      // SECURITY: On error, deny access - do NOT fall back to localStorage
      return {
        hasAccess: false,
        plan: 'free_trial',
        isActive: false,
        trialExpired: true,
        daysLeft: 0,
        trialStart: null,
        trialEnd: null,
        subscriptionActive: false,
        subscriptionExpiryDate: null,
        loading: false,
        error: 'Failed to fetch trial status',
      };
    }
  };

  // Refresh trial status
  const refreshTrialStatus = async (): Promise<void> => {
    setTrialStatus(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const newStatus = await fetchTrialStatus();
      setTrialStatus(newStatus);
    } catch (error) {
      setTrialStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh trial status',
      }));
    }
  };

  // Upgrade to Business plan
  const upgradeToBusiness = async (): Promise<void> => {
    if (!user) return;

    console.log('🚀 Upgrading to Business plan for user:', user.id);

    try {
      // Update database
      const { error } = await supabase.rpc('upgrade_user_to_business', {
        user_uuid: user.id,
      });

      if (error) {
        console.error('Database upgrade error:', error);
        toast.error('Failed to upgrade to Business plan');
        throw error;
      }

      console.log('✅ Database upgrade successful');

      // Refresh from database
      await refreshTrialStatus();

      console.log('🎉 Successfully upgraded to Business plan');
      toast.success('🎉 Welcome to Business! Your subscription has been activated.');
    } catch (error) {
      console.error('Error in upgradeToBusiness:', error);
      toast.error('Failed to upgrade to Business plan');
      throw error;
    }
  };

  // UNLOCKED PLATFORM: Always allow access regardless of trial/subscription status
  const checkAccess = (): boolean => {
    console.log('🔓 UNLOCKED PLATFORM - Always allowing access');
    return true;
  };

  // Get lock reason for debugging
  const getLockReason = (): 'trial_expired' | 'subscription_inactive' | 'loading' | 'none' => {
    if (trialStatus.loading) return 'loading';
    if (trialStatus.plan === 'business' && !trialStatus.subscriptionActive) return 'subscription_inactive';
    if (trialStatus.plan === 'free_trial' && trialStatus.trialExpired) return 'trial_expired';
    return 'none';
  };

  // UNLOCKED PLATFORM: Never consider trial expired
  const isTrialExpired = (): boolean => {
    console.log('🔓 UNLOCKED PLATFORM - Trial never expires');
    return false;
  };

  // Get days left in trial
  const getDaysLeft = (): number => {
    return Math.max(0, trialStatus.daysLeft);
  };

  // Get trial message for UI
  const getTrialMessage = (): string => {
    if (trialStatus.loading) return 'Loading plan status...';
    if (trialStatus.error) return 'Error loading plan status';
    
    if (trialStatus.plan === 'business' && trialStatus.subscriptionActive) {
      const daysSinceUpgrade = getDaysLeft();
      if (daysSinceUpgrade === 0) {
        return 'Welcome to Business! Your subscription is active.';
      } else {
        return `Business Plan - Active for ${daysSinceUpgrade} days`;
      }
    }
    
    if (trialStatus.plan === 'free_trial' && !trialStatus.trialExpired) {
      const daysLeft = getDaysLeft();
      if (daysLeft === 8) {
        return 'Welcome! Your 8-day free trial has started.';
      } else if (daysLeft > 0) {
        return `Free Trial - ${daysLeft} days remaining`;
      } else {
        return 'Your free trial has ended.';
      }
    }
    
    if (isTrialExpired()) {
      return 'Your free trial has expired. Upgrade to Business to continue using NoteX.';
    }
    
    if (trialStatus.plan === 'business' && !trialStatus.subscriptionActive) {
      return 'Your Business subscription is inactive. Please contact support.';
    }
    
    return 'Plan status unknown';
  };

  // Load trial status on mount and when user changes
  useEffect(() => {
    if (user) {
      console.log('👤 User logged in, fetching trial status from database:', user.id);
      
      // Show cached data immediately for UX, but always validate with database
      const cachedData = localStorage.getItem(`unified_trial_${user.id}_cache`);
      if (cachedData) {
        try {
          const cached = JSON.parse(cachedData);
          setTrialStatus({
            ...cached,
            loading: true, // Still loading actual status
            error: null,
          });
          console.log('✅ Loaded cached status for display');
        } catch (e) {
          console.error('Error parsing cached data:', e);
        }
      }
      
      // Always fetch from database for real authorization
      refreshTrialStatus();
    } else {
      console.log('👤 No user logged in, resetting trial status');
      setTrialStatus({
        hasAccess: false,
        plan: 'free_trial',
        isActive: false,
        trialExpired: true,
        daysLeft: 0,
        trialStart: null,
        trialEnd: null,
        subscriptionActive: false,
        subscriptionExpiryDate: null,
        loading: false,
        error: null,
      });
    }
  }, [user]);

  // Auto-refresh trial status every 5 minutes
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshTrialStatus();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  const contextValue: UnifiedTrialContextType = {
    trialStatus,
    refreshTrialStatus,
    upgradeToBusiness,
    checkAccess,
    getTrialMessage,
    isTrialExpired,
    getDaysLeft,
    getLockReason,
  };

  return (
    <UnifiedTrialContext.Provider value={contextValue}>
      {children}
    </UnifiedTrialContext.Provider>
  );
};

// Hook to use the Unified Trial Context
export const useUnifiedTrial = (): UnifiedTrialContextType => {
  const context = useContext(UnifiedTrialContext);
  if (!context) {
    throw new Error('useUnifiedTrial must be used within UnifiedTrialProvider');
  }
  return context;
};
