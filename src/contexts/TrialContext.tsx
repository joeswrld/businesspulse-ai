// src/contexts/TrialContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TrialStatus {
  isInTrial: boolean;
  isTrialExpired: boolean;
  daysLeft: number;
  hasActiveSubscription: boolean;
  canAccessFeature: boolean;
  subscriptionPlan: string;
  trialEndsAt: string | null;
  loading: boolean;
}

interface TrialContextType {
  trialStatus: TrialStatus;
  checkFeatureAccess: (feature: string) => boolean;
  refreshTrialStatus: () => Promise<void>;
}

const defaultTrialStatus: TrialStatus = {
  isInTrial: false,
  isTrialExpired: false,
  daysLeft: 0,
  hasActiveSubscription: false,
  canAccessFeature: false,
  subscriptionPlan: 'trial',
  trialEndsAt: null,
  loading: true
};

const TrialContext = createContext<TrialContextType | undefined>(undefined);

export const useTrialAccess = () => {
  const context = useContext(TrialContext);
  if (!context) {
    throw new Error('useTrialAccess must be used within TrialProvider');
  }
  return context;
};

interface TrialProviderProps {
  children: ReactNode;
}

export const TrialProvider: React.FC<TrialProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<TrialStatus>(defaultTrialStatus);

  const calculateTrialStatus = (billingProfile: any): TrialStatus => {
    const now = new Date();
    const trialEnd = billingProfile.trial_ends_at ? new Date(billingProfile.trial_ends_at) : null;
    
    const isInTrial = billingProfile.plan === 'trial';
    const isTrialExpired = isInTrial && trialEnd ? now > trialEnd : false;
    const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
    const hasActiveSubscription = billingProfile.subscription_status === 'active' && billingProfile.plan === 'business';
    
    return {
      isInTrial,
      isTrialExpired,
      daysLeft,
      hasActiveSubscription,
      canAccessFeature: hasActiveSubscription || (isInTrial && !isTrialExpired),
      subscriptionPlan: billingProfile.plan || 'trial',
      trialEndsAt: billingProfile.trial_ends_at,
      loading: false
    };
  };

  const fetchTrialStatus = async () => {
    if (!user) {
      setTrialStatus({ ...defaultTrialStatus, loading: false });
      return;
    }

    try {
      // Get billing profile
      const { data: billingProfile, error: billingError } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (billingError && billingError.code === 'PGRST116') {
        // No billing profile exists, create default trial
        const trialEndDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
        const { error: createError } = await supabase
          .from('billing_profiles')
          .insert({
            id: user.id,
            plan: 'trial',
            trial_ends_at: trialEndDate.toISOString(),
            next_billing_date: null,
            subscription_status: 'trial',
            paystack_customer_id: null,
            paystack_subscription_id: null,
            created_at: new Date().toISOString(),
          });

        if (!createError) {
          setTrialStatus({
            isInTrial: true,
            isTrialExpired: false,
            daysLeft: 8,
            hasActiveSubscription: false,
            canAccessFeature: true,
            subscriptionPlan: 'trial',
            trialEndsAt: trialEndDate.toISOString(),
            loading: false
          });
        } else {
          console.error('Error creating trial profile:', createError);
          setTrialStatus({ ...defaultTrialStatus, loading: false });
        }
      } else if (billingProfile) {
        const status = calculateTrialStatus(billingProfile);
        setTrialStatus(status);
      } else {
        setTrialStatus({ ...defaultTrialStatus, loading: false });
      }
    } catch (error) {
      console.error('Error fetching trial status:', error);
      setTrialStatus({ ...defaultTrialStatus, loading: false });
    }
  };

  useEffect(() => {
    fetchTrialStatus();
  }, [user]);

  const checkFeatureAccess = (feature: string): boolean => {
    // List of features that require active subscription or valid trial
    const protectedFeatures = [
      'feedback',
      'feedback-settings',
      'widget',
      'csat-form',
      'product-feedback',
      'insights'
    ];

    if (!protectedFeatures.includes(feature)) {
      return true;
    }

    return trialStatus.canAccessFeature;
  };

  const refreshTrialStatus = async () => {
    setTrialStatus(prev => ({ ...prev, loading: true }));
    await fetchTrialStatus();
  };

  return (
    <TrialContext.Provider value={{ trialStatus, checkFeatureAccess, refreshTrialStatus }}>
      {children}
    </TrialContext.Provider>
  );
};
