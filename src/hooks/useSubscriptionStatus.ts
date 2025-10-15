// src/hooks/useSubscriptionStatus.ts
// FALLBACK VERSION - Works without RPC function

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

      // DIRECT QUERY - No RPC function needed
      const { data: profile, error } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Query error:', error);
        
        // If profile doesn't exist, create trial
        if (error.code === 'PGRST116') {
          console.log('⚠️ No profile found, creating trial...');
          const trialEndDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
          
          const { error: createError } = await supabase
            .from('billing_profiles')
            .insert({
              id: user.id,
              plan: 'trial',
              subscription_status: 'trial',
              trial_ends_at: trialEndDate.toISOString(),
              created_at: new Date().toISOString(),
            });

          if (!createError) {
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
          }
        }
        
        throw error;
      }

      console.log('📊 Profile data:', profile);

      // Calculate access locally
      const now = new Date();
      const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
      
      // Determine if user has access
      let hasAccess = false;
      let isTrialExpired = false;
      let isSubscriptionExpired = false;
      let plan: 'trial' | 'business' | 'expired' = 'expired';
      let status: 'trial' | 'active' | 'expired' | 'cancelled' = 'expired';
      
      // CRITICAL ACCESS LOGIC
      if (profile.plan === 'business' && profile.subscription_status === 'active') {
        // Business plan with active subscription = ACCESS GRANTED
        hasAccess = true;
        plan = 'business';
        status = 'active';
      } else if (profile.plan === 'trial') {
        // Trial plan
        if (trialEnd && now <= trialEnd) {
          // Trial still valid = ACCESS GRANTED
          hasAccess = true;
          plan = 'trial';
          status = 'trial';
        } else {
          // Trial expired = NO ACCESS
          hasAccess = false;
          plan = 'expired';
          status = 'expired';
          isTrialExpired = true;
        }
      } else if (profile.subscription_status === 'cancelled' || profile.subscription_status === 'expired') {
        // Cancelled or expired subscription = NO ACCESS
        hasAccess = false;
        plan = 'expired';
        status = profile.subscription_status;
        isSubscriptionExpired = true;
      }

      // Calculate days left
      let daysLeft = 0;
      if (profile.plan === 'trial' && trialEnd) {
        daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (profile.plan === 'business' && profile.next_billing_date) {
        const nextBilling = new Date(profile.next_billing_date);
        daysLeft = Math.max(0, Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      console.log('✅ Access decision:', {
        hasAccess,
        plan,
        status,
        daysLeft,
        subscriptionStatus: profile.subscription_status,
        trialEndsAt: profile.trial_ends_at
      });

      setState({
        hasAccess,
        isLoading: false,
        isTrialExpired,
        isSubscriptionExpired,
        daysLeft,
        status,
        plan,
      });

      // Redirect if no access
      if (!hasAccess && options?.redirectOnExpiry && !options?.allowBillingPage) {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/billing') && 
            !currentPath.startsWith('/trial-expired') && 
            !currentPath.startsWith('/subscription-expired')) {
          console.log('🚫 No access - redirecting...');
          
          if (isTrialExpired) {
            navigate('/trial-expired', { replace: true });
          } else if (isSubscriptionExpired) {
            navigate('/subscription-expired', { replace: true });
          }
        }
      }

    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        hasAccess: false 
      }));
      
      toast.error('Failed to verify subscription', {
        description: 'Please refresh the page'
      });
    }
  };

  useEffect(() => {
    checkSubscriptionStatus();

    // Refresh every minute
    const interval = setInterval(checkSubscriptionStatus, 60 * 1000);

    // Subscribe to realtime changes
    if (user) {
      const channel = supabase
        .channel(`billing-profile-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'billing_profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔔 Billing profile updated:', payload);
            checkSubscriptionStatus();
            
            const newData = payload.new as any;
            if (newData.subscription_status === 'active' && newData.plan === 'business') {
              toast.success('🎉 Subscription activated!', {
                description: 'You now have full access',
                duration: 5000,
              });
            }
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }

    return () => clearInterval(interval);
  }, [user]);

  return {
    ...state,
    refresh: checkSubscriptionStatus,
  };
}

// USAGE: This hook works exactly the same as before
// Just replace the import in all your pages:
// import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';