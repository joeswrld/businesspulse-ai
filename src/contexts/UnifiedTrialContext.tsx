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

    // Check if user already has trial data in localStorage
    const existingTrialData = localStorage.getItem(`unified_trial_${user.id}`);
    if (existingTrialData) {
      try {
        const parsed = JSON.parse(existingTrialData);
        // If trial already exists, don't reinitialize
        if (parsed.trialStart && parsed.plan === 'free_trial') {
          console.log('🔄 Using existing trial data from localStorage');
          return {
            ...parsed,
            loading: false,
            error: null,
          };
        }
      } catch (error) {
        console.warn('Error parsing existing trial data:', error);
      }
    }

    // Check if user has trial data in database
    try {
      const { data: existingData, error: dbError } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

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

          // Update localStorage
          localStorage.setItem(`unified_trial_${user.id}`, JSON.stringify(status));
          return status;
        }
      }
    } catch (error) {
      console.warn('Error checking existing trial data:', error);
    }

    // Create new trial - 8 days from now
    const now = new Date();
    const trialStart = now.toISOString();
    const trialEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days

    console.log('🆕 Initializing new trial for user:', user.id, {
      trialStart,
      trialEnd,
      daysLeft: 8
    });

    // Try to initialize in database
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

    // Store in localStorage as backup
    const trialData = {
      plan: 'free_trial',
      isActive: true,
      subscriptionActive: false,
      trialStart,
      trialEnd,
      trialExpired: false,
      daysLeft: 8,
      subscriptionExpiryDate: null,
    };
    
    localStorage.setItem(`unified_trial_${user.id}`, JSON.stringify(trialData));

    return {
      hasAccess: true, // New users should have access
      plan: 'free_trial',
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
  };

  // Fetch trial status from database
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
        // Use localStorage fallback
        const localData = localStorage.getItem(`unified_trial_${user.id}`);
        if (localData) {
          const local = JSON.parse(localData);
          return {
            ...local,
            loading: false,
            error: null,
          };
        }
        // No local data, create new trial
        return await initializeTrial();
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
        // Business users - show days since upgrade (countdown from when they paid)
        const upgradeDate = new Date(result.trial_end || new Date());
        daysLeft = Math.max(0, Math.floor((now.getTime() - upgradeDate.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (result.plan === 'free_trial' && result.trial_end) {
        // Trial users - show days remaining (countdown to trial end)
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

      // Sync with localStorage
      localStorage.setItem(`unified_trial_${user.id}`, JSON.stringify(status));

      return status;
    } catch (error) {
      console.error('Error in fetchTrialStatus:', error);
      // Use localStorage fallback
      const localData = localStorage.getItem(`unified_trial_${user.id}`);
      if (localData) {
        const local = JSON.parse(localData);
        return {
          ...local,
          loading: false,
          error: null,
        };
      }
      // No local data, create new trial
      return await initializeTrial();
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
        // Continue with localStorage update
      } else {
        console.log('✅ Database upgrade successful');
      }

      // Update localStorage
      const now = new Date();
      const businessData = {
        plan: 'business',
        isActive: true,
        subscriptionActive: true,
        trialExpired: false,
        daysLeft: 0, // Business users start countdown from 0
        trialStart: now.toISOString(), // Business plan start date
        trialEnd: now.toISOString(), // Business plan start date (same as trialStart for business)
        subscriptionExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };
      
      localStorage.setItem(`unified_trial_${user.id}`, JSON.stringify(businessData));

      // Update state immediately
      setTrialStatus(prev => ({
        ...prev,
        hasAccess: true,
        plan: 'business',
        isActive: true,
        subscriptionActive: true,
        trialExpired: false,
        daysLeft: 0, // Business users start countdown from 0
        trialStart: now.toISOString(), // Business plan start date
        trialEnd: now.toISOString(), // Business plan start date
        subscriptionExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        loading: false,
        error: null,
      }));

      console.log('🎉 Successfully upgraded to Business plan');
      toast.success('🎉 Welcome to Business! Your subscription has been activated.');
    } catch (error) {
      console.error('Error in upgradeToBusiness:', error);
      toast.error('Failed to upgrade to Business plan');
      throw error;
    }
  };

  // FIXED: Check if user has access - Updated platform locking logic
  const checkAccess = (): boolean => {
    // If loading, give access by default (don't lock out during loading)
    if (trialStatus.loading) {
      console.log('⏳ Loading state - allowing access');
      return true;
    }

    // If there's an error, give access (don't lock out due to errors)
    if (trialStatus.error) {
      console.log('⚠️ Error state - allowing access');
      return true;
    }

    // Business plan users with active subscription ALWAYS have access
    if (trialStatus.plan === 'business' && trialStatus.subscriptionActive) {
      console.log('✅ Business user with active subscription - allowing access');
      return true;
    }

    // Trial users have access if trial is active and not expired
    if (trialStatus.plan === 'free_trial') {
      // New users (never used trial before) should not be locked
      if (!trialStatus.trialStart) {
        console.log('✅ New user without trial start - allowing access');
        return true;
      }

      // If trial is active and not expired, allow access
      if (!trialStatus.trialExpired && trialStatus.daysLeft > 0) {
        console.log('✅ Trial user with active trial - allowing access');
        return true;
      }

      // If trial is expired, lock
      if (trialStatus.trialExpired || trialStatus.daysLeft <= 0) {
        console.log('🔒 Trial user with expired trial - locking platform');
        return false;
      }
    }

    // Business plan users with inactive subscription should be locked
    if (trialStatus.plan === 'business' && !trialStatus.subscriptionActive) {
      console.log('🔒 Business user with inactive subscription - locking platform');
      return false;
    }

    // Default: allow access (for edge cases and new users)
    console.log('✅ Default access granted');
    return true;
  };

  // Get lock reason for debugging
  const getLockReason = (): 'trial_expired' | 'subscription_inactive' | 'loading' | 'none' => {
    if (trialStatus.loading) return 'loading';
    if (trialStatus.plan === 'business' && !trialStatus.subscriptionActive) return 'subscription_inactive';
    if (trialStatus.plan === 'free_trial' && trialStatus.trialExpired) return 'trial_expired';
    return 'none';
  };

  // Check if trial is expired
  const isTrialExpired = (): boolean => {
    // Business plan users never have expired trials
    if (trialStatus.plan === 'business' && trialStatus.subscriptionActive) {
      return false;
    }
    
    // If loading, don't expire (give benefit of doubt)
    if (trialStatus.loading) {
      return false;
    }
    
    // Trial is expired if explicitly set or days left <= 0
    return trialStatus.trialExpired || (trialStatus.plan === 'free_trial' && trialStatus.daysLeft <= 0);
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
      console.log('👤 User logged in, initializing trial system:', user.id);
      
      // First, check localStorage for immediate status
      const localData = localStorage.getItem(`unified_trial_${user.id}`);
      if (localData) {
        try {
          const local = JSON.parse(localData);
          setTrialStatus({
            ...local,
            loading: false,
            error: null,
          });
          console.log('✅ Loaded trial status from localStorage:', local);
        } catch (e) {
          console.error('Error parsing localStorage data:', e);
          // Create new trial
          initializeTrial().then(setTrialStatus);
        }
      } else {
        // No local data, create new trial
        console.log('🆕 No local trial data, creating new trial');
        initializeTrial().then(setTrialStatus);
      }
      
      // Then try to sync with database
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
  }, [user, refreshTrialStatus]);

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

// Hook to use unified trial context
export const useUnifiedTrial = (): UnifiedTrialContextType => {
  const context = useContext(UnifiedTrialContext);
  if (context === undefined) {
    throw new Error('useUnifiedTrial must be used within a UnifiedTrialProvider');
  }
  return context;
};

export default UnifiedTrialProvider;