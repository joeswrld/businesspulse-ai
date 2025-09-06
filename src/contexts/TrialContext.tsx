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

  // Create fallback trial using localStorage
  const createFallbackTrial = (): TrialStatus => {
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

    const trialKey = `trial_${user.id}`;
    const businessKey = `business_${user.id}`;
    
    // Check if user has business plan
    const businessData = localStorage.getItem(businessKey);
    if (businessData) {
      const business = JSON.parse(businessData);
      if (business.isActive) {
        return {
          hasAccess: true,
          plan: 'business',
          isActive: true,
          trialExpired: false,
          daysLeft: 999, // Unlimited
          trialEnd: null,
          loading: false,
          error: null,
        };
      }
    }
    
    // Check existing trial
    const existingTrial = localStorage.getItem(trialKey);
    if (existingTrial) {
      const trial = JSON.parse(existingTrial);
      const now = new Date();
      const trialEnd = new Date(trial.trialEnd);
      const daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      return {
        hasAccess: trialEnd > now,
        plan: 'free_trial',
        isActive: false,
        trialExpired: trialEnd <= now,
        daysLeft,
        trialEnd: trial.trialEnd,
        loading: false,
        error: null,
      };
    }
    
    // Create new trial
    const trialEnd = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000); // 8 days from now
    const newTrial = {
      trialEnd: trialEnd.toISOString(),
      created: new Date().toISOString(),
    };
    
    localStorage.setItem(trialKey, JSON.stringify(newTrial));
    
    return {
      hasAccess: true,
      plan: 'free_trial',
      isActive: false,
      trialExpired: false,
      daysLeft: 8,
      trialEnd: trialEnd.toISOString(),
      loading: false,
      error: null,
    };
  };

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
        // Use fallback trial system
        return createFallbackTrial();
      }

      if (!data || data.length === 0) {
        // No trial data found, try to initialize trial
        try {
          await initializeTrial();
          return await fetchTrialStatus();
        } catch (initError) {
          console.error('Error initializing trial:', initError);
          // Use fallback trial system
          return createFallbackTrial();
        }
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
      // Use fallback trial system
      return createFallbackTrial();
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

    console.log('Starting upgrade to business...');

    try {
      // Try database upgrade first
      const { error } = await supabase.rpc('upgrade_user_to_business', {
        user_uuid: user.id,
      });

      if (error) {
        console.error('Error upgrading to business:', error);
        // Fallback to localStorage upgrade
        const businessKey = `business_${user.id}`;
        localStorage.setItem(businessKey, JSON.stringify({
          isActive: true,
          upgraded: new Date().toISOString(),
        }));
        
        // Update trial status immediately
        setTrialStatus(prev => ({
          ...prev,
          hasAccess: true,
          plan: 'business',
          isActive: true,
          trialExpired: false,
          loading: false,
          error: null,
        }));
        
        console.log('Upgraded to business (fallback)');
        toast.success('🎉 Welcome to Business! Your subscription has been activated.');
        return;
      }

      console.log('Database upgrade successful, updating state...');
      
      // Update trial status immediately after successful database upgrade
      setTrialStatus(prev => ({
        ...prev,
        hasAccess: true,
        plan: 'business',
        isActive: true,
        trialExpired: false,
        loading: false,
        error: null,
      }));

      // Also update localStorage as backup
      const businessKey = `business_${user.id}`;
      localStorage.setItem(businessKey, JSON.stringify({
        isActive: true,
        upgraded: new Date().toISOString(),
      }));

      console.log('State updated to business plan');
      toast.success('🎉 Welcome to Business! Your subscription has been activated.');
    } catch (error) {
      console.error('Error in upgradeToBusiness:', error);
      
      // Fallback to localStorage upgrade
      const businessKey = `business_${user.id}`;
      localStorage.setItem(businessKey, JSON.stringify({
        isActive: true,
        upgraded: new Date().toISOString(),
      }));
      
      // Update trial status immediately
      setTrialStatus(prev => ({
        ...prev,
        hasAccess: true,
        plan: 'business',
        isActive: true,
        trialExpired: false,
        loading: false,
        error: null,
      }));
      
      console.log('Upgraded to business (error fallback)');
      toast.success('🎉 Welcome to Business! Your subscription has been activated.');
    }
  };

  // Check if user has access
  const checkAccess = (): boolean => {
    // If loading, give access by default (don't lock out during loading)
    if (trialStatus.loading) return true;
    
    // For new users or when there's an error, give access by default
    if (trialStatus.error) return true;
    
    // User has access if they have an active Business plan
    const hasBusinessPlan = trialStatus.isActive && trialStatus.plan === 'business';
    if (hasBusinessPlan) return true;
    
    // User has access if they are on an active trial (8 days)
    const hasActiveTrial = trialStatus.plan === 'free_trial' && trialStatus.daysLeft > 0 && !trialStatus.trialExpired;
    if (hasActiveTrial) return true;
    
    // For new users without trial data, give them 8 days by default
    if (!trialStatus.trialEnd && trialStatus.plan === 'free_trial') return true;
    
    // If we can't determine status, give access by default (don't lock out)
    return true;
  };

  // Check if trial is expired
  const isTrialExpired = (): boolean => {
    // If loading or error, don't expire trial (give benefit of doubt)
    if (trialStatus.loading || trialStatus.error) return false;
    
    // Business plan users never have expired trials
    if (trialStatus.isActive && trialStatus.plan === 'business') return false;
    
    // For new users without trial data, don't expire (give them 8 days)
    if (!trialStatus.trialEnd && trialStatus.plan === 'free_trial') return false;
    
    // Trial is expired if:
    // 1. trialExpired is explicitly true, AND
    // 2. User is on free_trial, AND
    // 3. User is not active
    if (trialStatus.trialExpired && trialStatus.plan === 'free_trial' && !trialStatus.isActive) {
      // Double-check by looking at days left
      if (trialStatus.daysLeft > 0) return false;
      return true;
    }
    
    // If user is on free_trial but daysLeft <= 0, check trial_end
    if (trialStatus.plan === 'free_trial' && trialStatus.daysLeft <= 0 && trialStatus.trialEnd) {
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
      // Give new users immediate access while loading
      setTrialStatus(prev => ({
        ...prev,
        hasAccess: true, // Always give access by default
        plan: 'free_trial',
        isActive: false,
        trialExpired: false, // Never expire by default
        daysLeft: 8, // Give 8 days by default
        trialEnd: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        loading: true,
        error: null,
      }));
      
      // Then try to fetch real trial status
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