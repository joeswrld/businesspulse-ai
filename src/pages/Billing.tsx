// src/pages/Billing.tsx - WITH BACK BUTTON
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  X,
  ArrowLeft,
} from 'lucide-react';

interface Subscription {
  plan: string;
  isActive: boolean;
  isTrialExpired: boolean;
  isCancelled: boolean;
  daysLeft: number;
  subscriptionId: string | null;
  nextBillingDate: string | null;
  subscriptionStatus: string;
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
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Loading subscription data for user:', user.id);

      // First try to get from billing_profiles directly for faster response
      const { data: directProfile, error: directError } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('📊 Direct profile data:', directProfile);

      // If direct query fails, try RPC
      let profileData = null;
      if (directError || !directProfile) {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_user_profile_with_access', { user_uuid: user.id });

        if (rpcError) {
          console.error('RPC Error:', rpcError);
          throw rpcError;
        }
        profileData = rpcData;
      } else {
        // Convert direct profile to RPC format
        const now = new Date();
        const trialEnd = directProfile.trial_ends_at ? new Date(directProfile.trial_ends_at) : null;
        const hasAccess = directProfile.plan === 'business' && directProfile.subscription_status === 'active'
          || (directProfile.plan === 'trial' && trialEnd && now <= trialEnd);
        
        let daysLeft = 0;
        if (directProfile.plan === 'trial' && trialEnd) {
          daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        } else if (directProfile.next_billing_date) {
          const nextBilling = new Date(directProfile.next_billing_date);
          daysLeft = Math.max(0, Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }

        profileData = [{
          id: directProfile.user_id,
          plan: directProfile.plan,
          subscription_status: directProfile.subscription_status,
          trial_ends_at: directProfile.trial_ends_at,
          next_billing_date: directProfile.next_billing_date,
          has_access: hasAccess,
          days_left: daysLeft,
          paystack_customer_id: directProfile.paystack_customer_code,
          paystack_subscription_id: directProfile.paystack_subscription_code,
        }];
      }

      console.log('📊 Final profile data:', profileData);

      if (!profileData || profileData.length === 0) {
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
          isCancelled: false,
          daysLeft: 8,
          subscriptionId: null,
          nextBillingDate: null,
          subscriptionStatus: 'trial',
        });
      } else {
        const profile = profileData[0];
        const hasAccess = profile.has_access === true;
        const daysLeft = profile.days_left || 0;
        const subscriptionStatus = profile.subscription_status;

        const isTrialExpired = profile.plan === 'trial' && !hasAccess;
        const isCancelled = subscriptionStatus === 'cancelled';
        const isActive = (subscriptionStatus === 'active' || hasAccess) && !isCancelled;

        setSubscription({
          plan: profile.plan,
          isActive,
          isTrialExpired,
          isCancelled,
          daysLeft,
          subscriptionId: profile.paystack_subscription_id || null,
          nextBillingDate: profile.next_billing_date,
          subscriptionStatus,
        });

        console.log('✅ Subscription loaded:', {
          plan: profile.plan,
          status: subscriptionStatus,
          hasAccess,
          isActive,
          isCancelled,
          daysLeft
        });
      }

      const { data: transactionsData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (txError) {
        console.error('Transaction load error:', txError);
        setTransactions([]);
      } else {
        setTransactions(transactionsData || []);
        console.log(`✅ Loaded ${transactionsData?.length || 0} transactions`);
      }

    } catch (error) {
      console.error('❌ Error loading subscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to load subscription data');
      toast.error('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();

    if (user) {
      const channel = supabase
        .channel(`billing-updates-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'billing_profiles',
            filter: `user_id=eq.${user.id}`,
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
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔔 New transaction:', payload);
            loadSubscriptionData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handlePaymentSuccess = (response: any) => {
    console.log('✅ Payment successful:', response);
    
    toast.success('🎉 Payment Successful!', {
      description: 'Activating your subscription...',
      duration: 5000
    });

    setTimeout(async () => {
      try {
        console.log('💾 Recording transaction and updating subscription...');
        
        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user?.id,
            amount: 5300000,
            currency: 'NGN',
            status: 'success',
            description: 'Business Plan Subscription',
            paystack_reference: response.reference,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (txError) {
          console.error('❌ Transaction insert error:', txError);
        } else {
          console.log('✅ Transaction recorded:', txData);
        }

        const { error: profileError } = await supabase
          .from('billing_profiles')
          .update({
            plan: 'business',
            subscription_status: 'active',
            trial_ends_at: null,
            next_billing_date: nextBillingDate.toISOString(),
            paystack_customer_code: response.customer?.customer_code || null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user?.id);

        if (profileError) {
          console.error('❌ Billing profile error:', profileError);
        } else {
          console.log('✅ Billing profile updated');
        }

        const { error: subError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: user?.id,
            plan_code: 'business',
            plan_name: 'Business Plan',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: nextBillingDate.toISOString(),
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (subError) {
          console.error('❌ User subscription error:', subError);
        } else {
          console.log('✅ User subscription updated');
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadSubscriptionData();

        const { data: checkData } = await supabase
          .rpc('get_user_profile_with_access', { user_uuid: user?.id });

        console.log('🔍 Verification result:', checkData);

        if (checkData?.[0]?.plan === 'business' && checkData?.[0]?.subscription_status === 'active') {
          console.log('✅ Subscription successfully activated!');
          
          toast.success('✅ Subscription Activated!', {
            description: 'Welcome to Business Plan! Redirecting...',
            duration: 3000
          });
          
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          console.warn('⚠️ Subscription status not updated as expected:', checkData);
          
          toast.warning('Payment received!', {
            description: 'Please refresh the page to see your updated subscription.',
            duration: 5000,
            action: {
              label: 'Refresh Now',
              onClick: () => window.location.reload()
            }
          });
        }

      } catch (error) {
        console.error('❌ Post-payment error:', error);
        toast.error('Payment successful but activation failed', {
          description: 'Please refresh the page or contact support.',
          duration: 10000,
          action: {
            label: 'Refresh Page',
            onClick: () => window.location.reload()
          }
        });
      } finally {
        setIsProcessingPayment(false);
      }
    }, 500);
  };

  const handlePaymentClose = () => {
    setIsProcessingPayment(false);
    toast.info('Payment Cancelled', {
      description: 'You can try again anytime'
    });
  };

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
        amount: 5300000,
        currency: 'NGN',
        ref: `${Date.now()}-${user?.id}`,
        metadata: {
          user_id: user?.id,
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

  const confirmCancelSubscription = async () => {
    try {
      setIsCancelling(true);
      console.log('🔄 Initiating subscription cancellation...');

      // If there's a Paystack subscription code, call the edge function to cancel with Paystack
      if (subscription?.subscriptionId) {
        console.log('📡 Calling cancel-subscription edge function with ID:', subscription.subscriptionId);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Authentication required');
        }

        const response = await supabase.functions.invoke('cancel-subscription', {
          body: { subscription_id: subscription.subscriptionId }
        });

        if (response.error) {
          console.error('❌ Edge function error:', response.error);
          throw new Error(response.error.message || 'Failed to cancel subscription');
        }

        console.log('✅ Subscription cancelled with Paystack:', response.data);
      } else {
        console.log('⚠️ No subscription ID found, updating database only...');
        
        // No Paystack subscription, just update our database
        const { error: billingError } = await supabase
          .from('billing_profiles')
          .update({ 
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);

        if (billingError) throw billingError;

        const { error: subError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            cancel_at_period_end: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user?.id);

        if (subError) console.warn('Could not update user_subscriptions:', subError);
      }

      toast.success('Subscription cancelled successfully', {
        description: 'You can continue using your plan until the end of the billing period',
        duration: 5000
      });

      setShowCancelDialog(false);
      await loadSubscriptionData();
    } catch (error) {
      console.error('❌ Cancellation error:', error);
      toast.error('Failed to cancel subscription', {
        description: error instanceof Error ? error.message : 'Please try again or contact support',
        duration: 5000
      });
    } finally {
      setIsCancelling(false);
    }
  };

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

  const getCurrentPlanDisplay = () => {
    const planName = subscription?.plan === 'business' ? 'Business Plan' : 'Free Trial';
    let color = 'bg-muted text-muted-foreground border-border';
    let statusLabel = '';

    if (subscription?.isCancelled) {
      statusLabel = ' - Cancelled';
      color = 'bg-destructive/10 text-destructive border-destructive/20';
    } else if (subscription?.plan === 'trial') {
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

  const shouldShowUpgradeButton = () => {
    return (
      (subscription?.plan === 'trial' && !subscription?.isTrialExpired) ||
      subscription?.isTrialExpired ||
      subscription?.isCancelled ||
      (subscription?.plan === 'business' && !subscription?.isActive)
    );
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
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

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

        {subscription?.isCancelled && (
          <Alert className="mb-6 border-orange-500/20 bg-orange-500/5">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-600">
              <strong>Subscription Cancelled</strong> - You can still access features until your billing period ends. Reactivate anytime!
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
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

          <div className="lg:col-span-2 space-y-8">
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
                      {subscription?.isCancelled
                        ? 'Subscription cancelled - Access until billing period ends'
                        : subscription?.plan === 'business' && subscription?.isActive 
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

                  <div className="text-center p-6 bg-purple-500/5 rounded-xl">
                    <Activity className="h-6 w-6 mx-auto mb-3 text-purple-600" />
                    <div className="text-lg font-bold text-purple-600 mb-2 capitalize">
                      {subscription?.isCancelled ? 'cancelled' : subscription?.isActive ? 'active' : 'inactive'}
                    </div>
                    <div className="text-sm text-purple-600">status</div>
                  </div>
                </div>

                <div className="pt-6 border-t flex gap-3">
                  {shouldShowUpgradeButton() && (
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
                          {subscription?.isCancelled ? 'Reactivate Business Plan' : 'Upgrade to Business'}
                        </>
                      )}
                    </Button>
                  )}
                  
                  {subscription?.plan === 'business' && subscription?.isActive && !subscription?.isCancelled && (
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCancelDialog(true)}
                      className="border-destructive/20 text-destructive hover:bg-destructive/5"
                      disabled={isLoading || isCancelling}
                    >
                      <X className="h-5 w-5 mr-2" />
                      {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>Payment records and receipts</CardDescription>
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
                    <Receipt className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                    <p className="text-muted-foreground">
                      Your payment history will appear here once you make your first payment
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
                                <span className={status.color}>{status.icon}</span>
                              </div>
                              <div>
                                <div className="font-semibold">
                                  {tx.description || 'Subscription Payment'}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {new Date(tx.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                                {tx.paystack_reference && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Ref: {tx.paystack_reference}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xl font-bold">
                                  {new Intl.NumberFormat('en-NG', {
                                    style: 'currency',
                                    currency: tx.currency || 'NGN',
                                  }).format(tx.amount / 100)}
                                </div>
                                <Badge 
                                  variant={tx.status === 'success' ? 'default' : 
                                          tx.status === 'pending' ? 'secondary' : 
                                          'destructive'}
                                  className="mt-1"
                                >
                                  {tx.status}
                                </Badge>
                              </div>
                              {tx.status === 'success' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadReceipt(tx)}
                                  title="Download Receipt"
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

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Subscription?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                Are you sure you want to cancel your Business Plan subscription?
              </p>
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <span>You'll continue to have full access until the end of your current billing period</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <span>After that, your account will revert to the free trial limitations</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <span>You can reactivate your subscription anytime</span>
                </div>
              </div>
              <p className="text-sm font-medium">
                This action will cancel future payments but won't issue a refund for the current billing period.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelSubscription}
              disabled={isCancelling}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Yes, Cancel Subscription
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BillingPage;
