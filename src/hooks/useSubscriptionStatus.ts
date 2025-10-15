// src/hooks/useSubscriptionStatus.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SubscriptionStatusHook {
  hasAccess: boolean;
  isLoading: boolean;
  isTrialExpired: boolean;
  isSubscriptionExpired: boolean;
  daysLeft: number;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  plan: 'trial' | 'business' | 'expired';
  refresh: () => Promise<void>;
}

export function useSubscriptionStatus(options?: {
  redirectOnExpiry?: boolean;
  allowBillingPage?: boolean;
}): SubscriptionStatusHook {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState({
    hasAccess: false,
    isLoading: true,
    isTrialExpired: false,
    isSubscriptionExpired: false,
    daysLeft: 0,
    status: 'trial' as 'trial' | 'active' | 'expired' | 'cancelled',
    plan: 'trial' as 'trial' | 'business' | 'expired',
  });

  const checkSubscriptionStatus = async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false, hasAccess: false }));
      return;
    }

    try {
      console.log('🔍 Checking subscription for user:', user.id);

      // Corrected query: user_id instead of id
      const { data: profile, error } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.warn('⚠️ Billing profile not found, creating trial...', error);

        try {
          const trialEndDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

          await supabase.from('billing_profiles').insert({
            user_id: user.id,
            plan: 'trial',
            subscription_status: 'trial',
            trial_ends_at: trialEndDate.toISOString(),
            created_at: new Date().toISOString(),
          });

          // Return trial access immediately
          setState({
            hasAccess: true,
            isLoading: false,
            isTrialExpired: false,
            isSubscriptionExpired: false,
            daysLeft: 8,
            status: 'trial',
            plan: 'trial',
          });
          return;
        } catch (insertError) {
          console.error('❌ Failed to create trial profile', insertError);
          // fallback: deny access but don’t crash
          setState(prev => ({ ...prev, isLoading: false, hasAccess: false }));
          toast.error('Failed to initialize trial. Please refresh.');
          return;
        }
      }

      console.log('📊 Profile data:', profile);

      const now = new Date();
      const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;

      let hasAccess = false;
      let isTrialExpired = false;
      let isSubscriptionExpired = false;
      let plan: 'trial' | 'business' | 'expired' = 'expired';
      let status: 'trial' | 'active' | 'expired' | 'cancelled' = 'expired';

      if (profile.plan === 'business' && profile.subscription_status === 'active') {
        hasAccess = true;
        plan = 'business';
        status = 'active';
      } else if (profile.plan === 'trial') {
        if (trialEnd && now <= trialEnd) {
          hasAccess = true;
          plan = 'trial';
          status = 'trial';
        } else {
          hasAccess = false;
          plan = 'expired';
          status = 'expired';
          isTrialExpired = true;
        }
      } else if (profile.subscription_status === 'cancelled' || profile.subscription_status === 'expired') {
        hasAccess = false;
        plan = 'expired';
        status = profile.subscription_status;
        isSubscriptionExpired = true;
      }

      let daysLeft = 0;
      if (plan === 'trial' && trialEnd) {
        daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (plan === 'business' && profile.next_billing_date) {
        const nextBilling = new Date(profile.next_billing_date);
        daysLeft = Math.max(0, Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      console.log('✅ Access decision:', { hasAccess, plan, status, daysLeft });

      setState({
        hasAccess,
        isLoading: false,
        isTrialExpired,
        isSubscriptionExpired,
        daysLeft,
        status,
        plan,
      });

      // Redirect if expired
      if (!hasAccess && options?.redirectOnExpiry && !options?.allowBillingPage) {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/billing') &&
            !currentPath.startsWith('/trial-expired') &&
            !currentPath.startsWith('/subscription-expired')) {
          if (isTrialExpired) {
            navigate('/trial-expired', { replace: true });
          } else if (isSubscriptionExpired) {
            navigate('/subscription-expired', { replace: true });
          }
        }
      }

    } catch (err) {
      console.error('❌ Error checking subscription:', err);
      setState(prev => ({ ...prev, isLoading: false, hasAccess: false }));
      toast.error('Failed to verify subscription', { description: 'Please refresh the page' });
    }
  };

  useEffect(() => {
    checkSubscriptionStatus();

    const interval = setInterval(checkSubscriptionStatus, 60 * 1000);

    if (user) {
      const channel = supabase
        .channel(`billing-profile-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'billing_profiles',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          console.log('🔔 Billing profile updated:', payload);
          checkSubscriptionStatus();

          const newData = payload.new as any;
          if (newData.subscription_status === 'active' && newData.plan === 'business') {
            toast.success('🎉 Subscription activated!', {
              description: 'You now have full access',
              duration: 5000,
            });
          }
        })
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }

    return () => clearInterval(interval);
  }, [user]);

  return { ...state, refresh: checkSubscriptionStatus };
}
