import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  X,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface Subscription {
  plan: string;
  isActive: boolean;
  isTrialExpired: boolean;
  daysLeft: number;
  subscriptionId: string | null;
  nextBillingDate: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
  paystack_reference: string;
}

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  
  // State management - simplified
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load subscription data with optimistic updates
  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get billing profile
      const { data: billingProfile, error: billingError } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (billingError && billingError.code !== 'PGRST116') {
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

        if (!createError) {
          setSubscription({
            plan: 'trial',
            isActive: true,
            isTrialExpired: false,
            daysLeft: 8,
            subscriptionId: null,
            nextBillingDate: null,
          });
        }
      } else if (billingProfile) {
        const now = new Date();
        const trialEnd = billingProfile.trial_ends_at ? new Date(billingProfile.trial_ends_at) : null;
        const isTrialExpired = billingProfile.plan === 'trial' && trialEnd && now > trialEnd;
        const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

        setSubscription({
          plan: billingProfile.plan || 'trial',
          isActive: billingProfile.subscription_status === 'active' || (billingProfile.plan === 'trial' && !isTrialExpired),
          isTrialExpired,
          daysLeft,
          subscriptionId: billingProfile.paystack_subscription_id,
          nextBillingDate: billingProfile.next_billing_date,
        });
      }

      // Load transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!transactionsError) {
        setTransactions(transactionsData || []);
      }

    } catch (error) {
      console.error('Error loading subscription data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  // Handle subscription cancellation with optimistic update
  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription?\n\n' +
      'You will continue to have access to your current plan until the end of your billing period.\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    // Optimistic update
    if (subscription) {
      setSubscription(prev => prev ? { ...prev, isActive: false } : null);
    }

    try {
      const { error: updateError } = await supabase
        .from('billing_profiles')
        .update({ subscription_status: 'cancelled' })
        .eq('id', user?.id);

      if (updateError) {
        // Revert optimistic update on error
        loadSubscriptionData();
        throw new Error(`Failed to update billing profile: ${updateError.message}`);
      }

      alert('Subscription cancelled successfully. You can continue using your plan until the end of your current billing period.');
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
  const downloadReceipt = (transaction: Transaction) => {
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
        return { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600 dark:text-green-400' };
      case 'pending':
        return { icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600 dark:text-yellow-400' };
      case 'failed':
        return { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600 dark:text-red-400' };
      default:
        return { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-muted-foreground' };
    }
  };

  // Get current plan display info
  const getCurrentPlanDisplay = () => {
    const planName = subscription?.plan === 'business' ? 'Business Plan' : 'Free Trial';
    let color = 'bg-muted text-muted-foreground border-border';
    let statusLabel = '';

    if (subscription?.plan === 'trial') {
      color = 'bg-primary/10 text-primary border-primary/20';
      if (subscription?.isTrialExpired) {
        statusLabel = ' - Expired';
        color = 'bg-destructive/10 text-destructive border-destructive/20';
      } else {
        statusLabel = ` - ${subscription?.daysLeft || 0} days left`;
      }
    } else if (subscription?.plan === 'business') {
      if (subscription?.isActive) {
        color = 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
        statusLabel = ' - Active';
      } else {
        statusLabel = ' - Inactive';
        color = 'bg-warning/10 text-warning border-warning/20';
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
  const currentPlanDisplay = getCurrentPlanDisplay();

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">Authentication Required</CardTitle>
            <CardDescription className="text-muted-foreground">
              Please log in to view your billing information
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Billing & Subscription</h1>
              <p className="text-muted-foreground mt-1">
                Manage your subscription and view billing history
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSubscriptionData}
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-warning/20 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              <strong>Connection Issue:</strong> {error}. Some features may not be available.
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={loadSubscriptionData} variant="outline" className="border-warning/30 text-warning hover:bg-warning/10">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Critical Alerts */}
        {subscription?.isTrialExpired && (
          <Alert className="mb-6 border-destructive/20 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <strong>Trial Expired!</strong> Your free trial has ended. Upgrade to Business to continue using advanced features.
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handleUpgradeClick} className="bg-destructive hover:bg-destructive/90">
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
            <Card className="shadow-lg border-border bg-card">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-card-foreground">Billing Information</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Your account details
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium text-card-foreground">Email</div>
                      <div className="text-sm text-muted-foreground">{user?.email || 'Not available'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium text-card-foreground">Account ID</div>
                      <div className="text-sm text-muted-foreground font-mono">{user?.id?.slice(0, 8) || 'N/A'}...</div>
                    </div>
                  </div>

                  {subscription?.subscriptionId && (
                    <div className="flex items-center gap-3">
                      <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium text-card-foreground">Payment Method</div>
                        <div className="text-sm text-muted-foreground">Paystack Customer</div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-card-foreground">Account Status</span>
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
                  
                  <div className="text-xs text-muted-foreground">
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
            <Card className="shadow-lg border-border bg-card">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold text-card-foreground">
                        {subscription?.plan === 'business' ? 'Business Plan' : 'Free Trial'}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-base">
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
                    {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {/* Plan Price */}
                  <div className="text-center p-6 bg-muted/50 rounded-xl border border-border">
                    <div className="flex items-center justify-center mb-3">
                      <DollarSign className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="text-3xl font-bold text-card-foreground mb-2">
                      {planPricing.price === 0 ? 'Free' : new Intl.NumberFormat('en-NG', {
                        style: 'currency',
                        currency: planPricing.currency.toUpperCase(),
                      }).format(planPricing.price / 100)}
                    </div>
                    <div className="text-sm text-muted-foreground">per {planPricing.period}</div>
                  </div>
                  
                  {/* Trial Days or Next Billing */}
                  {subscription?.plan === 'trial' && !subscription?.isTrialExpired && (
                    <div className="text-center p-6 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="flex items-center justify-center mb-3">
                        <Timer className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-3xl font-bold text-primary mb-2">{subscription?.daysLeft || 0}</div>
                      <div className="text-sm text-primary">trial days left</div>
                    </div>
                  )}
                  
                  {subscription?.plan === 'business' && subscription?.isActive && (
                    <div className="text-center p-6 bg-green-500/5 rounded-xl border border-green-500/20">
                      <div className="flex items-center justify-center mb-3">
                        <CalendarDays className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                        {subscription?.nextBillingDate ? 
                          Math.ceil((new Date(subscription.nextBillingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
                          'Active'
                        }
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400">
                        {subscription?.nextBillingDate ? 'days until renewal' : 'subscription active'}
                      </div>
                    </div>
                  )}

                  {/* Plan Status */}
                  <div className="text-center p-6 bg-purple-500/5 rounded-xl border border-purple-500/20">
                    <div className="flex items-center justify-center mb-3">
                      <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2 capitalize">
                      {subscription?.isActive ? 'active' : 'inactive'}
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">subscription status</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-border">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                    {/* Show Upgrade button for trial users or expired trials */}
                    {(subscription?.plan === 'trial' && !subscription?.isTrialExpired) || subscription?.isTrialExpired ? (
                      <Button 
                        onClick={handleUpgradeClick} 
                        className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground px-6 py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
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
                        className="border-2 border-destructive/20 text-destructive hover:bg-destructive/5 px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:border-destructive/30"
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
            <Card className="shadow-lg border-border bg-card">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Receipt className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-card-foreground">Transaction History</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Your payment and subscription history
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-muted rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Receipt className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">No transactions yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
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
                        <div key={transaction.id} className="p-6 bg-card rounded-lg border border-border hover:shadow-sm transition-shadow duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${
                                transaction.status === 'success' ? 'bg-green-500/10' : 
                                transaction.status === 'pending' ? 'bg-yellow-500/10' : 'bg-destructive/10'
                              }`}>
                                {statusDisplay.icon}
                              </div>
                              <div>
                                <div className="font-semibold text-card-foreground text-lg">
                                  {transaction.description || 'Subscription Payment'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatDate(transaction.created_at)}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xl font-bold text-card-foreground">
                                  {formatCurrency(transaction.amount, transaction.currency)}
                                </div>
                                <div 
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    transaction.status === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 
                                    transaction.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' : 
                                    'bg-destructive/10 text-destructive'
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
                                className="text-primary hover:text-primary/80 hover:bg-primary/5"
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
  );
};

export default BillingPage;