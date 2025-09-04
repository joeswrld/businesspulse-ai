import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBillingSystem, getPlanLimits, formatCurrency, formatDate, getPlanDisplayName, getPlanPrice, getPlanPricing } from '@/hooks/useBillingSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Download,
  Calendar,
  Users,
  MessageSquare,
  BarChart3,
  FileText,
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Crown,
  Zap,
  Shield,
  TrendingUp,
  DollarSign,
  Receipt,
  RefreshCw,
  AlertCircle,
  Lock,
  Unlock,
  Star,
  ArrowRight,
  Check,
  X,
  Infinity,
  Play,
  CreditCard,
  CalendarDays,
  Timer,
  Sparkles,
  Target,
  Activity
} from 'lucide-react';
import PaystackPayment from '@/components/PaystackPayment';
import UsageOverview from '@/components/billing/UsageOverview';
import PlanComparison from '@/components/billing/PlanComparison';

type UpgradePlan = 'pro' | 'business' | null;

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
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: <XCircle className="h-4 w-4" />,
        label: 'Trial Expired',
        description: 'Your free trial has ended'
      };
    } else {
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <Clock className="h-4 w-4" />,
        label: 'Free Trial',
        description: 'Enjoying your free trial'
      };
    }
  }
  
  if (isPaymentPastDue) {
    if (isInGracePeriod) {
      return {
        color: 'bg-orange-100 text-orange-800 border-orange-300',
        icon: <AlertTriangle className="h-4 w-4" />,
        label: 'Payment Due',
        description: 'Payment failed - grace period active'
      };
    } else {
      return {
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: <XCircle className="h-4 w-4" />,
        label: 'Payment Failed',
        description: 'Account suspended due to failed payment'
      };
    }
  }
  
  if (billingProfile?.subscription_status === 'active') {
    return {
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: <CheckCircle className="h-4 w-4" />,
      label: 'Active',
      description: 'Subscription is active and up to date'
    };
  }
  
  return {
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: <Clock className="h-4 w-4" />,
    label: 'Inactive',
    description: 'No active subscription'
  };
};

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const {
    billingProfile,
    transactions,
    loading,
    error,
    refreshing,
    currentPlan,
    trialDaysLeft,
    isTrialExpired,
    isSubscriptionActive,
    isPaymentPastDue,
    nextBillingDate,
    isInGracePeriod,
    gracePeriodDaysLeft,
    usagePercentages,
    isLimitReached,
    refreshData,
    cancelSubscription,
    upgradePlan
  } = useBillingSystem();
  
  // State
  const [cancelling, setCancelling] = useState(false);
  const [upgradePlanModal, setUpgradePlanModal] = useState<UpgradePlan>(null);
  const [showConfigError, setShowConfigError] = useState(false);
  const [usageRefreshTrigger, setUsageRefreshTrigger] = useState(0);

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await cancelSubscription();
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

  // Trigger usage refresh when plan changes
  const triggerUsageRefresh = () => {
    setUsageRefreshTrigger(prev => prev + 1);
  };

  // Download transaction receipt
  const downloadReceipt = (transaction: any) => {
    try {
      // Create receipt content
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

      // Create blob and download
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

  // Get current plan display info
  const getCurrentPlanDisplay = () => {
    const planName = getPlanDisplayName(currentPlan);
    let color = 'bg-gray-100 text-gray-800 border-gray-300';
    let statusLabel = '';

    if (currentPlan === 'trial') {
      color = 'bg-blue-100 text-blue-800 border-blue-300';
      if (isTrialExpired) {
        statusLabel = ' - Expired';
      } else {
        statusLabel = ` - ${trialDaysLeft} days left`;
      }
    } else if (currentPlan === 'pro') {
      color = 'bg-green-100 text-green-800 border-green-300';
    } else if (currentPlan === 'business') {
      color = 'bg-amber-100 text-amber-800 border-amber-300';
    }

    if (isPaymentPastDue) {
      if (isInGracePeriod) {
        statusLabel = ` - Payment Due (${gracePeriodDaysLeft} days grace)`;
        color = 'bg-orange-100 text-orange-800 border-orange-300';
      } else {
        statusLabel = ' - Payment Failed';
        color = 'bg-red-100 text-red-800 border-red-300';
      }
    }

    return {
      label: `${planName}${statusLabel}`,
      color
    };
  };

  // Get plan limits
  const planLimits = getPlanLimits(currentPlan);
  const planPricing = getPlanPricing(currentPlan);

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
          <p className="text-muted-foreground">
            Manage your subscription and view usage statistics
          </p>
        </div>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please log in to view your billing information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((j) => (
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
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
          <p className="text-muted-foreground">
            Manage your subscription and view usage statistics
          </p>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }



  // Calculate subscription end date
  const subscriptionEndDate = calculateSubscriptionEndDate(billingProfile, currentPlan);
  const statusDisplay = getSubscriptionStatusDisplay(billingProfile, currentPlan, isTrialExpired, isPaymentPastDue, isInGracePeriod);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
              <p className="text-gray-600 mt-1">
                Manage your subscription, track usage, and view billing history
              </p>
            </div>
          </div>
        </div>

      {/* Paystack Configuration Error Alert */}
      {showConfigError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Payment System Not Configured!</strong> The Paystack payment system is not properly configured.
            <div className="mt-3 space-y-2">
              <p className="text-sm">
                To fix this issue, you need to configure your Paystack public key in the environment variables.
              </p>
              <div className="text-sm space-y-1">
                <p><strong>Steps to fix:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Get your Paystack key from <a href="https://dashboard.paystack.com/settings/developers" target="_blank" rel="noopener noreferrer" className="underline">Paystack Dashboard</a></li>
                  <li>Update the <code className="bg-red-100 px-1 rounded">VITE_PAYSTACK_PUBLIC_KEY</code> in your <code className="bg-red-100 px-1 rounded">.env.local</code> file</li>
                  <li>Restart your development server</li>
                </ol>
              </div>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowConfigError(false)}
                >
                  Dismiss
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open('PAYSTACK_KEY_FIX.md', '_blank')}
                >
                  View Fix Guide
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}



      {/* Critical Alerts */}
      {isTrialExpired && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Trial Expired!</strong> Your free trial has ended. Upgrade to Pro or Business to continue using advanced features.
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => handleUpgradeClick('pro')}>
                Upgrade to Pro
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleUpgradeClick('business')}>
                Upgrade to Business
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

            {isPaymentPastDue && !isInGracePeriod && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Payment Failed!</strong> Your payment method has failed. Please contact support to resolve this issue.
          </AlertDescription>
        </Alert>
      )}

      {isPaymentPastDue && isInGracePeriod && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Payment Due!</strong> Your payment has failed, but you have {gracePeriodDaysLeft} days to resolve this before your account is suspended. Please contact support.
          </AlertDescription>
        </Alert>
      )}

        {/* Current Plan Overview */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {getPlanDisplayName(currentPlan)}
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {statusDisplay.description}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`${statusDisplay.color} px-3 py-1 text-sm font-medium`}>
                  <div className="flex items-center gap-2">
                    {statusDisplay.icon}
                    {statusDisplay.label}
                  </div>
                </Badge>
                {refreshing && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Plan Price */}
              <div className="text-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="h-5 w-5 text-gray-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {planPricing.price === 0 ? 'Free' : formatCurrency(planPricing.price, planPricing.currency)}
                </div>
                <div className="text-sm text-gray-600">per {planPricing.period}</div>
              </div>
              
              {/* Trial Days or Next Billing */}
              {currentPlan === 'trial' && !isTrialExpired && (
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-center mb-2">
                    <Timer className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mb-1">{trialDaysLeft}</div>
                  <div className="text-sm text-blue-600">trial days left</div>
                </div>
              )}
              
              {subscriptionEndDate && currentPlan !== 'trial' && (
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="flex items-center justify-center mb-2">
                    <CalendarDays className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-lg font-bold text-green-900 mb-1">
                    {subscriptionEndDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-green-600">
                    {isPaymentPastDue ? 'Payment Due' : 'Next Billing'}
                  </div>
                </div>
              )}

              {/* Grace Period */}
              {isPaymentPastDue && isInGracePeriod && (
                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                  <div className="flex items-center justify-center mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-2xl font-bold text-orange-900 mb-1">{gracePeriodDaysLeft}</div>
                  <div className="text-sm text-orange-600">grace period days</div>
                </div>
              )}

              {/* Plan Status */}
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <div className="flex items-center justify-center mb-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-lg font-bold text-purple-900 mb-1 capitalize">
                  {billingProfile?.subscription_status || 'trial'}
                </div>
                <div className="text-sm text-purple-600">subscription status</div>
              </div>
            </div>

            {/* Plan Features */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h4 className="text-lg font-semibold text-gray-900">Plan Features</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-white/60 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Download className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-gray-900">Export Formats</span>
                  </div>
                  <p className="text-sm text-gray-600">{planLimits.export.join(', ')}</p>
                </div>
                <div className="p-4 bg-white/60 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900">Support</span>
                  </div>
                  <p className="text-sm text-gray-600">{planLimits.support.join(', ')}</p>
                </div>
                <div className="p-4 bg-white/60 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-gray-900">Data Retention</span>
                  </div>
                  <p className="text-sm text-gray-600">{planLimits.retention}</p>
                </div>
                <div className="p-4 bg-white/60 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-gray-900">Team Members</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {planLimits.teams === -1 ? 'Unlimited' : planLimits.teams}
                  </p>
                </div>
                <div className="p-4 bg-white/60 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Star className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-gray-900">Priority Support</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {currentPlan === 'business' ? 'Yes' : 'No'}
                  </p>
                </div>
                <div className="p-4 bg-white/60 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-gray-900">API Access</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {currentPlan === 'business' ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-4">
                {currentPlan === 'trial' && !isTrialExpired && (
                  <>
                    <Button 
                      onClick={() => handleUpgradeClick('pro')} 
                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Zap className="h-5 w-5 mr-2" />
                      Upgrade to Pro
                    </Button>
                    <Button 
                      onClick={() => handleUpgradeClick('business')} 
                      variant="outline"
                      className="border-2 border-purple-200 text-purple-700 hover:bg-purple-50 px-6 py-3 rounded-lg font-medium transition-all duration-200"
                    >
                      <Crown className="h-5 w-5 mr-2" />
                      Upgrade to Business
                    </Button>
                  </>
                )}
                
                {isSubscriptionActive && (
                  <Button 
                    variant="outline" 
                    onClick={handleCancelSubscription} 
                    disabled={cancelling}
                    className="border-2 border-red-200 text-red-700 hover:bg-red-50 px-6 py-3 rounded-lg font-medium transition-all duration-200"
                  >
                    {cancelling ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <X className="h-5 w-5 mr-2" />}
                    Cancel Subscription
                  </Button>
                )}
                
                {currentPlan === 'pro' && (
                  <Button 
                    onClick={() => handleUpgradeClick('business')} 
                    variant="outline"
                    className="border-2 border-purple-200 text-purple-700 hover:bg-purple-50 px-6 py-3 rounded-lg font-medium transition-all duration-200"
                  >
                    <Crown className="h-5 w-5 mr-2" />
                    Upgrade to Business
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  onClick={refreshData} 
                  disabled={refreshing}
                  className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-6 py-3 rounded-lg font-medium transition-all duration-200"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh Data
                </Button>
              </div>
            </div>
        </CardContent>
      </Card>



      {/* Usage Overview - Real-time counters from source tables */}
      <UsageOverview 
        userId={user?.id || ''}
        onUpgrade={(plan) => handleUpgradeClick(plan)}
        refreshTrigger={usageRefreshTrigger}
      />

      {/* Plan Comparison */}
      <PlanComparison 
        currentPlan={currentPlan}
        onUpgrade={(plan) => handleUpgradeClick(plan)}
      />

        {/* Transaction History */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
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
            {transactions.length === 0 ? (
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
                  return (
                    <div key={transaction.id} className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            transaction.status === 'success' ? 'bg-green-100' : 
                            transaction.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                          }`}>
                            {statusDisplay.icon}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {transaction.description || 'Subscription Payment'}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatDate(transaction.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
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

        {/* Upgrade Plan Modal */}
        {upgradePlanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <PaystackPayment
                plan={upgradePlanModal}
                planName={upgradePlanModal === 'pro' ? 'Pro' : 'Business'}
                planPrice={getPlanPrice(upgradePlanModal)}
                onSuccess={async ({ reference, plan: paidPlan }) => {
                  try {
                    toast.success(`🎉 Welcome to ${upgradePlanModal === 'pro' ? 'Pro' : 'Business'}! Your subscription has been activated.`);
                    setUpgradePlanModal(null);
                    await refreshData();
                    // Trigger usage overview refresh to show new plan limits
                    triggerUsageRefresh();
                  } catch (e: any) {
                    toast.error(e?.message || 'Failed to activate subscription');
                  }
                }}
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