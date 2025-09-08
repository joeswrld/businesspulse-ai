import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface TrialStatus {
  hasAccess: boolean;
  plan: 'free_trial' | 'business';
  isActive: boolean;
  trialExpired: boolean;
  daysLeft: number;
  trialEnd: string | null;
  loading: boolean;
  error: string | null;
}

export interface TrialContextType {
  trialStatus: TrialStatus;
  refreshTrialStatus: () => Promise<void>;
  upgradeToBusiness: () => Promise<void>;
  checkAccess: () => boolean;
  getTrialMessage: () => string;
  isTrialExpired: () => boolean;
  getDaysLeft: () => number;
}

// Create context
const TrialContext = createContext<TrialContextType | undefined>(undefined);

// Provider component
export const TrialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    hasAccess: false,
    plan: 'free_trial',
    isActive: false,
    trialExpired: false,
    daysLeft: 0,
    trialEnd: null,
    loading: true,
    error: null,
  });

  // Get user's trial status from localStorage
  const getLocalStorageStatus = (): TrialStatus | null => {
    if (!user) return null;

    const businessKey = `business_${user.id}`;
    const trialKey = `trial_${user.id}`;
    
    // Check for Business plan first
    const businessData = localStorage.getItem(businessKey);
    if (businessData) {
      try {
        const business = JSON.parse(businessData);
        if (business.isActive) {
          const upgradeDate = new Date(business.upgraded || business.created || new Date());
          const now = new Date();
          const daysSinceUpgrade = Math.floor((now.getTime() - upgradeDate.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            hasAccess: true,
            plan: 'business',
            isActive: true,
            trialExpired: false,
            daysLeft: daysSinceUpgrade,
            trialEnd: upgradeDate.toISOString(),
            loading: false,
            error: null,
          };
        }
      } catch (e) {
        console.error('Error parsing business data:', e);
      }
    }
    
    // Check for trial
    const trialData = localStorage.getItem(trialKey);
    if (trialData) {
      try {
        const trial = JSON.parse(trialData);
        const now = new Date();
        const trialEnd = new Date(trial.trialEnd);
        const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        
        return {
          hasAccess: trialEnd > now,
          plan: 'free_trial',
          isActive: trialEnd > now,
          trialExpired: trialEnd <= now,
          daysLeft,
          trialEnd: trial.trialEnd,
          loading: false,
          error: null,
        };
      } catch (e) {
        console.error('Error parsing trial data:', e);
      }
    }
    
    return null;
  };

  // Create new trial for user
  const createNewTrial = (): TrialStatus => {
    if (!user) {
      return {
        hasAccess: false,
        plan: 'free_trial',
        isActive: false,
        trialExpired: true,
        daysLeft: 0,
        trialEnd: null,
        loading: false,
        error: 'No user logged in',
      };
    }

    const trialEnd = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000); // 8 days from now
    const trialData = {
      trialEnd: trialEnd.toISOString(),
      created: new Date().toISOString(),
    };
    
    const trialKey = `trial_${user.id}`;
    localStorage.setItem(trialKey, JSON.stringify(trialData));
    
    return {
      hasAccess: true,
      plan: 'free_trial',
      isActive: true,
      trialExpired: false,
      daysLeft: 8,
      trialEnd: trialEnd.toISOString(),
      loading: false,
      error: null,
    };
  };

  // Fetch trial status from database
  const fetchTrialStatus = async (): Promise<TrialStatus> => {
    if (!user) {
      return {
        hasAccess: false,
        plan: 'free_trial',
        isActive: false,
        trialExpired: true,
        daysLeft: 0,
        trialEnd: null,
        loading: false,
        error: 'No user logged in',
      };
    }

    try {
      const { data, error } = await supabase.rpc('check_user_access', {
        user_uuid: user.id,
      });

      if (error) {
        console.error('Database error:', error);
        // Use localStorage fallback
        const localStatus = getLocalStorageStatus();
        return localStatus || createNewTrial();
      }

      if (!data || data.length === 0) {
        // No data in database, create new trial
        const newTrial = createNewTrial();
        
        // Try to initialize in database
        try {
          await supabase.rpc('initialize_user_trial', {
            user_uuid: user.id,
          });
        } catch (initError) {
          console.error('Failed to initialize trial in database:', initError);
        }
        
        return newTrial;
      }

      const result = data[0];
      
      // Calculate days based on plan type
      let daysLeft = 0;
      if (result.plan === 'business' && result.is_active) {
        // For business users, show days since upgrade
        const upgradeDate = new Date(result.trial_end || new Date());
        const now = new Date();
        daysLeft = Math.floor((now.getTime() - upgradeDate.getTime()) / (1000 * 60 * 60 * 24));
      } else if (result.plan === 'free_trial') {
        // For trial users, show days remaining
        daysLeft = result.days_left || 0;
      }
      
      const status = {
        hasAccess: result.has_access,
        plan: (result.plan || 'free_trial') as "free_trial" | "business",
        isActive: result.is_active || (result.plan === 'free_trial' && result.days_left > 0),
        trialExpired: result.trial_expired,
        daysLeft: daysLeft,
        trialEnd: result.trial_end,
        loading: false,
        error: null,
      };
      
      // Sync with localStorage
      if (result.plan === 'business' && result.is_active) {
        const businessKey = `business_${user.id}`;
        localStorage.setItem(businessKey, JSON.stringify({
          isActive: true,
          upgraded: result.trial_end || new Date().toISOString(),
          plan: 'business'
        }));
      }
      
      return status;
    } catch (error) {
      console.error('Error in fetchTrialStatus:', error);
      // Use localStorage fallback
      const localStatus = getLocalStorageStatus();
      return localStatus || createNewTrial();
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

    console.log('Upgrading to Business plan...');

    try {
      // Update database
      const { error } = await supabase.rpc('upgrade_user_to_business', {
        user_uuid: user.id,
      });

      if (error) {
        console.error('Database upgrade error:', error);
        // Continue with localStorage update
      }

      // Update localStorage
      const businessKey = `business_${user.id}`;
      const upgradeDate = new Date();
      localStorage.setItem(businessKey, JSON.stringify({
        isActive: true,
        upgraded: upgradeDate.toISOString(),
        plan: 'business'
      }));

      // Update state immediately
      setTrialStatus(prev => ({
        ...prev,
        hasAccess: true,
        plan: 'business',
        isActive: true,
        trialExpired: false,
        daysLeft: 0, // Will be calculated on next refresh
        trialEnd: upgradeDate.toISOString(),
        loading: false,
        error: null,
      }));

      console.log('Successfully upgraded to Business plan');
      toast.success('🎉 Welcome to Business! Your subscription has been activated.');
    } catch (error) {
      console.error('Error in upgradeToBusiness:', error);
      toast.error('Failed to upgrade to Business plan');
      throw error;
    }
  };

  // Check if user has access
  const checkAccess = (): boolean => {
    // Business plan users always have access
    if (trialStatus.plan === 'business' && trialStatus.isActive) {
      return true;
    }
    
    // Trial users have access if trial is active
    if (trialStatus.plan === 'free_trial' && trialStatus.isActive && !trialStatus.trialExpired) {
      return true;
    }
    
    // If loading or error, give access by default (don't lock out)
    if (trialStatus.loading || trialStatus.error) {
      return true;
    }
    
    return false;
  };

  // Check if trial is expired
  const isTrialExpired = (): boolean => {
    // Business plan users never have expired trials
    if (trialStatus.plan === 'business' && trialStatus.isActive) {
      return false;
    }
    
    // If loading or error, don't expire (give benefit of doubt)
    if (trialStatus.loading || trialStatus.error) {
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
    if (trialStatus.loading) return 'Loading...';
    if (trialStatus.error) return 'Error loading trial status';
    if (trialStatus.plan === 'business' && trialStatus.isActive) return 'You have an active Business subscription';
    if (trialStatus.plan === 'free_trial' && trialStatus.isActive) return `Your free trial ends in ${getDaysLeft()} days`;
    if (isTrialExpired()) return 'Your free trial has expired. Upgrade to Business to continue.';
    return 'Unknown trial status';
  };

  // Load trial status on mount and when user changes
  useEffect(() => {
    if (user) {
      // First, check localStorage for immediate status
      const localStatus = getLocalStorageStatus();
      if (localStatus) {
        setTrialStatus(localStatus);
        console.log('✅ Loaded trial status from localStorage:', localStatus);
      } else {
        // No local data, create new trial
        const newTrial = createNewTrial();
        setTrialStatus(newTrial);
        console.log('✅ Created new trial:', newTrial);
      }
      
      // Then try to sync with database
      refreshTrialStatus();
    } else {
      setTrialStatus({
        hasAccess: false,
        plan: 'free_trial',
        isActive: false,
        trialExpired: true,
        daysLeft: 0,
        trialEnd: null,
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

    return () => clearInterval(interval);
  }, [user]);

  const contextValue: TrialContextType = {
    trialStatus,
    refreshTrialStatus,
    upgradeToBusiness,
    checkAccess,
    getTrialMessage,
    isTrialExpired,
    getDaysLeft,
  };

  return (
    <TrialContext.Provider value={contextValue}>
      {children}
    </TrialContext.Provider>
  );
};

// Hook to use trial context
export const useTrial = (): TrialContextType => {
  const context = useContext(TrialContext);
  if (context === undefined) {
    throw new Error('useTrial must be used within a TrialProvider');
  }
  return context;
};

export default TrialProvider;