import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import PaystackPayment from '@/components/PaystackPayment';

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

const BillingPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'business' | null>(null);

  const plans = [
    {
      id: 'pro',
      name: 'Pro',
      price: '₦35,000',
      pricePerMonth: '₦35,000/month',
      features: [
        'Unlimited data sources',
        '100 AI insights per month',
        'Advanced analytics',
        'Priority support',
        'Custom reports',
        'Team collaboration'
      ],
      planCode: 'PLN_4z2wpgmw41z2k7r'
    },
    {
      id: 'business',
      name: 'Business',
      price: '₦53,000',
      pricePerMonth: '₦53,000/month',
      features: [
        'Unlimited data sources',
        'Unlimited AI insights',
        'Enterprise analytics',
        'Dedicated support',
        'Custom integrations',
        'Advanced team management',
        'API access'
      ],
      planCode: 'PLN_esryg99ztsy9xc8'
    }
  ];

  useEffect(() => {
    fetchBillingData();
    setupRealtimeSubscription();
  }, []);

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

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('billing-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions'
        },
        () => {
          fetchBillingData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        () => {
          fetchBillingData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handlePlanSelect = (plan: 'pro' | 'business') => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (subscriptionData: any) => {
    toast.success('Payment successful! Your subscription is being activated...');
    setShowPayment(false);
    setSelectedPlan(null);
    
    // Refresh billing data
    setTimeout(() => {
      fetchBillingData();
    }, 2000);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setSelectedPlan(null);
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.plan_code) return;

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
        fetchBillingData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Failed to cancel subscription');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>;
      case 'canceled':
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isTrialActive = user?.trial_end && new Date(user.trial_end) > new Date();
  const hasActiveSubscription = subscription?.status === 'active';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-2">Manage your subscription and billing information</p>
      </div>

      {/* Current Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {subscription?.plan_name || 'Free'}
              </div>
              <div className="text-sm text-gray-600">Current Plan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {getStatusBadge(subscription?.status || 'inactive')}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {isTrialActive ? (
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-600">
                      {Math.ceil((new Date(user?.trial_end || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                ) : subscription?.current_period_end ? (
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span>
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  'N/A'
                )}
              </div>
              <div className="text-sm text-gray-600">
                {isTrialActive ? 'Trial Remaining' : 'Next Payment'}
              </div>
            </div>
          </div>

          {isTrialActive && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Free Trial Active</span>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                Your trial ends on {new Date(user?.trial_end || '').toLocaleDateString()}. 
                Upgrade to continue using all features.
              </p>
            </div>
          )}

          {subscription?.status === 'past_due' && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Payment Failed</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                Your last payment failed. Please update your payment method to continue.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      {!hasActiveSubscription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className="relative">
                  <CardHeader>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold text-gray-900">
                      {plan.pricePerMonth}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      onClick={() => handlePlanSelect(plan.id as 'pro' | 'business')}
                      className="w-full"
                    >
                      Upgrade to {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription Details */}
      {hasActiveSubscription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">{subscription?.plan_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                {getStatusBadge(subscription?.status || '')}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Started:</span>
                <span>
                  {subscription?.current_period_start 
                    ? new Date(subscription.current_period_start).toLocaleDateString()
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Next Payment:</span>
                <span>
                  {subscription?.current_period_end 
                    ? new Date(subscription.current_period_end).toLocaleDateString()
                    : 'N/A'
                  }
                </span>
              </div>
              <Separator />
              <Button 
                variant="outline" 
                onClick={handleCancelSubscription}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Cancel Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      transaction.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {transaction.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {transaction.reference}
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      ₦{transaction.amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {transaction.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {showPayment && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Complete Payment for {plans.find(p => p.id === selectedPlan)?.name} Plan
            </h3>
            <PaystackPayment
              plan={selectedPlan}
              planName={plans.find(p => p.id === selectedPlan)?.name || ''}
              planPrice={plans.find(p => p.id === selectedPlan)?.price || ''}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
