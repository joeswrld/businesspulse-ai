import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface BillingProfile {
  id: string;
  plan: 'trial' | 'free' | 'pro' | 'business';
  trial_ends_at: string | null;
  next_billing_date: string | null;
  subscription_status: string | null;
  paystack_customer_id: string | null;
  paystack_subscription_id: string | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  description: string | null;
  paystack_reference: string | null;
  created_at: string;
}

export interface UsageLimits {
  feedback: number;
  analytics: number;
  reports: number;
  insights: number;
  teams: number;
}

export interface UsageData {
  id: string;
  user_id: string;
  feedback_count: number;
  analytics_count: number;
  reports_count: number;
  insights_count: number;
  teams_count: number;
  created_at: string;
  updated_at: string;
}

export interface BillingSystemState {
  // Data
  billingProfile: BillingProfile | null;
  transactions: Transaction[];
  usageData: UsageData | null;
  
  // State
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  
  // Computed values
  currentPlan: 'trial' | 'free' | 'pro' | 'business';
  trialDaysLeft: number;
  isTrialExpired: boolean;
  isSubscriptionActive: boolean;
  isPaymentPastDue: boolean;
  nextBillingDate: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updatePaymentMethod: () => Promise<void>;
  upgradePlan: (plan: 'pro' | 'business') => Promise<void>;
}

// Plan limits configuration
const PLAN_LIMITS: Record<string, UsageLimits> = {
  trial: {
    feedback: 50,
    analytics: 5,
    reports: 2,
    insights: 5,
    teams: 1
  },
  free: {
    feedback: 10,
    analytics: 2,
    reports: 1,
    insights: 2,
    teams: 1
  },
  pro: {
    feedback: 300,
    analytics: 100,
    reports: 20,
    insights: 50,
    teams: 5
  },
  business: {
    feedback: -1, // unlimited
    analytics: -1,
    reports: -1,
    insights: -1,
    teams: -1
  }
};

export function useBillingSystem(): BillingSystemState {
  const { user } = useAuth();
  
  // State
  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load billing data
  const loadBillingData = useCallback(async (isRefresh = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Load billing profile
      const { data: profileData, error: profileError } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading billing profile:', profileError);
        throw new Error('Failed to load billing profile');
      }

      // Load transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Error loading transactions:', transactionsError);
        throw new Error('Failed to load transaction history');
      }

      // Load usage data
      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        console.error('Error loading usage data:', usageError);
        // Don't throw error for usage data, it might not exist yet
      }

      setBillingProfile(profileData);
      setTransactions(transactionsData || []);
      setUsageData(usageData);

    } catch (err) {
      console.error('Error loading billing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Load data on mount and when user changes
  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const billingChannel = supabase
      .channel('billing-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing_profiles',
          filter: `id=eq.${user.id}`
        },
        () => {
          console.log('Billing profile updated');
          loadBillingData(true);
        }
      )
      .subscribe();

    const transactionsChannel = supabase
      .channel('transactions-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Transactions updated');
          loadBillingData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(billingChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [user, loadBillingData]);

  // Computed values
  const currentPlan = billingProfile?.plan || 'trial';
  
  const trialDaysLeft = useCallback(() => {
    if (!billingProfile?.trial_ends_at) return 0;
    const trialEnd = new Date(billingProfile.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [billingProfile]);

  const isTrialExpired = trialDaysLeft() === 0 && currentPlan === 'trial';
  const isSubscriptionActive = billingProfile?.subscription_status === 'active';
  const isPaymentPastDue = billingProfile?.subscription_status === 'past_due';
  const nextBillingDate = billingProfile?.next_billing_date;

  // Actions
  const refreshData = useCallback(async () => {
    await loadBillingData(true);
  }, [loadBillingData]);

  const cancelSubscription = useCallback(async () => {
    if (!billingProfile?.paystack_subscription_id) {
      toast.error('No active subscription to cancel');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          subscriptionId: billingProfile.paystack_subscription_id 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      toast.success('Subscription cancelled successfully');
      await refreshData();
      
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    }
  }, [billingProfile, refreshData]);

  const updatePaymentMethod = useCallback(async () => {
    if (!billingProfile?.paystack_customer_id) {
      toast.error('No payment method to update');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/paystack/update-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          customerId: billingProfile.paystack_customer_id 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate update link');
      }

      if (result.url) {
        window.open(result.url, '_blank');
        toast.success('Payment method update page opened');
      } else {
        throw new Error('No update URL received');
      }
      
    } catch (err) {
      console.error('Error updating payment method:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update payment method');
    }
  }, [billingProfile]);

  const upgradePlan = useCallback(async (plan: 'pro' | 'business') => {
    // This will be handled by the PaystackPayment component
    // Just return a promise that resolves immediately
    return Promise.resolve();
  }, []);

  return {
    // Data
    billingProfile,
    transactions,
    usageData,
    
    // State
    loading,
    error,
    refreshing,
    
    // Computed values
    currentPlan,
    trialDaysLeft: trialDaysLeft(),
    isTrialExpired,
    isSubscriptionActive,
    isPaymentPastDue,
    nextBillingDate,
    
    // Actions
    refreshData,
    cancelSubscription,
    updatePaymentMethod,
    upgradePlan
  };
}

// Utility functions
export function getPlanLimits(plan: string): UsageLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100); // Convert from kobo to naira
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getPlanDisplayName(plan: string): string {
  const planNames: Record<string, string> = {
    trial: 'Free Trial',
    free: 'Free Plan',
    pro: 'Pro Plan',
    business: 'Business Plan'
  };
  return planNames[plan] || 'Unknown Plan';
}

export function getPlanPrice(plan: string): string {
  const planPrices: Record<string, string> = {
    trial: 'Free',
    free: 'Free',
    pro: '₦35,000/mo',
    business: '₦53,000/mo'
  };
  return planPrices[plan] || 'Contact Sales';
}