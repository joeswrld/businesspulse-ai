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
  AlertTriangle,
  Crown
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
  trial_start: string;
  trial_end: string;
  plan_type: 'trial' | 'business';
  subscription_id: string | null;
  authorization_code: string | null;
}

const BillingPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'business' | null>(null);

  const plans = [
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

      // Get user profile from profiles table
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (profileData) {
        // Construct user object with trial system
        const userObj: User = {
          id: authUser.id,
          email: authUser.email || '',
          trial_start: profileData.trial_start || new Date().toISOString(),
          trial_end: profileData.trial_end || new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          plan_type: profileData.plan_type || 'trial',
          subscription_id: profileData.authorization_code,
          authorization_code: profileData.authorization_code
        };
        setUser(userObj);
      }

      // Get subscription data if user has business plan
      if (profileData?.plan_type === 'business') {
        const { data: subscriptionData } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', authUser.id)
          .single();

        if (subscriptionData) {
          const subscriptionObj: Subscription = {
            id: subscriptionData.id,
            plan_code: subscriptionData.plan_code || 'business',
            plan_name: subscriptionData.plan_name || 'Business',
            status: subscriptionData.status || 'active',
            current_period_start: subscriptionData.current_period_start || '',
            current_period_end: subscriptionData.current_period_end || '',
            cancel_at_period_end: subscriptionData.cancel_at_period_end || false,
            canceled_at: subscriptionData.canceled_at || null
          };
          setSubscription(subscriptionObj);
        }
      }

      // Get transaction history
      const { data: transactionData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (transactionData) {
        const transactionsList: Transaction[] = transactionData.map(t => ({
          id: t.id.toString(),
          reference: t.paystack_reference || `TXN-${t.id}`,
          amount: t.amount || 0,
          status: t.status || 'pending',
          paid_at: t.created_at || '',
          created_at: t.created_at || ''
        }));
        setTransactions(transactionsList);
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
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handlePlanSelect = (plan: 'business') => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (subscriptionData: any) => {
    try {
      // Update user's plan_type to business
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase
          .from('profiles')
          .update({ 
            plan_type: 'business',
            authorization_code: subscriptionData.subscription_id || subscriptionData.reference
          })
          .eq('user_id', authUser.id);
      }

      toast.success('Payment successful! Your subscription is being activated...');
      setShowPayment(false);
      setSelectedPlan(null);
      
      // Refresh billing data
      setTimeout(() => {
        fetchBillingData();
      }, 2000);
    } catch (error) {
      console.error('Error updating plan after payment:', error);
      toast.error('Payment successful but failed to update plan. Please contact support.');
    }
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

  const getStatusBadge = (planType: string) => {
    switch (planType) {
      case 'business':
        return <Badge className="bg-green-100 text-green-800">Business</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      default:
        return <Badge variant="secondary">{planType}</Badge>;
    }
  };

  const isTrialActive = user?.plan_type === 'trial' && user?.trial_end && 
                       new Date(user.trial_end) > new Date();
  const isTrialExpired = user?.plan_type === 'trial' && user?.trial_end && 
                        new Date(user.trial_end) <= new Date();
  const hasActiveSubscription = user?.plan_type === 'business';
  
  const getTrialDaysRemaining = () => {
    if (!user?.trial_end) return 0;
    const now = new Date();
    const trialEnd = new Date(user.trial_end);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

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
                {user?.plan_type === 'business' ? 'Business Plan' : 'Free Trial'}
              </div>
              <div className="text-sm text-gray-600">Current Plan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {getStatusBadge(user?.plan_type || 'trial')}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {isTrialActive ? (
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-600">
                      {getTrialDaysRemaining()} days
                    </span>
                  </div>
                ) : isTrialExpired ? (
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">Expired</span>
                  </div>
                ) : hasActiveSubscription ? (
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Active</span>
                  </div>
                ) : (
                  'N/A'
                )}
              </div>
              <div className="text-sm text-gray-600">
                {isTrialActive ? 'Trial Remaining' : isTrialExpired ? 'Trial Status' : 'Plan Status'}
              </div>
            </div>
          </div>

          {isTrialActive && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Your free trial ends in {getTrialDaysRemaining()} days</span>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                Love what you see? Upgrade anytime during your trial to unlock unlimited features. 
                Your trial ends on {user?.trial_end ? new Date(user.trial_end).toLocaleDateString() : 'N/A'}.
              </p>
            </div>
          )}

          {isTrialExpired && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Trial Expired</span>
              </div>
              <p className="text-red-700 text-sm mt-1">
                Your free trial has ended. Upgrade to Business Plan to continue using all features.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Section */}
      {!hasActiveSubscription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              {isTrialExpired ? 'Upgrade to Continue' : 'Upgrade to Business Plan'}
            </CardTitle>
            <p className="text-gray-600 text-sm">
              {isTrialExpired 
                ? 'Your trial has expired. Upgrade now to continue using all features.'
                : 'Upgrade now to unlock unlimited features and continue building amazing experiences.'
              }
            </p>
          </CardHeader>
          <CardContent>
            <div className="max-w-md mx-auto">
              <Card className="relative border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Crown className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl">Business Plan</CardTitle>
                  </div>
                  <div className="text-4xl font-bold text-gray-900">
                    ₦53,000
                  </div>
                  <div className="text-gray-600">per month</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plans[0].features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={() => handlePlanSelect('business')}
                    className="w-full bg-primary hover:bg-primary/90"
                    size="lg"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Business Plan
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription Details */}
      {hasActiveSubscription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Business Plan Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">Business Plan</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                {getStatusBadge('business')}
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
              <p className="text-sm mt-2">Your payment history will appear here after your first upgrade.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {showPayment && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Complete Payment for Business Plan
            </h3>
            <PaystackPayment
              plan={selectedPlan}
              planName="Business Plan"
              planPrice="₦53,000"
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