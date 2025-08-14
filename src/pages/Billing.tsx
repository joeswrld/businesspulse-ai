import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Calendar, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  Zap,
  Shield,
  Download,
  Loader2,
  ExternalLink,
  Crown,
  Star
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Plan {
  code: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: string;
  seat_limit: number;
  features: string[];
  is_active: boolean;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_code: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  paystack_customer_id: string | null;
  paystack_subscription_code: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  subscription_id: string | null;
  reference: string;
  amount_cents: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'reversed';
  authorization_url: string | null;
  paid_at: string | null;
  metadata: any;
  created_at: string;
}

const Billing: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Fetch billing data
  const fetchBillingData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching billing data for user:', user.id);
      
      // Fetch available plans
      const { data: plansData, error: plansError } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_cents', { ascending: true });

      if (plansError) throw plansError;

      // Fetch user subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;

      // Fetch transactions
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txError) throw txError;

      console.log('💰 Billing data fetched:', {
        plans: plansData?.length || 0,
        subscription: subData ? 'Yes' : 'No',
        transactions: txData?.length || 0
      });
      
      setPlans(plansData || []);
      setSubscription(subData);
      setTransactions(txData || []);
      
    } catch (error) {
      console.error('❌ Error fetching billing data:', error);
      toast({
        title: "Error",
        description: "Failed to load billing information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time billing subscriptions for user:', user.id);

    // Subscribe to subscription changes
    const subscriptionChannel = supabase
      .channel('billing-subscription-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Subscription real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setSubscription(payload.new as Subscription);
          } else if (payload.eventType === 'DELETE') {
            setSubscription(null);
          }
        }
      )
      .subscribe();

    // Subscribe to transaction changes
    const transactionChannel = supabase
      .channel('billing-transaction-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Transaction real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            setTransactions(prev => [payload.new as Transaction, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTransactions(prev => 
              prev.map(tx => 
                tx.id === payload.new.id ? payload.new as Transaction : tx
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time billing subscriptions');
      supabase.removeChannel(subscriptionChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Calculate trial days remaining
  const trialDaysLeft = useMemo(() => {
    if (!subscription?.trial_end) return null;
    const ms = new Date(subscription.trial_end).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  // Get current plan details
  const currentPlan = useMemo(() => {
    if (!subscription?.plan_code) return null;
    return plans.find(plan => plan.code === subscription.plan_code);
  }, [subscription, plans]);

  // Start checkout process
  const startCheckout = async (planCode: string, currency: string = 'USD') => {
    if (!user) return;
    
    setProcessingPayment(true);
    
    try {
      console.log(`🚀 Starting checkout for plan: ${planCode}`);
      
      const { data, error } = await supabase.functions.invoke('billing-init', {
        body: { 
          user_id: user.id, 
          plan_code: planCode, 
          currency 
        }
      });

      if (error) throw error;

      if (data?.authorization_url) {
        console.log('✅ Redirecting to Paystack checkout');
        window.location.href = data.authorization_url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      console.error('❌ Checkout error:', error);
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to start checkout process",
        variant: "destructive"
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Cancel subscription
  const cancelSubscription = async () => {
    if (!subscription) return;
    
    try {
      // For now, just show a message. You can implement a cancel Edge Function later
      toast({
        title: "Contact Support",
        description: "Please contact our support team to cancel your subscription",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive"
      });
    }
  };

  // Utility functions
  const formatCurrency = (amountCents: number, currency: string) => {
    const amount = amountCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'trialing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'past_due':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'canceled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'trialing':
        return <Clock className="h-4 w-4" />;
      case 'past_due':
        return <AlertTriangle className="h-4 w-4" />;
      case 'canceled':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage your plan, payments, and subscription in real-time.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Current Plan Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Current Plan */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {currentPlan?.name || 'Trial'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {currentPlan ? formatCurrency(currentPlan.price_cents, currentPlan.currency) : 'Free'} / month
                    </div>
                  </div>
                  {subscription?.status === 'trialing' && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Trial
                    </Badge>
                  )}
                </div>

                {trialDaysLeft !== null && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center text-blue-800">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">
                        Trial ends in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={`${getStatusColor(subscription?.status || 'unknown')} border`}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(subscription?.status || 'unknown')}
                        <span className="capitalize">{subscription?.status || 'unknown'}</span>
                      </div>
                    </Badge>
                  </div>
                  
                  {subscription?.current_period_end && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Next billing:</span>
                      <span className="text-gray-900">
                        {new Date(subscription.current_period_end).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Features */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Plan Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentPlan?.features ? (
                  currentPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-sm">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      AI Insights (100/month)
                    </div>
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Basic Reports (10/month)
                    </div>
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Email Support
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plan Limits */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Plan Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Team Members:</span>
                  <span className="font-medium text-gray-900">
                    {currentPlan?.seat_limit || 1} seats
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Storage:</span>
                  <span className="font-medium text-gray-900">
                    {currentPlan?.code === 'business' ? '500GB' : 
                     currentPlan?.code === 'pro' ? '50GB' : '5GB'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Support:</span>
                  <span className="font-medium text-gray-900">
                    {currentPlan?.code === 'business' ? '24/7' : 
                     currentPlan?.code === 'pro' ? 'Priority' : 'Email'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Selection */}
        <Card className="bg-white shadow-sm border-0 mb-8">
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>
              Select the plan that best fits your business needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.code}
                  className={`border rounded-xl p-6 ${
                    subscription?.plan_code === plan.code
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {formatCurrency(plan.price_cents, plan.currency)}
                      <span className="text-lg text-gray-500">/month</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => startCheckout(plan.code, plan.currency)}
                    disabled={processingPayment || subscription?.plan_code === plan.code}
                    className={`w-full ${
                      subscription?.plan_code === plan.code
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : subscription?.plan_code === plan.code ? (
                      'Current Plan'
                    ) : (
                      <>
                        {subscription?.plan_code ? 'Switch to ' : 'Choose '}
                        {plan.name}
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Your payment and subscription history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-500">
                  Your payment history will appear here once you make your first payment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center">
                          <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="font-medium text-gray-900">
                            {transaction.metadata?.plan_name || 'Subscription'}
                          </span>
                        </div>
                        <Badge className={getTransactionStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Reference: {transaction.reference} • {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(transaction.amount_cents, transaction.currency)}
                      </div>
                      {transaction.paid_at && (
                        <div className="text-xs text-gray-500">
                          Paid {new Date(transaction.paid_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="bg-white shadow-sm border-0 mt-8">
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                onClick={cancelSubscription}
                disabled={!subscription || subscription.status === 'canceled'}
              >
                Cancel Subscription
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Invoices
              </Button>
              <Button variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Privacy Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Billing;