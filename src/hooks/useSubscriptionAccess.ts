
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSubscriptionAccess() {
  const { user } = useAuth();
  const [status, setStatus] = useState({
    hasAccess: false,
    plan: 'trial',
    status: 'trial',
    daysLeft: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (!user) return;

    const checkAccess = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_user_profile_with_access', { user_uuid: user.id });

        if (error) throw error;

        if (data && data.length > 0) {
          const profile = data[0];
          setStatus({
            hasAccess: profile.has_access,
            plan: profile.plan,
            status: profile.subscription_status,
            daysLeft: profile.days_left,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Access check error:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAccess();

    // Realtime subscription for status changes
    const subscription = supabase
      .channel('billing-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'billing_profiles',
          filter: `id=eq.${user.id}`,
        },
        () => checkAccess()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return status;
}