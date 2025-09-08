import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for NoteX Platform
export interface NoteXTrialStatus {
  hasAccess: boolean;
  plan: 'free_trial' | 'business';
  isActive: boolean;
  trialExpired: boolean;
  daysLeft: number;
  trialStart: string | null;
  trialEnd: string | null;
  loading: boolean;
  error: string | null;
}

export interface NoteXTrialContextType {
  trialStatus: NoteXTrialStatus;
  refreshTrialStatus: () => Promise<void>;
  upgradeToBusiness: () => Promise<void>;
  checkAccess: () => boolean;
  getTrialMessage: () => string;
  isTrialExpired: () => boolean;
  getDaysLeft: () => number;
}

// Create context
const NoteXTrialContext = createContext<NoteXTrialContextType | undefined>(undefined);

// Provider component
export const NoteXTrialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<NoteXTrialStatus>({
    hasAccess: false,
    plan: 'free_trial',
    isActive: false,
    trialExpired: false,
    daysLeft: 0,
    trialStart: null,
    trialEnd: null,
    loading: true,
    error: null,
  });

  // Initialize trial for new user (8 days)
  const initializeTrial = async (): Promise<NoteXTrialStatus> => {
    if (!user) {
      return {
        hasAccess: false,
        plan: 'free_trial',
        isActive: false,
        trialExpired: true,
        daysLeft: 0,
        trialStart: null,
        trialEnd: null,
        loading: false,
        error: 'No user logged in',
      };
    }

    const now = new Date();
    const trialStart = now.toISOString();
    const trialEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days

    // Try to initialize in database
    try {
      const { error } = await supabase.rpc('initialize_user_trial', {
        user_uuid: user.id,
      });
      
      if (error) {
        console.error('Failed to initialize trial in database:', error);
      }
    } catch (error) {
      console.error('Error initializing trial:', error);
    }

    // Store in localStorage as backup
    const trialData = {
      plan: 'free_trial',
      isActive: true,
      trialStart,
      trialEnd,
      trialExpired: false,
      daysLeft: 8,
    };
    
    localStorage.setItem(`notex_trial_${user.id}`, JSON.stringify(trialData));

    return {
      hasAccess: true,
      plan: 'free_trial',
      isActive: true,
      trialExpired: false,
      daysLeft: 8,
      trialStart,
      trialEnd,
      loading: false,
      error: null,
    };
  };

  // Fetch trial status from database
  const fetchTrialStatus = async (): Promise<NoteXTrialStatus> => {
    if (!user) {
      return {
        hasAccess: false,
        plan: 'free_trial',
        isActive: false,
        trialExpired: true,
        daysLeft: 0,
        trialStart: null,
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
        const localData = localStorage.getItem(`notex_trial_${user.id}`);
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
        return await initializeTrial();
      }

      const result = data[0];
      const now = new Date();
      
      // Calculate days left
      let daysLeft = 0;
      if (result.plan === 'business' && result.is_active) {
        // Business users - show days since upgrade
        const upgradeDate = new Date(result.trial_end || new Date());
        daysLeft = Math.floor((now.getTime() - upgradeDate.getTime()) / (1000 * 60 * 60 * 24));
      } else if (result.plan === 'free_trial' && result.trial_end) {
        // Trial users - show days remaining
        const trialEndDate = new Date(result.trial_end);
        daysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      const status = {
        hasAccess: result.has_access,
        plan: (result.plan || 'free_trial') as "free_trial" | "business",
        isActive: result.is_active || (result.plan === 'free_trial' && daysLeft > 0),
        trialExpired: result.trial_expired || (result.plan === 'free_trial' && daysLeft <= 0),
        daysLeft: daysLeft,
        trialStart: new Date().toISOString(),
        trialEnd: result.trial_end,
        loading: false,
        error: null,
      };

      // Sync with localStorage
      localStorage.setItem(`notex_trial_${user.id}`, JSON.stringify(status));

      return status;
    } catch (error) {
      console.error('Error in fetchTrialStatus:', error);
      // Use localStorage fallback
      const localData = localStorage.getItem(`notex_trial_${user.id}`);
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
      const businessData = {
        plan: 'business',
        isActive: true,
        trialExpired: false,
        daysLeft: 0,
        trialStart: new Date().toISOString(),
        trialEnd: new Date().toISOString(),
      };
      
      localStorage.setItem(`notex_trial_${user.id}`, JSON.stringify(businessData));

      // Update state immediately
      setTrialStatus(prev => ({
        ...prev,
        hasAccess: true,
        plan: 'business',
        isActive: true,
        trialExpired: false,
        daysLeft: 0,
        trialStart: new Date().toISOString(),
        trialEnd: new Date().toISOString(),
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
    
    // Trial users have access if trial is active and not expired
    if (trialStatus.plan === 'free_trial' && trialStatus.isActive && !trialStatus.trialExpired) {
      return true;
    }
    
    // If loading, give access by default (don't lock out during loading)
    if (trialStatus.loading) {
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
    if (trialStatus.loading) return 'Loading...';
    if (trialStatus.error) return 'Error loading trial status';
    if (trialStatus.plan === 'business' && trialStatus.isActive) return 'You have an active Business subscription';
    if (trialStatus.plan === 'free_trial' && trialStatus.isActive) return `Your free trial ends in ${getDaysLeft()} days`;
    if (isTrialExpired()) return 'Your free trial has expired. Upgrade to the Business Plan to continue using NoteX.';
    return 'Unknown trial status';
  };

  // Load trial status on mount and when user changes
  useEffect(() => {
    if (user) {
      // First, check localStorage for immediate status
      const localData = localStorage.getItem(`notex_trial_${user.id}`);
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
        initializeTrial().then(setTrialStatus);
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
        trialStart: null,
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

  const contextValue: NoteXTrialContextType = {
    trialStatus,
    refreshTrialStatus,
    upgradeToBusiness,
    checkAccess,
    getTrialMessage,
    isTrialExpired,
    getDaysLeft,
  };

  return (
    <NoteXTrialContext.Provider value={contextValue}>
      {children}
    </NoteXTrialContext.Provider>
  );
};

// Hook to use trial context
export const useNoteXTrial = (): NoteXTrialContextType => {
  const context = useContext(NoteXTrialContext);
  if (context === undefined) {
    throw new Error('useNoteXTrial must be used within a NoteXTrialProvider');
  }
  return context;
};

export default NoteXTrialProvider;