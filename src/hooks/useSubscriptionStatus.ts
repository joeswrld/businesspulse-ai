import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface SubscriptionStatus {
  isLoading: boolean;
  hasAccess: boolean;
  status: 'trial' | 'active' | 'expired' | 'failed' | 'unknown';
  trialEndsAt: Date | null;
  daysRemaining: number | null;
  isTrialActive: boolean;
  isPaidActive: boolean;
}

export const useSubscriptionStatus = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isLoading: true,
    hasAccess: false,
    status: 'unknown',
    trialEndsAt: null,
    daysRemaining: null,
    isTrialActive: false,
    isPaidActive: false,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        // Fetch user subscription data from Supabase
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('trial_start_date, trial_end_date, subscription_status, plan_type')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const now = new Date();
        const trialEnd = profile.trial_end_date ? new Date(profile.trial_end_date) : null;
        
        // Calculate days remaining
        let daysRemaining = null;
        if (trialEnd) {
          const diff = trialEnd.getTime() - now.getTime();
          daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }

        // Check trial status
        const isTrialActive = trialEnd && now < trialEnd && 
          (profile.subscription_status === 'trial' || !profile.subscription_status);

        // Check paid subscription status
        const isPaidActive = profile.subscription_status === 'active';

        // Determine overall access
        const hasAccess = isTrialActive || isPaidActive;

        // Determine status
        let status: SubscriptionStatus['status'] = 'unknown';
        if (isPaidActive) {
          status = 'active';
        } else if (isTrialActive) {
          status = 'trial';
        } else if (profile.subscription_status === 'expired') {
          status = 'expired';
        } else if (profile.subscription_status === 'failed') {
          status = 'failed';
        }

        setSubscriptionStatus({
          isLoading: false,
          hasAccess,
          status,
          trialEndsAt: trialEnd,
          daysRemaining,
          isTrialActive,
          isPaidActive,
        });

      } catch (error) {
        console.error('Error checking subscription:', error);
        setSubscriptionStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkSubscription();

    // Set up real-time subscription to profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          checkSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  return subscriptionStatus;
};

// Helper hook for protected routes
export const useProtectedRoute = () => {
  const subscriptionStatus = useSubscriptionStatus();
  const navigate = useNavigate();

  useEffect(() => {
    if (!subscriptionStatus.isLoading && !subscriptionStatus.hasAccess) {
      navigate('/billing');
    }
  }, [subscriptionStatus.isLoading, subscriptionStatus.hasAccess, navigate]);

  return subscriptionStatus;
};
