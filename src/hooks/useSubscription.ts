import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionStatus {
  plan: 'trial' | 'business';
  isActive: boolean;
  isTrialExpired: boolean;
  daysLeft: number;
  subscriptionId: string | null;
  nextBillingDate: string | null;
  loading: boolean;
  error: string | null;
}

export interface SubscriptionActions {
  upgradeToBusiness: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useSubscription(): SubscriptionStatus & SubscriptionActions {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    plan: 'trial',
    isActive: false,
    isTrialExpired: false,
    daysLeft: 0,
    subscriptionId: null,
    nextBillingDate: null,
    loading: true,
    error: null,
  });

  // Fetch subscription status from database
  const fetchSubscriptionStatus = useCallback(async (): Promise<SubscriptionStatus> => {
    if (!user) {
      return {
        plan: 'trial',
        isActive: false,
        isTrialExpired: true,
        daysLeft: 0,
        subscriptionId: null,
        nextBillingDate: null,
        loading: false,
        error: 'No user logged in',
      };
    }

    try {
      // Get billing profile
      const { data: billingProfile, error: billingError } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (billingError && billingError.code !== 'PGRST116') {
        console.warn('Billing profile not found, creating default trial');
        // Create default trial profile
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

        if (createError) {
          console.error('Failed to create billing profile:', createError);
        }

        return {
          plan: 'trial',
          isActive: true,
          isTrialExpired: false,
          daysLeft: 8,
          subscriptionId: null,
          nextBillingDate: null,
          loading: false,
          error: null,
        };
      }

      const profile = billingProfile;
      const now = new Date();
      const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
      const isTrialExpired = profile.plan === 'trial' && trialEnd && now > trialEnd;
      const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

      return {
        plan: profile.plan || 'trial',
        isActive: profile.subscription_status === 'active' || (profile.plan === 'trial' && !isTrialExpired),
        isTrialExpired,
        daysLeft,
        subscriptionId: profile.paystack_subscription_id,
        nextBillingDate: profile.next_billing_date,
        loading: false,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      return {
        plan: 'trial',
        isActive: false,
        isTrialExpired: true,
        daysLeft: 0,
        subscriptionId: null,
        nextBillingDate: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch subscription status',
      };
    }
  }, [user]);

  // Upgrade to Business plan
  const upgradeToBusiness = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // This will be handled by the PaystackPayment component
      // The actual upgrade logic is in the payment success callback
      console.log('Upgrade to Business initiated');
    } catch (error) {
      console.error('Error upgrading to Business:', error);
      throw error;
    }
  }, [user]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Get current subscription status
      const currentStatus = await fetchSubscriptionStatus();
      
      if (currentStatus.plan === 'trial') {
        throw new Error('Cannot cancel trial subscription');
      }

      if (!currentStatus.subscriptionId) {
        throw new Error('No active subscription found');
      }

      // Call the cancel subscription API
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscription_id: currentStatus.subscriptionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel subscription');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to cancel subscription');
      }

      // Update local status
      await refreshStatus();
      
      toast.success('Subscription cancelled successfully. You can continue using your plan until the end of your current billing period.');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel subscription';
      toast.error(errorMessage);
      throw error;
    }
  }, [user, fetchSubscriptionStatus]);

  // Refresh subscription status
  const refreshStatus = useCallback(async (): Promise<void> => {
    setStatus(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const newStatus = await fetchSubscriptionStatus();
      setStatus(newStatus);
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh subscription status',
      }));
    }
  }, [fetchSubscriptionStatus]);

  // Load status on mount and when user changes
  useEffect(() => {
    if (user) {
      refreshStatus();
    } else {
      setStatus({
        plan: 'trial',
        isActive: false,
        isTrialExpired: true,
        daysLeft: 0,
        subscriptionId: null,
        nextBillingDate: null,
        loading: false,
        error: null,
      });
    }
  }, [user, refreshStatus]);

  // Set up real-time subscription for status updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('subscription-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing_profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          console.log('Billing profile updated, refreshing status');
          refreshStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshStatus]);

  return {
    ...status,
    upgradeToBusiness,
    cancelSubscription,
    refreshStatus,
  };
}