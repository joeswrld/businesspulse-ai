import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaystack } from '@/hooks/usePaystack';
import { supabase } from '@/integrations/supabase/client';
import { 
  formatCurrency, 
  formatDate, 
  getPlanDisplayName, 
  getPlanPrice, 
  getPlanPricing 
} from '@/hooks/useBillingSystem';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Crown,
  DollarSign,
  Receipt,
  RefreshCw,
  AlertCircle,
  Lock,
  CreditCard,
  CalendarDays,
  Timer,
  Activity,
  User,
  Mail,
  CreditCard as CreditCardIcon,
  Building2,
  Phone,
  MapPin,
  Shield,
  Check,
  X
} from 'lucide-react';
import PaystackPayment from '@/components/PaystackPayment';

type UpgradePlan = 'business' | null;

// Helper function to calculate subscription end date
const calculateSubscriptionEndDate = (billingProfile: any, currentPlan: string) => {
  if (currentPlan === 'trial' && billingProfile?.trial_ends_at) {
    return new Date(billingProfile.trial_ends_at);
  }
  
  if (billingProfile?.next_billing_date) {
    return new Date(billingProfile.next_billing_date);
  }
  
  return null;
};

// Helper function to get subscription status color and icon
const getSubscriptionStatusDisplay = (billingProfile: any, currentPlan: string, isTrialExpired: boolean, isPaymentPastDue: boolean, isInGracePeriod: boolean) => {
  if (currentPlan === 'trial') {
    if (isTrialExpired) {
      return {
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: <XCircle className="h-4 w-4" />,
        label: 'Trial Expired',
        description: 'Your free trial has ended'
      };
    } else {
      return {
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: <Clock className="h-4 w-4" />,
        label: 'Free Trial',
        description: 'Enjoying your free trial'
      };
    }
  }
  
  if (isPaymentPastDue) {
    if (isInGracePeriod) {
      return {
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Payment Due',
        description: 'Payment failed - grace period active'
      };
    } else {
      return {
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: <XCircle className="h-4 w-4" />,
        label: 'Payment Failed',
        description: 'Account suspended due to failed payment'
      };
    }
  }
  
  if (billingProfile?.subscription_status === 'active') {
    return {
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: <CheckCircle className="h-4 w-4" />,
      label: 'Active',
      description: 'Subscription is active and up to date'
    };
  }
  
  return {
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: <Clock className="h-4 w-4" />,
    label: 'Inactive',
    description: 'No active subscription'
  };
};

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const subscription = useSubscription();
  const paystack = usePaystack();
  
  // State
  const [cancelling, setCancelling] = useState(false);
  const [upgradePlanModal, setUpgradePlanModal] = useState<UpgradePlan>(null);
  const [showConfigError, setShowConfigError] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Load transactions
  const loadTransactions = async () => {
    if (!user) return;
    
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading transactions:', error);
        setTransactions([]);
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Load transactions on mount
  React.useEffect(() => {
    loadTransactions();
  }, [user]);

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription?\n\n' +
      'You will continue to have access to your current plan until the end of your billing period.\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    setCancelling(true);
    try {
      await subscription.cancelSubscription();
      await loadTransactions(); // Refresh transactions after cancellation
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast.error('Failed to cancel subscription: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setCancelling(false);
    }
  };

  // Check if Paystack is properly configured before opening upgrade modal
  const handleUpgradeClick = (plan: UpgradePlan) => {
    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    
    if (!paystackKey || paystackKey === 'pk_test_...' || paystackKey.includes('your_actual_paystack')) {
      setShowConfigError(true);
      toast.error('Paystack payment system not configured. Please check your environment variables.');
      return;
    }
    
    setUpgradePlanModal(plan);
  };

  // Handle successful payment
  const handlePaymentSuccess = async ({ reference, plan }: { reference: string; plan: string }) => {
    try {
      console.log('Payment successful, upgrading to business...');
      toast.success(`🎉 Welcome to Business! Your subscription has been activated.`);
      setUpgradePlanModal(null);
      
      // Refresh subscription status
      await subscription.refreshStatus();
      
      // Refresh transactions
      await loadTransactions();
      
      console.log('Upgrade completed successfully');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to activate subscription');
    }
  };

  // Download transaction receipt
  const downloadReceipt = (transaction: any) => {
    try {
      const receiptContent = `
NoteX - Transaction Receipt

Date: ${formatDate(transaction.created_at)}
Description: ${transaction.description || 'Subscription Payment'}
Amount: ${formatCurrency(transaction.amount, transaction.currency)}
Status: ${transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
Reference: ${transaction.paystack_reference || 'N/A'}
Transaction ID: ${transaction.id}

Thank you for your payment!

NoteX Team
      `.trim();

      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${transaction.id}-${formatDate(transaction.created_at).replace(/\//g, '-')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  // Get status icon and color
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'success':
        return { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' };
      case 'pending':
        return { icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600' };
      case 'failed':
        return { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600' };
      default:
        return { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-gray-600' };
    }
  };

  // Get current plan display info using subscription hook
  const getCurrentPlanDisplay = () => {
    const planName = subscription.plan === 'business' ? 'Business Plan' : 'Free Trial';
    let color = 'bg-gray-50 text-gray-700 border-gray-200';
    let statusLabel = '';

    if (subscription.plan === 'trial') {
      color = 'bg-blue-50 text-blue-700 border-blue-200';
      if (subscription.isTrialExpired) {
        statusLabel = ' - Expired';
        color = 'bg-red-50 text-red-700 border-red-200';
      } else {
        statusLabel = ` - ${subscription.daysLeft} days left`;
      }
    } else if (subscription.plan === 'business') {
      if (subscription.isActive) {
        color = 'bg-green-50 text-green-700 border-green-200';
        statusLabel = ' - Active';
      } else {
        statusLabel = ' - Inactive';
        color = 'bg-orange-50 text-orange-700 border-orange-200';
      }
    }

    return {
      label: `${planName}${statusLabel}`,
      color
    };
  };

  // Get plan pricing
  const planPricing = getPlanPricing(subscription.plan);

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl text-gray-900 dark:text-gray-100">Authentication Required</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Please log in to view your billing information
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (subscription.loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-0 shadow-lg">
                  <CardHeader className="pb-4">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="flex justify-between items-center">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subscription.error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-xl text-red-900 dark:text-red-100">Error Loading Billing</CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">{subscription.error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={subscription.refreshStatus} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get current plan display
  const currentPlanDisplay = getCurrentPlanDisplay();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Billing & Subscription</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your subscription and view billing history
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={subscription.refreshStatus}
                disabled={subscription.loading}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${subscription.loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        {subscription.isTrialExpired && (
          <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>Trial Expired!</strong> Your free trial has ended. Upgrade to Business to continue using advanced features.
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => handleUpgradeClick('business')} className="bg-red-600 hover:bg-red-700">
                  Upgrade to Business
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Billing Information */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Billing Information</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Your account details
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Email</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Account ID</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">{user.id.slice(0, 8)}...</div>
                    </div>
                  </div>

                  {subscription.subscriptionId && (
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Payment Method</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Paystack Customer</div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Account Status</span>
                    <Badge className={`${currentPlanDisplay.color} px-3 py-1 text-xs font-medium border`}>
                      <div className="flex items-center gap-1">
                        {subscription.plan === 'business' && subscription.isActive ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : subscription.plan === 'trial' && !subscription.isTrialExpired ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {currentPlanDisplay.label}
                      </div>
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {subscription.plan === 'business' && subscription.isActive 
                      ? 'Your Business subscription is active and up to date'
                      : subscription.plan === 'trial' && !subscription.isTrialExpired
                      ? `Enjoying your free trial - ${subscription.daysLeft} days remaining`
                      : 'No active subscription'
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Plan & Transaction History */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Current Plan */}
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {getPlanDisplayName(subscription.plan)}
                      </CardTitle>
                      <CardDescription className="text-gray-600 dark:text-gray-400 text-base">
                        {subscription.plan === 'business' && subscription.isActive 
                          ? 'Your Business subscription is active and up to date'
                          : subscription.plan === 'trial' && !subscription.isTrialExpired
                          ? `Enjoying your free trial - ${subscription.daysLeft} days remaining`
                          : 'No active subscription'
                        }
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {subscription.loading && <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {/* Plan Price */}
                  <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center mb-3">
                      <DollarSign className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {planPricing.price === 0 ? 'Free' : formatCurrency(planPricing.price, planPricing.currency)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">per {planPricing.period}</div>
                  </div>
                  
                  {/* Trial Days or Next Billing */}
                  {subscription.plan === 'trial' && !subscription.isTrialExpired && (
                    <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-center mb-3">
                        <Timer className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">{subscription.daysLeft}</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">trial days left</div>
                    </div>
                  )}
                  
                  {subscription.plan === 'business' && subscription.isActive && (
                    <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-center mb-3">
                        <CalendarDays className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-100 mb-2">
                        {subscription.nextBillingDate ? 
                          Math.ceil((new Date(subscription.nextBillingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
                          'Active'
                        }
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        {subscription.nextBillingDate ? 'days until renewal' : 'subscription active'}
                      </div>
                    </div>
                  )}

                  {/* Plan Status */}
                  <div className="text-center p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-center mb-3">
                      <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-2 capitalize">
                      {subscription.isActive ? 'active' : 'inactive'}
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">subscription status</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    {/* Show Upgrade button for trial users or expired trials */}
                    {(subscription.plan === 'trial' && !subscription.isTrialExpired) || subscription.isTrialExpired ? (
                      <Button 
                        onClick={() => handleUpgradeClick('business')} 
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700"
                      >
                        <Crown className="h-5 w-5 mr-2" />
                        Upgrade to Business
                      </Button>
                    ) : null}
                    
                    {/* Show Cancel button for active business subscriptions */}
                    {subscription.plan === 'business' && subscription.isActive && (
                      <Button 
                        variant="outline" 
                        onClick={handleCancelSubscription} 
                        disabled={cancelling}
                        className="border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:border-red-300 dark:hover:border-red-700"
                      >
                        {cancelling ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <X className="h-5 w-5 mr-2" />}
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Transaction History</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">
                      Your payment and subscription history
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTransactions ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-600 dark:text-gray-400">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Receipt className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No transactions yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      Your transaction history will appear here once you make your first payment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => {
                      const statusDisplay = getStatusDisplay(transaction.status);
                      return (
                        <div key={transaction.id} className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${
                                transaction.status === 'success' ? 'bg-green-100 dark:bg-green-900/20' : 
                                transaction.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-red-100 dark:bg-red-900/20'
                              }`}>
                                {statusDisplay.icon}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                                  {transaction.description || 'Subscription Payment'}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatDate(transaction.created_at)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                  {formatCurrency(transaction.amount, transaction.currency)}
                                </div>
                                <Badge 
                                  variant={transaction.status === 'success' ? 'default' : 
                                         transaction.status === 'pending' ? 'secondary' : 'destructive'}
                                  className="text-xs"
                                >
                                  {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadReceipt(transaction)}
                                disabled={transaction.status !== 'success'}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Receipt
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upgrade Plan Modal */}
        {upgradePlanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <PaystackPayment
                plan={upgradePlanModal}
                planName="Business"
                planPrice={getPlanPrice(upgradePlanModal)}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setUpgradePlanModal(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;