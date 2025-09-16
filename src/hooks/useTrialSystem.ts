import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TrialStatus {
  planType: 'trial' | 'business';
  trialStart: string | null;
  trialEnd: string | null;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysRemaining: number;
  loading: boolean;
  error: string | null;
}

export const useTrialSystem = () => {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    planType: 'trial',
    trialStart: null,
    trialEnd: null,
    isTrialActive: false,
    isTrialExpired: false,
    daysRemaining: 0,
    loading: true,
    error: null,
  });

  const fetchTrialStatus = async () => {
    if (!user) {
      setTrialStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setTrialStatus(prev => ({ ...prev, loading: true, error: null }));

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('plan_type, trial_start, trial_end')
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      const planType = profile?.plan_type || 'trial';
      const trialStart = profile?.trial_start;
      const trialEnd = profile?.trial_end;

      const now = new Date();
      const trialEndDate = trialEnd ? new Date(trialEnd) : null;
      
      const isTrialActive = planType === 'trial' && trialEndDate && now < trialEndDate;
      const isTrialExpired = planType === 'trial' && trialEndDate && now >= trialEndDate;
      
      const daysRemaining = trialEndDate 
        ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      setTrialStatus({
        planType,
        trialStart,
        trialEnd,
        isTrialActive,
        isTrialExpired,
        daysRemaining,
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error fetching trial status:', error);
      setTrialStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trial status',
      }));
    }
  };

  const checkTrialAccess = () => {
    if (trialStatus.planType === 'business') {
      return true; // Business users have full access
    }
    
    if (trialStatus.planType === 'trial' && trialStatus.isTrialActive) {
      return true; // Active trial users have access
    }
    
    return false; // Expired trial users don't have access
  };

  const redirectToBilling = () => {
    window.location.href = '/billing';
  };

  useEffect(() => {
    fetchTrialStatus();
  }, [user]);

  return {
    ...trialStatus,
    fetchTrialStatus,
    checkTrialAccess,
    redirectToBilling,
  };
};