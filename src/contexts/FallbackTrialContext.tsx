import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Fallback trial system that works without database
// This ensures new users always get a trial

export interface FallbackTrialStatus {
  hasAccess: boolean;
  plan: 'free_trial' | 'business';
  isActive: boolean;
  trialExpired: boolean;
  daysLeft: number;
  trialEnd: string | null;
  loading: boolean;
  error: string | null;
}

export interface FallbackTrialContextType {
  trialStatus: FallbackTrialStatus;
  refreshTrialStatus: () => Promise<void>;
  upgradeToBusiness: () => Promise<void>;
  checkAccess: () => boolean;
  getTrialMessage: () => string;
  isTrialExpired: () => boolean;
  getDaysLeft: () => number;
}

const FallbackTrialContext = createContext<FallbackTrialContextType | undefined>(undefined);

export const FallbackTrialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<FallbackTrialStatus>({
    hasAccess: false,
    plan: 'free_trial',
    isActive: false,
    trialExpired: false,
    daysLeft: 0,
    trialEnd: null,
    loading: true,
    error: null,
  });

  // Create a trial for new users using localStorage
  const createFallbackTrial = (userId: string): FallbackTrialStatus => {
    const trialKey = `trial_${userId}`;
    const existingTrial = localStorage.getItem(trialKey);
    
    if (existingTrial) {
      const trial = JSON.parse(existingTrial);
      const now = new Date();
      const trialEnd = new Date(trial.trialEnd);
      
      return {
        hasAccess: trialEnd > now,
        plan: 'free_trial',
        isActive: false,
        trialExpired: trialEnd <= now,
        daysLeft: Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
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

  const refreshTrialStatus = async (): Promise<void> => {
    if (!user) return;
    
    setTrialStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const newStatus = createFallbackTrial(user.id);
      setTrialStatus(newStatus);
    } catch (error) {
      setTrialStatus(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load trial status',
      }));
    }
  };

  const upgradeToBusiness = async (): Promise<void> => {
    if (!user) return;
    
    const trialKey = `trial_${user.id}`;
    const businessKey = `business_${user.id}`;
    
    // Mark as business user
    localStorage.setItem(businessKey, JSON.stringify({
      isActive: true,
      upgraded: new Date().toISOString(),
    }));
    
    setTrialStatus(prev => ({
      ...prev,
      hasAccess: true,
      plan: 'business',
      isActive: true,
      trialExpired: false,
      loading: false,
      error: null,
    }));
  };

  const checkAccess = (): boolean => {
    if (trialStatus.loading) return true; // Give access while loading
    return trialStatus.hasAccess;
  };

  const isTrialExpired = (): boolean => {
    if (trialStatus.loading) return false; // Don't expire while loading
    return trialStatus.trialExpired;
  };

  const getDaysLeft = (): number => {
    return Math.max(0, trialStatus.daysLeft);
  };

  const getTrialMessage = (): string => {
    if (trialStatus.loading) return 'Loading...';
    if (trialStatus.isActive) return 'You have an active Business subscription';
    if (isTrialExpired()) return 'Your free trial has expired. Upgrade to Business to continue.';
    if (trialStatus.plan === 'free_trial') return `Your free trial ends in ${getDaysLeft()} days`;
    return 'Unknown trial status';
  };

  // Load trial status when user changes
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

  const contextValue: FallbackTrialContextType = {
    trialStatus,
    refreshTrialStatus,
    upgradeToBusiness,
    checkAccess,
    getTrialMessage,
    isTrialExpired,
    getDaysLeft,
  };

  return (
    <FallbackTrialContext.Provider value={contextValue}>
      {children}
    </FallbackTrialContext.Provider>
  );
};

export const useFallbackTrial = (): FallbackTrialContextType => {
  const context = useContext(FallbackTrialContext);
  if (context === undefined) {
    throw new Error('useFallbackTrial must be used within a FallbackTrialProvider');
  }
  return context;
};

export default FallbackTrialProvider;