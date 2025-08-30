import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  plan_code: string;
  plan_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
}

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  status: string;
  paid_at: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  trial_end: string;
  subscription_status: string;
  plan: string;
  subscription_id: string;
  authorization_code: string | null;
}

export const useBilling = () => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userData) {
        setUser(userData);
      }

      // Get subscription
      const { data: subscriptionData } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (subscriptionData) {
        setSubscription(subscriptionData);
      }

      // Get transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsData) {
        setTransactions(transactionsData);
      }

    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    if (!subscription?.plan_code) return false;

    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: subscription.plan_code
        }),
      });

      if (response.ok) {
        toast.success('Subscription cancellation initiated');
        await fetchBillingData();
        return true;
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to cancel subscription');
        return false;
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Failed to cancel subscription');
      return false;
    }
  };

  const updateCard = async (authorizationCode: string) => {
    if (!user?.id) return false;

    try {
      const response = await fetch('/api/update-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          authorization_code: authorizationCode
        }),
      });

      if (response.ok) {
        toast.success('Card information updated successfully');
        await fetchBillingData();
        return true;
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update card');
        return false;
      }
    } catch (error) {
      console.error('Error updating card:', error);
      toast.error('Failed to update card');
      return false;
    }
  };

  const hasActiveAccess = () => {
    if (!user) return false;
    
    // Check if user has active subscription
    if (subscription?.status === 'active') return true;
    
    // Check if user is still in trial period
    if (user.trial_end && new Date(user.trial_end) > new Date()) return true;
    
    return false;
  };

  const isTrialActive = () => {
    return user?.trial_end && new Date(user.trial_end) > new Date();
  };

  const getTrialDaysRemaining = () => {
    if (!user?.trial_end) return 0;
    const trialEnd = new Date(user.trial_end);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  useEffect(() => {
    fetchBillingData();
  }, []);

  return {
    user,
    subscription,
    transactions,
    loading,
    fetchBillingData,
    cancelSubscription,
    updateCard,
    hasActiveAccess,
    isTrialActive,
    getTrialDaysRemaining
  };
};
