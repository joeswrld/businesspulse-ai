import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ErrorBoundary from '@/components/ErrorBoundary';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Crown,
  DollarSign,
  Receipt,
  RefreshCw,
  Lock,
  CalendarDays,
  Timer,
  Activity,
  User,
  Mail,
  CreditCard as CreditCardIcon,
  X
} from 'lucide-react';


const BillingPage: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Load subscription data
  const loadSubscriptionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to get billing profile
      const { data: billingProfile, error: billingError } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (billingError && billingError.code !== 'PGRST116') {
        console.warn('Billing profile not found, creating default trial');
        // Create default trial profile
        const trialEndDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
        const { error: createError } = await supabase
          .from('billing_profiles')
          .insert({
            id: user.id,
            plan: 'trial',
            trial_ends_at: trialEndDate.toISOString(),
            next_billing_date: null,
            subscription_status: 'trial',
            paystack_customer_id: null,
            paystack_subscription_id: null,
            created_at: new Date().toISOString(),
          });

        if (createError) {
          console.error('Failed to create billing profile:', createError);
        }

        setSubscription({
          plan: 'trial',
          isActive: true,
          isTrialExpired: false,
          daysLeft: 8,
          subscriptionId: null,
          nextBillingDate: null,
        });
      } else {
        const profile = billingProfile;
        const now = new Date();
        const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
        const isTrialExpired = profile.plan === 'trial' && trialEnd && now > trialEnd;
        const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

        setSubscription({
          plan: profile.plan || 'trial',
          isActive: profile.subscription_status === 'active' || (profile.plan === 'trial' && !isTrialExpired),
          isTrialExpired,
          daysLeft,
          subscriptionId: profile.paystack_subscription_id,
          nextBillingDate: profile.next_billing_date,
        });
      }

      // Load transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.warn('Error loading transactions:', transactionsError);
        setTransactions([]);
      } else {
        setTransactions(transactionsData || []);
      }

    } catch (error) {
      console.error('Error loading subscription data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription?\n\n' +
      'You will continue to have access to your current plan until the end of your billing period.\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      // Update billing profile to cancelled status
      const { error: updateError } = await supabase
        .from('billing_profiles')
        .update({
          subscription_status: 'cancelled'
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(`Failed to update billing profile: ${updateError.message}`);
      }

      alert('Subscription cancelled successfully. You can continue using your plan until the end of your current billing period.');
      await loadSubscriptionData(); // Refresh data after cancellation
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Handle upgrade click
  const handleUpgradeClick = () => {
    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    
    if (!paystackKey || paystackKey === 'pk_test_...' || paystackKey.includes('your_actual_paystack')) {
      alert('Paystack payment system not configured. Please check your environment variables.');
      return;
    }
    
    alert('Payment system integration is being set up. Please contact support for manual upgrade.');
  };

  // Download transaction receipt
  const downloadReceipt = (transaction: any) => {
    try {
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      };

      const formatCurrency = (amount: number, currency: string = 'NGN') => {
        return new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: currency.toUpperCase(),
        }).format(amount / 100);
      };

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

      alert('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt');
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

  // Get current plan display info
  const getCurrentPlanDisplay = () => {
    const planName = subscription?.plan === 'business' ? 'Business Plan' : 'Free Trial';
    let color = 'bg-gray-50 text-gray-700 border-gray-200';
    let statusLabel = '';

    if (subscription?.plan === 'trial') {
      color = 'bg-blue-50 text-blue-700 border-blue-200';
      if (subscription?.isTrialExpired) {
        statusLabel = ' - Expired';
        color = 'bg-red-50 text-red-700 border-red-200';
      } else {
        statusLabel = ` - ${subscription?.daysLeft || 0} days left`;
      }
    } else if (subscription?.plan === 'business') {
      if (subscription?.isActive) {
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
  const getPlanPricing = (plan: string) => {
    const pricing = {
      trial: { price: 0, currency: 'NGN', period: '8 days' },
      business: { price: 5300000, currency: 'NGN', period: '30 days' }
    };
    return pricing[plan as keyof typeof pricing] || pricing.trial;
  };

  const planPricing = getPlanPricing(subscription?.plan || 'trial');

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">Authentication Required</CardTitle>
            <CardDescription className="text-gray-600">
              Please log in to view your billing information
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
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

  // Get current plan display
  const currentPlanDisplay = getCurrentPlanDisplay();

  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-900">Billing System Error</CardTitle>
            <CardDescription className="text-red-700">
              There was an issue loading your billing information. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    }>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
              <p className="text-gray-600 mt-1">
                Manage your subscription and view billing history
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSubscriptionData}
                disabled={loading}
                className="text-gray-600 hover:text-gray-800"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Connection Issue:</strong> {error}. Some features may not be available.
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={loadSubscriptionData} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Critical Alerts */}
        {subscription?.isTrialExpired && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Trial Expired!</strong> Your free trial has ended. Upgrade to Business to continue using advanced features.
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handleUpgradeClick} className="bg-red-600 hover:bg-red-700">
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
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Billing Information</CardTitle>
                    <CardDescription className="text-gray-600">
                      Your account details
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Email</div>
                      <div className="text-sm text-gray-600">{user?.email || 'Not available'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Account ID</div>
                      <div className="text-sm text-gray-600 font-mono">{user?.id?.slice(0, 8) || 'N/A'}...</div>
                    </div>
                  </div>

                  {subscription?.subscriptionId && (
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Payment Method</div>
                        <div className="text-sm text-gray-600">Paystack Customer</div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Account Status</span>
                    <div className={`${currentPlanDisplay.color} px-3 py-1 text-xs font-medium border rounded-full inline-flex items-center`}>
                      <div className="flex items-center gap-1">
                        {subscription?.plan === 'business' && subscription?.isActive ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : subscription?.plan === 'trial' && !subscription?.isTrialExpired ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {currentPlanDisplay.label}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {subscription?.plan === 'business' && subscription?.isActive 
                      ? 'Your Business subscription is active and up to date'
                      : subscription?.plan === 'trial' && !subscription?.isTrialExpired
                      ? `Enjoying your free trial - ${subscription?.daysLeft || 0} days remaining`
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
                      <CardTitle className="text-2xl font-bold text-gray-900">
                        {subscription?.plan === 'business' ? 'Business Plan' : 'Free Trial'}
                      </CardTitle>
                      <CardDescription className="text-gray-600 text-base">
                        {subscription?.plan === 'business' && subscription?.isActive 
                          ? 'Your Business subscription is active and up to date'
                          : subscription?.plan === 'trial' && !subscription?.isTrialExpired
                          ? `Enjoying your free trial - ${subscription?.daysLeft || 0} days remaining`
                          : 'No active subscription'
                        }
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {loading && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {/* Plan Price */}
                  <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-center mb-3">
                      <DollarSign className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {planPricing.price === 0 ? 'Free' : new Intl.NumberFormat('en-NG', {
                        style: 'currency',
                        currency: planPricing.currency.toUpperCase(),
                      }).format(planPricing.price / 100)}
                    </div>
                    <div className="text-sm text-gray-600">per {planPricing.period}</div>
                  </div>
                  
                  {/* Trial Days or Next Billing */}
                  {subscription?.plan === 'trial' && !subscription?.isTrialExpired && (
                    <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-center mb-3">
                        <Timer className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="text-3xl font-bold text-blue-900 mb-2">{subscription?.daysLeft || 0}</div>
                      <div className="text-sm text-blue-600">trial days left</div>
                    </div>
                  )}
                  
                  {subscription?.plan === 'business' && subscription?.isActive && (
                    <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                      <div className="flex items-center justify-center mb-3">
                        <CalendarDays className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="text-3xl font-bold text-green-900 mb-2">
                        {subscription?.nextBillingDate ? 
                          Math.ceil((new Date(subscription.nextBillingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
                          'Active'
                        }
                      </div>
                      <div className="text-sm text-green-600">
                        {subscription?.nextBillingDate ? 'days until renewal' : 'subscription active'}
                      </div>
                    </div>
                  )}

                  {/* Plan Status */}
                  <div className="text-center p-6 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="flex items-center justify-center mb-3">
                      <Activity className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="text-lg font-bold text-purple-900 mb-2 capitalize">
                      {subscription?.isActive ? 'active' : 'inactive'}
                    </div>
                    <div className="text-sm text-purple-600">subscription status</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    {/* Show Upgrade button for trial users or expired trials */}
                    {(subscription?.plan === 'trial' && !subscription?.isTrialExpired) || subscription?.isTrialExpired ? (
                      <Button 
                        onClick={handleUpgradeClick} 
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <Crown className="h-5 w-5 mr-2" />
                        Upgrade to Business
                      </Button>
                    ) : null}
                    
                    {/* Show Cancel button for active business subscriptions */}
                    {subscription?.plan === 'business' && subscription?.isActive && (
                      <Button 
                        variant="outline" 
                        onClick={handleCancelSubscription} 
                        className="border-2 border-red-200 text-red-700 hover:bg-red-50 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:border-red-300"
                      >
                        <X className="h-5 w-5 mr-2" />
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
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Transaction History</CardTitle>
                    <CardDescription className="text-gray-600">
                      Your payment and subscription history
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-600">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Receipt className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Your transaction history will appear here once you make your first payment.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction) => {
                      const statusDisplay = getStatusDisplay(transaction.status);
                      const formatDate = (dateString: string) => {
                        return new Date(dateString).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        });
                      };
                      const formatCurrency = (amount: number, currency: string = 'NGN') => {
                        return new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: currency.toUpperCase(),
                        }).format(amount / 100);
                      };
                      return (
                        <div key={transaction.id} className="p-6 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${
                                transaction.status === 'success' ? 'bg-green-100' : 
                                transaction.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                              }`}>
                                {statusDisplay.icon}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-lg">
                                  {transaction.description || 'Subscription Payment'}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {formatDate(transaction.created_at)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xl font-bold text-gray-900">
                                  {formatCurrency(transaction.amount, transaction.currency)}
                                </div>
                                <div 
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    transaction.status === 'success' ? 'bg-green-100 text-green-800' : 
                                    transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadReceipt(transaction)}
                                disabled={transaction.status !== 'success'}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
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
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default BillingPage;
export { BillingPage as Billing };