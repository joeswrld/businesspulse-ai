import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserStatus {
  plan: "free_trial" | "business";
  trial_start: string;
  trial_end: string;
  is_active: boolean;
  subscription_status: string;
  paystack_customer_id: string | null;
  next_billing_date: string | null;
  trial_days_remaining: number;
  is_trial_expired: boolean;
  should_show_lock: boolean;
}

export async function fetchUserStatus(userId: string): Promise<UserStatus> {
  console.log('🚀 Calling get_user_status RPC for user:', userId);
  
  const { data, error } = await supabase.rpc('get_user_status', { 
    user_uuid: userId 
  });
  
  console.log('📡 RPC Response:', { data, error });
  
  if (error) {
    console.error('❌ Error fetching user status:', error);
    throw new Error(error.message);
  }
  
  console.log('✅ User status fetched successfully:', data);
  return data as UserStatus;
}

export function useUserStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!user) {
      setStatus(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching user status for:', user.id);
      const userStatus = await fetchUserStatus(user.id);
      console.log('📊 User status received:', userStatus);
      setStatus(userStatus);
    } catch (err) {
      console.error('Error refreshing user status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
  // Fallback status for new users
      console.log('⚠️ Error fetching user status, using fallback');
      const fallbackStatus: UserStatus = {
        plan: 'free_trial',
        trial_start: new Date().toISOString(),
        trial_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        subscription_status: 'trial',
        paystack_customer_id: null,
        next_billing_date: null,
        trial_days_remaining: 8,
        is_trial_expired: false,
        should_show_lock: false
      };
      setStatus(fallbackStatus);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Check if user should be locked out
  const shouldShowLockScreen = useCallback(() => {
    if (!status) {
      console.log('🔒 No status available, not locking');
      return false;
    }
    
    console.log('🔍 Checking lock status:', {
      plan: status.plan,
      is_active: status.is_active,
      is_trial_expired: status.is_trial_expired,
      should_show_lock: status.should_show_lock,
      trial_days_remaining: status.trial_days_remaining
    });
    
    // Business users with active subscription should never be locked
    if (status.plan === 'business' && status.is_active) {
      console.log('✅ Business user with active subscription - no lock');
      return false;
    }
    
    // Free trial users should be locked if trial expired
    if (status.plan === 'free_trial' && status.is_trial_expired) {
      console.log('🔒 Free trial user with expired trial - locking');
      return true;
    }
    
    // Business users with inactive subscription should be locked
    if (status.plan === 'business' && !status.is_active) {
      console.log('🔒 Business user with inactive subscription - locking');
      return true;
    }
    
    console.log('🎯 Using server-side should_show_lock decision:', status.should_show_lock);
    return status.should_show_lock;
  }, [status]);

  // Check if user is in valid trial period
  const isInTrialPeriod = useCallback(() => {
    if (!status) return false;
    return status.plan === 'free_trial' && !status.is_trial_expired;
  }, [status]);

  // Check if user has active business subscription
  const hasActiveSubscription = useCallback(() => {
    if (!status) return false;
    return status.plan === 'business' && status.is_active;
  }, [status]);

  return {
    status,
    loading,
    error,
    refreshStatus,
    shouldShowLockScreen,
    isInTrialPeriod,
    hasActiveSubscription
  };
}