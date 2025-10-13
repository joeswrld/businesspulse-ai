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

      // Use RPC function for consistent access logic
      const { data, error } = await supabase
        .rpc('get_user_profile_with_access', { user_uuid: user.id });

      if (error) {
        console.error('❌ RPC error:', error);
        throw error;
      }

      console.log('📊 Subscription data:', data);

      if (!data || data.length === 0) {
        console.warn('⚠️ No billing profile found - creating trial');
        
        // Create trial profile
        const trialEndDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
        await supabase.from('billing_profiles').insert({
          id: user.id,
          plan: 'trial',
          subscription_status: 'trial',
          trial_ends_at: trialEndDate.toISOString(),
          created_at: new Date().toISOString(),
        });

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

      const profile = data[0];
      
      // CRITICAL: Determine access based on backend calculation
      const hasAccess = profile.has_access === true;
      const daysLeft = profile.days_left || 0;
      
      // Determine plan and status
      let plan: 'trial' | 'business' | 'expired' = 'expired';
      let status: 'trial' | 'active' | 'expired' | 'cancelled' = 'expired';
      let isTrialExpired = false;
      let isSubscriptionExpired = false;

      if (profile.plan === 'business' && profile.subscription_status === 'active') {
        plan = 'business';
        status = 'active';
      } else if (profile.plan === 'trial') {
        if (hasAccess) {
          plan = 'trial';
          status = 'trial';
        } else {
          plan = 'expired';
          status = 'expired';
          isTrialExpired = true;
        }
      } else if (profile.subscription_status === 'cancelled' || profile.subscription_status === 'expired') {
        plan = 'expired';
        status = profile.subscription_status;
        isSubscriptionExpired = true;
      }

      console.log('✅ Access decision:', {
        hasAccess,
        plan,
        status,
        daysLeft,
        subscriptionStatus: profile.subscription_status
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

      // Redirect if no access and redirect option is enabled
      if (!hasAccess && options?.redirectOnExpiry && !options?.allowBillingPage) {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/billing') && !currentPath.startsWith('/trial-expired')) {
          console.log('🚫 No access - redirecting to trial-expired');
          if (isTrialExpired) {
            navigate('/trial-expired');
          } else if (isSubscriptionExpired) {
            navigate('/subscription-expired');
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

    // Refresh every minute to catch payment updates
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
            
            // Show success toast if user just upgraded
            const newData = payload.new as any;
            if (newData.subscription_status === 'active' && newData.plan === 'business') {
              toast.success('🎉 Subscription activated!', {
                description: 'You now have full access to all features',
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