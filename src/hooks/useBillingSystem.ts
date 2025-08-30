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
  subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
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
  export: string[];
  support: string[];
  retention: string;
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
  isInGracePeriod: boolean;
  gracePeriodDaysLeft: number;
  
  // Usage tracking
  usagePercentages: Record<string, number>;
  isLimitReached: Record<string, boolean>;
  
  // Actions
  refreshData: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  updatePaymentMethod: () => Promise<void>;
  upgradePlan: (plan: 'pro' | 'business') => Promise<void>;
  reactivateSubscription: () => Promise<void>;
}

// Plan limits configuration - Real-world SaaS limits
const PLAN_LIMITS: Record<string, UsageLimits> = {
  trial: {
    feedback: 50,
    analytics: 5,
    reports: 2,
    insights: 5,
    teams: 1,
    export: ['CSV'],
    support: ['Email'],
    retention: '8 days'
  },
  free: {
    feedback: 10,
    analytics: 2,
    reports: 1,
    insights: 2,
    teams: 1,
    export: ['CSV'],
    support: ['Email'],
    retention: '30 days'
  },
  pro: {
    feedback: 300,
    analytics: 100,
    reports: 20,
    insights: 50,
    teams: 5,
    export: ['CSV', 'PDF', 'Excel'],
    support: ['Email', 'Chat'],
    retention: '12 months'
  },
  business: {
    feedback: -1, // unlimited
    analytics: -1,
    reports: -1,
    insights: -1,
    teams: -1,
    export: ['CSV', 'PDF', 'Excel', 'API'],
    support: ['Email', 'Chat', 'Phone', 'Priority'],
    retention: 'Unlimited'
  }
};

// Plan pricing
const PLAN_PRICING = {
  trial: { price: 0, currency: 'NGN', period: '8 days' },
  free: { price: 0, currency: 'NGN', period: 'month' },
  pro: { price: 35000, currency: 'NGN', period: 'month' },
  business: { price: 53000, currency: 'NGN', period: 'month' }
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
      let profileData = null;
      try {
        const { data, error: profileError } = await supabase
          .from('billing_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.warn('Billing profiles table not available, creating default profile');
          // Create default trial profile for new users
          profileData = {
            id: user.id,
            plan: 'trial',
            trial_ends_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
            next_billing_date: null,
            subscription_status: 'trial',
            paystack_customer_id: null,
            paystack_subscription_id: null,
            created_at: new Date().toISOString()
          };
        } else {
          profileData = data;
        }
      } catch (error) {
        console.warn('Creating default trial profile for new user');
        profileData = {
          id: user.id,
          plan: 'trial',
          trial_ends_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          next_billing_date: null,
          subscription_status: 'trial',
          paystack_customer_id: null,
          paystack_subscription_id: null,
          created_at: new Date().toISOString()
        };
      }

      // Load transactions
      let transactionsData = [];
      try {
        const { data, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (transactionsError) {
          console.warn('Transactions table not available, skipping transaction data');
        } else {
          transactionsData = data || [];
        }
      } catch (error) {
        console.warn('Transactions table not available, skipping transaction data');
      }

      // Load usage data
      let usageData = null;
      try {
        const { data, error: usageError } = await supabase
          .from('usage_tracking')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (usageError && usageError.code !== 'PGRST116') {
          console.warn('Usage tracking table not available, creating default usage data');
          usageData = {
            id: user.id,
            user_id: user.id,
            feedback_count: 0,
            analytics_count: 0,
            reports_count: 0,
            insights_count: 0,
            teams_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          usageData = data;
        }
      } catch (error) {
        console.warn('Creating default usage data for new user');
        usageData = {
          id: user.id,
          user_id: user.id,
          feedback_count: 0,
          analytics_count: 0,
          reports_count: 0,
          insights_count: 0,
          teams_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      setBillingProfile(profileData);
      setTransactions(transactionsData || []);
      setUsageData(usageData);

    } catch (err) {
      console.warn('Error loading billing data:', err);
      setError(null); // Don't set error for missing tables
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

    let billingChannel = null;
    let transactionsChannel = null;

    try {
      billingChannel = supabase
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
    } catch (error) {
      console.warn('Could not set up billing real-time subscription');
    }

    try {
      transactionsChannel = supabase
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
    } catch (error) {
      console.warn('Could not set up transactions real-time subscription');
    }

    return () => {
      if (billingChannel) supabase.removeChannel(billingChannel);
      if (transactionsChannel) supabase.removeChannel(transactionsChannel);
    };
  }, [user, loadBillingData]);

  // Computed values with real-world logic
  const currentPlan = billingProfile?.plan || 'trial';
  
  const trialDaysLeft = useCallback(() => {
    if (!billingProfile?.trial_ends_at) return 8;
    try {
      const trialEnd = new Date(billingProfile.trial_ends_at);
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch (error) {
      console.warn('Error calculating trial days:', error);
      return 8;
    }
  }, [billingProfile]);

  const isTrialExpired = useCallback(() => {
    try {
      return trialDaysLeft() === 0 && currentPlan === 'trial';
    } catch (error) {
      console.warn('Error checking trial expiration:', error);
      return false;
    }
  }, [trialDaysLeft, currentPlan]);

  const isSubscriptionActive = useCallback(() => {
    try {
      return billingProfile?.subscription_status === 'active';
    } catch (error) {
      console.warn('Error checking subscription status:', error);
      return false;
    }
  }, [billingProfile]);

  const isPaymentPastDue = useCallback(() => {
    try {
      return billingProfile?.subscription_status === 'past_due';
    } catch (error) {
      console.warn('Error checking payment status:', error);
      return false;
    }
  }, [billingProfile]);

  const nextBillingDate = billingProfile?.next_billing_date;

  // Grace period logic (3 days after failed payment)
  const isInGracePeriod = useCallback(() => {
    if (!isPaymentPastDue()) return false;
    if (!billingProfile?.next_billing_date) return false;
    
    try {
      const nextBilling = new Date(billingProfile.next_billing_date);
      const now = new Date();
      const gracePeriodEnd = new Date(nextBilling.getTime() + 3 * 24 * 60 * 60 * 1000);
      return now < gracePeriodEnd;
    } catch (error) {
      return false;
    }
  }, [isPaymentPastDue, billingProfile]);

  const gracePeriodDaysLeft = useCallback(() => {
    if (!isInGracePeriod()) return 0;
    if (!billingProfile?.next_billing_date) return 0;
    
    try {
      const nextBilling = new Date(billingProfile.next_billing_date);
      const now = new Date();
      const gracePeriodEnd = new Date(nextBilling.getTime() + 3 * 24 * 60 * 60 * 1000);
      const diffTime = gracePeriodEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch (error) {
      return 0;
    }
  }, [isInGracePeriod, billingProfile]);

  // Usage tracking and limits
  const usagePercentages = useCallback(() => {
    if (!usageData) return {};
    
    const currentLimits = PLAN_LIMITS[currentPlan];
    const percentages: Record<string, number> = {};
    
    Object.keys(currentLimits).forEach(key => {
      if (key === 'export' || key === 'support' || key === 'retention') return;
      
      const limit = currentLimits[key as keyof UsageLimits] as number;
      const usage = usageData[`${key}_count` as keyof UsageData] as number;
      
      if (limit === -1) {
        percentages[key] = 0; // Unlimited
      } else {
        percentages[key] = Math.min(100, (usage / limit) * 100);
      }
    });
    
    return percentages;
  }, [usageData, currentPlan]);

  const isLimitReached = useCallback(() => {
    if (!usageData) return {};
    
    const currentLimits = PLAN_LIMITS[currentPlan];
    const reached: Record<string, boolean> = {};
    
    Object.keys(currentLimits).forEach(key => {
      if (key === 'export' || key === 'support' || key === 'retention') return;
      
      const limit = currentLimits[key as keyof UsageLimits] as number;
      const usage = usageData[`${key}_count` as keyof UsageData] as number;
      
      if (limit === -1) {
        reached[key] = false; // Unlimited
      } else {
        reached[key] = usage >= limit;
      }
    });
    
    return reached;
  }, [usageData, currentPlan]);

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
    return Promise.resolve();
  }, []);

  const reactivateSubscription = useCallback(async () => {
    if (!billingProfile?.paystack_subscription_id) {
      toast.error('No subscription to reactivate');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/reactivate-subscription', {
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
        throw new Error(result.error || 'Failed to reactivate subscription');
      }

      toast.success('Subscription reactivated successfully');
      await refreshData();
      
    } catch (err) {
      console.error('Error reactivating subscription:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to reactivate subscription');
    }
  }, [billingProfile, refreshData]);

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
    isTrialExpired: isTrialExpired(),
    isSubscriptionActive: isSubscriptionActive(),
    isPaymentPastDue: isPaymentPastDue(),
    nextBillingDate,
    isInGracePeriod: isInGracePeriod(),
    gracePeriodDaysLeft: gracePeriodDaysLeft(),
    
    // Usage tracking
    usagePercentages: usagePercentages(),
    isLimitReached: isLimitReached(),
    
    // Actions
    refreshData,
    cancelSubscription,
    updatePaymentMethod,
    upgradePlan,
    reactivateSubscription
  };
}

// Utility functions
export function getPlanLimits(plan: string): UsageLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function getPlanPricing(plan: string) {
  return PLAN_PRICING[plan as keyof typeof PLAN_PRICING] || PLAN_PRICING.free;
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