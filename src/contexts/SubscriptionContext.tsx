import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SubscriptionStatus {
  hasAccess: boolean;
  plan: 'trial' | 'business' | 'expired';
  status: 'active' | 'expired' | 'trial' | 'cancelled' | 'failed';
  trialEndsAt: string | null;
  nextBillingDate: string | null;
  daysLeft: number;
  isLoading: boolean;
  error: string | null;
}

interface SubscriptionContextType extends SubscriptionStatus {
  refresh: () => Promise<void>;
  checkAccess: (path?: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasAccess: false,
    plan: 'trial',
    status: 'trial',
    trialEndsAt: null,
    nextBillingDate: null,
    daysLeft: 0,
    isLoading: true,
    error: null,
  });

  const loadSubscriptionStatus = async () => {
    if (!user) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      // Call RPC function to get profile with access calculation
      const { data, error } = await supabase
        .rpc('get_user_profile_with_access', { user_uuid: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        const profile = data[0];
        
        setStatus({
          hasAccess: profile.has_access,
          plan: profile.plan === 'business' ? 'business' : 
                profile.has_access ? 'trial' : 'expired',
          status: profile.subscription_status,
          trialEndsAt: profile.trial_ends_at,
          nextBillingDate: profile.next_billing_date,
          daysLeft: profile.days_left || 0,
          isLoading: false,
          error: null,
        });
      } else {
        // No profile found - this should not happen with trigger
        setStatus({
          hasAccess: false,
          plan: 'expired',
          status: 'expired',
          trialEndsAt: null,
          nextBillingDate: null,
          daysLeft: 0,
          isLoading: false,
          error: 'No billing profile found',
        });
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      
      toast({
        title: 'Subscription Check Failed',
        description: 'Unable to verify subscription status',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadSubscriptionStatus();

    // Refresh every 5 minutes
    const interval = setInterval(loadSubscriptionStatus, 5 * 60 * 1000);

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('billing-profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'billing_profiles',
          filter: user ? `id=eq.${user.id}` : undefined,
        },
        (payload) => {
          console.log('Billing profile updated:', payload);
          loadSubscriptionStatus();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [user]);

  const checkAccess = (path?: string) => {
    // Always allow access to these paths
    const publicPaths = ['/billing', '/account', '/trial-expired', '/subscription-expired'];
    
    if (path && publicPaths.some(p => path.startsWith(p))) {
      return true;
    }
    
    return status.hasAccess;
  };

  return (
    <SubscriptionContext.Provider
      value={{
        ...status,
        refresh: loadSubscriptionStatus,
        checkAccess,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};