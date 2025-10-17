// src/pages/Billing.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
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

// Declare Paystack type
declare global {
  interface Window {
    PaystackPop: any;
  }
}

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load subscription data
  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Loading subscription data for user:', user.id);

      // Use RPC function for accurate access check
      const { data: profileData, error: rpcError } = await supabase
        .rpc('get_user_profile_with_access', { user_uuid: user.id });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw rpcError;
      }

      console.log('📊 Profile data:', profileData);

      if (!profileData || profileData.length === 0) {
        // Create trial profile
        console.log('⚠️ No profile found, creating trial...');
        const trialEndDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
        
        const { error: createError } = await supabase
          .from('billing_profiles')
          .insert({
            id: user.id,
            plan: 'trial',
            trial_ends_at: trialEndDate.toISOString(),
            subscription_status: 'trial',
            created_at: new Date().toISOString(),
          });

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
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
        const profile = profileData[0];
        const hasAccess = profile.has_access === true;
        const daysLeft = profile.days_left || 0;

        // Determine plan and status
        const isTrialExpired = profile.plan === 'trial' && !hasAccess;
        const isActive = profile.subscription_status === 'active' || hasAccess;

        setSubscription({
          plan: profile.plan,
          isActive,
          isTrialExpired,
          daysLeft,
          subscriptionId: profile.paystack_subscription_id || null,
          nextBillingDate: profile.next_billing_date,
        });

        console.log('✅ Subscription loaded:', {
          plan: profile.plan,
          status: profile.subscription_status,
          hasAccess,
          isActive,
          daysLeft
        });
      }

      // Load transactions
      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!txError) {
        setTransactions(transactionsData || []);
      }

    } catch (error) {
      console.error('❌ Error loading subscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to load subscription data');
      toast.error('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadSubscriptionData();

    // Set up realtime listener for billing profile changes
    if (user) {
      const channel = supabase
        .channel(`billing-updates-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'billing_profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔔 Billing profile updated:', payload);
            const newData = payload.new as any;
            
            if (newData.subscription_status === 'active' && newData.plan === 'business') {
              toast.success('🎉 Subscription Activated!', {
                description: 'You now have full access to all features',
                duration: 5000,
              });
            }
            
            loadSubscriptionData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Handle payment success (moved outside to avoid async issues)
  const handlePaymentSuccess = (response: any) => {
    console.log('✅ Payment successful:', response);
    
    toast.success('🎉 Payment Successful!', {
      description: 'Activating your subscription...',
      duration: 5000
    });

    // Use setTimeout for async operations
    setTimeout(async () => {
      try {
        // First, try manual verification via Edge Function
        console.log('🔍 Verifying payment manually...');
        
        try {
          const verifyResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                reference: response.reference,
                userId: user?.id,
              }),
            }
          );

          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            console.log('✅ Manual verification successful:', verifyData);
            
            // Refresh subscription data
            await loadSubscriptionData();

            toast.success('✅ Subscription Activated!', {
              description: 'Redirecting to dashboard...',
              duration: 3000
            });
            
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
            
            setIsProcessingPayment(false);
            return;
          }
        } catch (verifyError) {
          console.warn('⚠️ Manual verification failed, waiting for webhook...', verifyError);
        }

        // Fallback: Wait for webhook to process
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Refresh subscription data
        await loadSubscriptionData();

        // Verify activation
        const { data: checkData } = await supabase
          .rpc('get_user_profile_with_access', { user_uuid: user?.id });

        if (checkData?.[0]?.subscription_status === 'active') {
          toast.success('✅ Subscription Activated!', {
            description: 'Redirecting to dashboard...',
            duration: 3000
          });
          
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          // Final fallback: Update directly via Supabase
          console.log('⚠️ Webhook not processed, updating directly...');
          
          const nextBillingDate = new Date();
          nextBillingDate.setDate(nextBillingDate.getDate() + 30);

          const { error: directUpdateError } = await supabase
            .from('billing_profiles')
            .upsert({
              id: user?.id,
              plan: 'business',
              subscription_status: 'active',
              trial_ends_at: null,
              next_billing_date: nextBillingDate.toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'id'
            });

          if (!directUpdateError) {
            await loadSubscriptionData();
            
            toast.success('✅ Subscription Activated!', {
              description: 'Redirecting to dashboard...',
              duration: 3000
            });
            
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          } else {
            toast.warning('Payment received but activation pending', {
              description: 'Please refresh the page in a moment or contact support.',
              duration: 10000
            });
          }
        }
      } catch (error) {
        console.error('Post-payment error:', error);
        toast.error('Error activating subscription', {
          description: 'Payment successful but activation failed. Please contact support.'
        });
      } finally {
        setIsProcessingPayment(false);
      }
    }, 100);
  };

  // Handle payment closure
  const handlePaymentClose = () => {
    setIsProcessingPayment(false);
    toast.info('Payment Cancelled', {
      description: 'You can try again anytime'
    });
  };

  // Handle Paystack payment
  const handleUpgradeClick = () => {
    const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    
    if (!paystackKey || paystackKey.includes('pk_test_...') || paystackKey.includes('your_actual')) {
      toast.error('Payment system not configured', {
        description: 'Please add VITE_PAYSTACK_PUBLIC_KEY to your .env file'
      });
      return;
    }

    if (!window.PaystackPop) {
      toast.error('Paystack not loaded', {
        description: 'Please refresh the page and try again'
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: user?.email,
        amount: 5300000, // ₦53,000 in kobo
        currency: 'NGN',
        ref: `${Date.now()}-${user?.id}`,
        metadata: {
          user_id: user?.id, // CRITICAL for webhook
          plan: 'business',
          custom_fields: [
            {
              display_name: 'User ID',
              variable_name: 'user_id',
              value: user?.id
            }
          ]
        },
        callback: handlePaymentSuccess,
        onClose: handlePaymentClose,
      });
      
      handler.openIframe();
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessingPayment(false);
      toast.error('Payment failed', {
        description: 'Please try again'
      });
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription?\n\n' +
      'You will continue to have access until the end of your billing period.\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      const { error: updateError } = await supabase
        .from('billing_profiles')
        .update({ 
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      toast.success('Subscription cancelled', {
        description: 'You can continue using your plan until the end of the billing period'
      });

      await loadSubscriptionData();
    } catch (error) {
      console.error('Cancellation error:', error);
      toast.error('Failed to cancel subscription', {
        description: 'Please try again or contact support'
      });
    }
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

      toast.success('Receipt downloaded');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download receipt');
    }
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'success':
        return { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' };
      case 'pending':
        return { icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600' };
      case 'failed':
        return { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600' };
      default:
        return { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-muted-foreground' };
    }
  };

  // Get plan display
  const getCurrentPlanDisplay = () => {
    const planName = subscription?.plan === 'business' ? 'Business Plan' : 'Free Trial';
    let color = 'bg-muted text-muted-foreground border-border';
    let statusLabel = '';

    if (subscription?.plan === 'trial') {
      if (subscription?.isTrialExpired) {
        statusLabel = ' - Expired';
        color = 'bg-destructive/10 text-destructive border-destructive/20';
      } else {
        statusLabel = ` - ${subscription?.daysLeft || 0} days left`;
        color = 'bg-primary/10 text-primary border-primary/20';
      }
    } else if (subscription?.plan === 'business') {
      if (subscription?.isActive) {
        color = 'bg-green-500/10 text-green-600 border-green-500/20';
        statusLabel = ' - Active';
      } else {
        statusLabel = ' - Inactive';
        color = 'bg-warning/10 text-warning border-warning/20';
      }
    }

    return { label: `${planName}${statusLabel}`, color };
  };

  const planPricing = {
    trial: { price: 0, currency: 'NGN', period: '8 days' },
    business: { price: 5300000, currency: 'NGN', period: '30 days' }
  };
  
  const pricing = planPricing[subscription?.plan as keyof typeof planPricing] || planPricing.trial;
  const currentPlanDisplay = getCurrentPlanDisplay();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view billing</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Billing & Subscription</h1>
            <p className="text-muted-foreground mt-1">
              Manage your subscription and view billing history
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSubscriptionData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-warning/20 bg-warning/5">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription>
              <strong>Error:</strong> {error}
              <Button 
                size="sm" 
                onClick={loadSubscriptionData} 
                variant="outline" 
                className="ml-3"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Trial Expired Alert */}
        {subscription?.isTrialExpired && (
          <Alert className="mb-6 border-destructive/20 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <strong>Trial Expired!</strong> Upgrade to Business to continue.
              <Button 
                size="sm" 
                onClick={handleUpgradeClick} 
                className="ml-3 bg-destructive hover:bg-destructive/90"
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? 'Processing...' : 'Upgrade Now'}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Billing Info Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Billing Information</CardTitle>
                    <CardDescription>Account details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Email</div>
                      <div className="text-sm text-muted-foreground">{user?.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">Account ID</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {user?.id?.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <div className={`${currentPlanDisplay.color} px-3 py-1 text-xs font-medium border rounded-full`}>
                    {currentPlanDisplay.label}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">
                      {subscription?.plan === 'business' ? 'Business Plan' : 'Free Trial'}
                    </CardTitle>
                    <CardDescription>
                      {subscription?.plan === 'business' && subscription?.isActive 
                        ? 'Active subscription'
                        : subscription?.plan === 'trial' && !subscription?.isTrialExpired
                        ? `${subscription?.daysLeft || 0} days remaining`
                        : 'No active subscription'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                  {/* Price */}
                  <div className="text-center p-6 bg-muted/50 rounded-xl">
                    <DollarSign className="h-6 w-6 mx-auto mb-3 text-muted-foreground" />
                    <div className="text-3xl font-bold mb-2">
                      {pricing.price === 0 ? 'Free' : 
                        new Intl.NumberFormat('en-NG', {
                          style: 'currency',
                          currency: 'NGN',
                        }).format(pricing.price / 100)}
                    </div>
                    <div className="text-sm text-muted-foreground">per {pricing.period}</div>
                  </div>
                  
                  {/* Days Left / Next Billing */}
                  {subscription?.plan === 'trial' && !subscription?.isTrialExpired ? (
                    <div className="text-center p-6 bg-primary/5 rounded-xl">
                      <Timer className="h-6 w-6 mx-auto mb-3 text-primary" />
                      <div className="text-3xl font-bold text-primary mb-2">
                        {subscription?.daysLeft || 0}
                      </div>
                      <div className="text-sm text-primary">trial days left</div>
                    </div>
                  ) : subscription?.plan === 'business' && subscription?.isActive ? (
                    <div className="text-center p-6 bg-green-500/5 rounded-xl">
                      <CalendarDays className="h-6 w-6 mx-auto mb-3 text-green-600" />
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {subscription?.nextBillingDate ? 
                          Math.ceil((new Date(subscription.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
                          'Active'}
                      </div>
                      <div className="text-sm text-green-600">
                        {subscription?.nextBillingDate ? 'days until renewal' : 'subscription'}
                      </div>
                    </div>
                  ) : null}

                  {/* Status */}
                  <div className="text-center p-6 bg-purple-500/5 rounded-xl">
                    <Activity className="h-6 w-6 mx-auto mb-3 text-purple-600" />
                    <div className="text-lg font-bold text-purple-600 mb-2 capitalize">
                      {subscription?.isActive ? 'active' : 'inactive'}
                    </div>
                    <div className="text-sm text-purple-600">status</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t flex gap-3">
                  {((subscription?.plan === 'trial' && !subscription?.isTrialExpired) || subscription?.isTrialExpired) && (
                    <Button 
                      onClick={handleUpgradeClick} 
                      className="flex-1"
                      disabled={isProcessingPayment}
                    >
                      {isProcessingPayment ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Crown className="h-5 w-5 mr-2" />
                          Upgrade to Business
                        </>
                      )}
                    </Button>
                  )}
                  
                  {subscription?.plan === 'business' && subscription?.isActive && (
                    <Button 
                      variant="outline" 
                      onClick={handleCancelSubscription}
                      className="border-destructive/20 text-destructive hover:bg-destructive/5"
                    >
                      <X className="h-5 w-5 mr-2" />
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>Payment records</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                    <p className="text-muted-foreground">
                      Your payment history will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((tx) => {
                      const status = getStatusDisplay(tx.status);
                      return (
                        <div key={tx.id} className="p-6 border rounded-lg hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${
                                tx.status === 'success' ? 'bg-green-500/10' : 
                                tx.status === 'pending' ? 'bg-yellow-500/10' : 'bg-red-500/10'
                              }`}>
                                {status.icon}
                              </div>
                              <div>
                                <div className="font-semibold">
                                  {tx.description || 'Subscription Payment'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(tx.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xl font-bold">
                                  {new Intl.NumberFormat('en-NG', {
                                    style: 'currency',
                                    currency: 'NGN',
                                  }).format(tx.amount / 100)}
                                </div>
                                <Badge variant={tx.status === 'success' ? 'default' : 'secondary'}>
                                  {tx.status}
                                </Badge>
                              </div>
                              {tx.status === 'success' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadReceipt(tx)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
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
