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

  // Fetch trial status from backend
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
        console.error('Error fetching trial status:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        // No trial data found, initialize trial
        await initializeTrial();
        return await fetchTrialStatus();
      }

      const result = data[0];
      return {
        hasAccess: result.has_access,
        plan: result.plan,
        isActive: result.is_active,
        trialExpired: result.trial_expired,
        daysLeft: result.days_left || 0,
        trialEnd: result.trial_end,
        loading: false,
        error: null,
      };
    } catch (error) {
      console.error('Error in fetchTrialStatus:', error);
      return {
        hasAccess: false,
        plan: 'free_trial',
        isActive: false,
        trialExpired: true,
        daysLeft: 0,
        trialEnd: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  // Initialize trial for new user
  const initializeTrial = async (): Promise<void> => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('initialize_user_trial', {
        user_uuid: user.id,
      });

      if (error) {
        console.error('Error initializing trial:', error);
        throw error;
      }

      console.log('✓ Trial initialized for user:', user.id);
    } catch (error) {
      console.error('Error in initializeTrial:', error);
      throw error;
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

    try {
      const { error } = await supabase.rpc('upgrade_user_to_business', {
        user_uuid: user.id,
      });

      if (error) {
        console.error('Error upgrading to business:', error);
        throw error;
      }

      // Refresh trial status after upgrade
      await refreshTrialStatus();
      toast.success('🎉 Welcome to Business! Your subscription has been activated.');
    } catch (error) {
      console.error('Error in upgradeToBusiness:', error);
      toast.error('Failed to upgrade to Business plan');
      throw error;
    }
  };

  // Check if user has access
  const checkAccess = (): boolean => {
    // User has access if they have an active Business plan OR are on an active trial
    const hasBusinessPlan = trialStatus.isActive && trialStatus.plan === 'business';
    const hasActiveTrial = trialStatus.plan === 'free_trial' && trialStatus.daysLeft > 0 && !trialStatus.trialExpired;
    
    return (hasBusinessPlan || hasActiveTrial) && !trialStatus.loading;
  };

  // Check if trial is expired
  const isTrialExpired = (): boolean => {
    // Trial is expired if:
    // 1. trialExpired is true, OR
    // 2. User is on free_trial but daysLeft <= 0, OR  
    // 3. User is on free_trial but trial_end has passed
    if (trialStatus.trialExpired) return true;
    if (trialStatus.plan === 'free_trial' && trialStatus.daysLeft <= 0) return true;
    if (trialStatus.plan === 'free_trial' && trialStatus.trialEnd) {
      const trialEndDate = new Date(trialStatus.trialEnd);
      const now = new Date();
      return trialEndDate <= now;
    }
    return false;
  };

  // Get days left in trial
  const getDaysLeft = (): number => {
    return Math.max(0, trialStatus.daysLeft);
  };

  // Get trial message for UI
  const getTrialMessage = (): string => {
    if (trialStatus.loading) return 'Loading...';
    if (trialStatus.error) return 'Error loading trial status';
    if (trialStatus.isActive) return 'You have an active Business subscription';
    if (isTrialExpired()) return 'Your free trial has expired. Upgrade to Business to continue.';
    if (trialStatus.plan === 'free_trial') return `Your free trial ends in ${getDaysLeft()} days`;
    return 'Unknown trial status';
  };

  // Load trial status on mount and when user changes
  useEffect(() => {
    if (user) {
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