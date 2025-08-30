import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBillingSystem, getPlanLimits, formatCurrency, formatDate, getPlanDisplayName, getPlanPrice } from '@/hooks/useBillingSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  CreditCard,
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
  ExternalLink,
  Loader2,
  Crown,
  Zap,
  Shield,
  TrendingUp,
  DollarSign,
  Receipt,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import PaystackPayment from '@/components/PaystackPayment';

type UpgradePlan = 'pro' | 'business' | null;

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const {
    billingProfile,
    transactions,
    usageData,
    loading,
    error,
    refreshing,
    currentPlan,
    trialDaysLeft,
    isTrialExpired,
    isSubscriptionActive,
    isPaymentPastDue,
    nextBillingDate,
    refreshData,
    cancelSubscription,
    updatePaymentMethod,
    upgradePlan
  } = useBillingSystem();
  
  // State
  const [cancelling, setCancelling] = useState(false);
  const [updatingCard, setUpdatingCard] = useState(false);
  const [upgradePlanModal, setUpgradePlanModal] = useState<UpgradePlan>(null);

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await cancelSubscription();
    } finally {
      setCancelling(false);
    }
  };

  // Handle payment method update
  const handleUpdateCard = async () => {
    setUpdatingCard(true);
    try {
      await updatePaymentMethod();
    } finally {
      setUpdatingCard(false);
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
      }
    } else if (currentPlan === 'pro') {
      color = 'bg-green-100 text-green-800 border-green-300';
    } else if (currentPlan === 'business') {
      color = 'bg-amber-100 text-amber-800 border-amber-300';
    }

    if (isPaymentPastDue) {
      statusLabel = ' - Payment Due';
      color = 'bg-red-100 text-red-800 border-red-300';
    }

    return {
      label: `${planName}${statusLabel}`,
      color
    };
  };

  // Get plan limits
  const planLimits = getPlanLimits(currentPlan);

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
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Past Due Alert */}
      {isPaymentPastDue && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your payment has failed. Please update your payment method to continue using premium features.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={handleUpdateCard}
            >
              Update Payment Method
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Trial Expired Alert */}
      {isTrialExpired && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your free trial has expired. Upgrade to continue using all features.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => setUpgradePlanModal('pro')}
            >
              Upgrade Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Upgrade Plan Modal */}
      {upgradePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="font-semibold">Upgrade Subscription</div>
              <button 
                className="text-sm text-muted-foreground hover:text-foreground" 
                onClick={() => setUpgradePlanModal(null)}
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <PaystackPayment
                plan={upgradePlanModal}
                planName={upgradePlanModal === 'pro' ? 'Pro' : 'Business'}
                planPrice={getPlanPrice(upgradePlanModal)}
                onSuccess={async ({ reference, plan: paidPlan }) => {
                  try {
                    toast.success('Subscription activated successfully!');
                    setUpgradePlanModal(null);
                    await refreshData();
                  } catch (e: any) {
                    toast.error(e?.message || 'Failed to activate subscription');
                  }
                }}
                onCancel={() => setUpgradePlanModal(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
          <p className="text-muted-foreground">
            Manage your subscription and view usage statistics
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={refreshing}
          className="flex items-center space-x-2"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>Refresh</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Current Usage Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Current Usage</span>
            </CardTitle>
            <CardDescription>
              Track your feature usage across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Feedback Usage */}
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                (() => {
                  const limitVal = planLimits.feedback;
                  const current = usageData?.feedback_count || 0;
                  const over = limitVal !== -1 && current >= limitVal;
                  return over ? 'bg-red-50 border border-red-200' : 'bg-blue-50';
                })()
              }`}>
                <div className="flex items-center space-x-2">
                  <MessageSquare className={`h-5 w-5 ${
                    (() => {
                      const limitVal = planLimits.feedback;
                      const current = usageData?.feedback_count || 0;
                      const over = limitVal !== -1 && current >= limitVal;
                      return over ? 'text-red-600' : 'text-blue-600';
                    })()
                  }`} />
                  <div>
                    <p className="text-sm font-medium">Feedback</p>
                    <p className="text-xs text-muted-foreground">
                      {currentPlan === 'trial' && '50 submissions / 8 days (Free Trial)'}
                      {currentPlan === 'free' && '10 submissions / 30 days (Free Plan)'}
                      {currentPlan === 'pro' && '300 submissions / 30 days (Pro Plan)'}
                      {currentPlan === 'business' && 'Unlimited submissions (Business Plan)'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    (() => {
                      const limitVal = planLimits.feedback;
                      const current = usageData?.feedback_count || 0;
                      const over = limitVal !== -1 && current >= limitVal;
                      return over ? 'text-red-600' : 'text-blue-600';
                    })()
                  }`}>
                    {(() => {
                      const limitVal = planLimits.feedback;
                      const current = usageData?.feedback_count || 0;
                      return limitVal === -1 ? current : Math.min(current, limitVal);
                    })()}
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    {planLimits.feedback === -1 ? 'Unlimited' : `/${planLimits.feedback}`}
                  </span>
                  {(() => {
                    const limitVal = planLimits.feedback;
                    const current = usageData?.feedback_count || 0;
                    const over = limitVal !== -1 && current >= limitVal;
                    return over ? (<div className="text-xs text-red-600 mt-1">Limit Reached</div>) : null;
                  })()}
                </div>
              </div>

              {/* Analytics Usage */}
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                (() => {
                  const limitVal = planLimits.analytics;
                  const current = usageData?.analytics_count || 0;
                  const canUse = limitVal === -1 || current < limitVal;
                  return canUse ? 'bg-green-50' : 'bg-red-50 border border-red-200';
                })()
              }`}>
                <div className="flex items-center space-x-2">
                  <BarChart3 className={`h-5 w-5 ${
                    (() => {
                      const limitVal = planLimits.analytics;
                      const current = usageData?.analytics_count || 0;
                      const canUse = limitVal === -1 || current < limitVal;
                      return canUse ? 'text-green-600' : 'text-red-600';
                    })()
                  }`} />
                  <div>
                    <p className="text-sm font-medium">Analytics</p>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const limitVal = planLimits.analytics;
                        const current = usageData?.analytics_count || 0;
                        return limitVal === -1 ? `${current} (Unlimited)` : `${current} / ${limitVal}`;
                      })()} ({getPlanDisplayName(currentPlan)})
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    (() => {
                      const limitVal = planLimits.analytics;
                      const current = usageData?.analytics_count || 0;
                      const canUse = limitVal === -1 || current < limitVal;
                      return canUse ? 'text-green-600' : 'text-red-600';
                    })()
                  }`}>
                    {usageData?.analytics_count || 0}
                  </span>
                  {(() => {
                    const limitVal = planLimits.analytics;
                    const current = usageData?.analytics_count || 0;
                    const canUse = limitVal === -1 || current < limitVal;
                    return !canUse ? (<div className="text-xs text-red-600 mt-1">Limit Reached</div>) : null;
                  })()}
                </div>
              </div>

              {/* Reports Usage */}
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                (() => {
                  const limitVal = planLimits.reports;
                  const current = usageData?.reports_count || 0;
                  const canUse = limitVal === -1 || current < limitVal;
                  return canUse ? 'bg-purple-50' : 'bg-red-50 border border-red-200';
                })()
              }`}>
                <div className="flex items-center space-x-2">
                  <FileText className={`h-5 w-5 ${
                    (() => {
                      const limitVal = planLimits.reports;
                      const current = usageData?.reports_count || 0;
                      const canUse = limitVal === -1 || current < limitVal;
                      return canUse ? 'text-purple-600' : 'text-red-600';
                    })()
                  }`} />
                  <div>
                    <p className="text-sm font-medium">Reports</p>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const limitVal = planLimits.reports;
                        const current = usageData?.reports_count || 0;
                        return limitVal === -1 ? `${current} (Unlimited)` : `${current} / ${limitVal}`;
                      })()} ({getPlanDisplayName(currentPlan)})
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    (() => {
                      const limitVal = planLimits.reports;
                      const current = usageData?.reports_count || 0;
                      const canUse = limitVal === -1 || current < limitVal;
                      return canUse ? 'text-purple-600' : 'text-red-600';
                    })()
                  }`}>
                    {usageData?.reports_count || 0}
                  </span>
                  {(() => {
                    const limitVal = planLimits.reports;
                    const current = usageData?.reports_count || 0;
                    const canUse = limitVal === -1 || current < limitVal;
                    return !canUse ? (<div className="text-xs text-red-600 mt-1">Limit Reached</div>) : null;
                  })()}
                </div>
              </div>

              {/* Insights Usage */}
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                (() => {
                  const limitVal = planLimits.insights;
                  const current = usageData?.insights_count || 0;
                  const canUse = limitVal === -1 || current < limitVal;
                  return canUse ? 'bg-orange-50' : 'bg-red-50 border border-red-200';
                })()
              }`}>
                <div className="flex items-center space-x-2">
                  <Brain className={`h-5 w-5 ${
                    (() => {
                      const limitVal = planLimits.insights;
                      const current = usageData?.insights_count || 0;
                      const canUse = limitVal === -1 || current < limitVal;
                      return canUse ? 'text-orange-600' : 'text-red-600';
                    })()
                  }`} />
                  <div>
                    <p className="text-sm font-medium">Insights</p>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const limitVal = planLimits.insights;
                        const current = usageData?.insights_count || 0;
                        return limitVal === -1 ? `${current} (Unlimited)` : `${current} / ${limitVal}`;
                      })()} ({getPlanDisplayName(currentPlan)})
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    (() => {
                      const limitVal = planLimits.insights;
                      const current = usageData?.insights_count || 0;
                      const canUse = limitVal === -1 || current < limitVal;
                      return canUse ? 'text-orange-600' : 'text-red-600';
                    })()
                  }`}>
                    {usageData?.insights_count || 0}
                  </span>
                  {(() => {
                    const limitVal = planLimits.insights;
                    const current = usageData?.insights_count || 0;
                    const canUse = limitVal === -1 || current < limitVal;
                    return !canUse ? (<div className="text-xs text-red-600 mt-1">Limit Reached</div>) : null;
                  })()}
                </div>
              </div>

              {/* Teams Usage */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-60">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium">Teams</p>
                    <p className="text-xs text-muted-foreground">Coming Soon</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-600">
                    {usageData?.teams_count || 0}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    Soon
                  </Badge>
                </div>
              </div>
              
              {/* Usage Summary */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">Current Plan: {getPlanDisplayName(currentPlan)}</h4>
                    <p className="text-sm text-blue-700">
                      {(() => {
                        const limits = [planLimits.feedback, planLimits.analytics, planLimits.reports, planLimits.insights];
                        const usages = [usageData?.feedback_count || 0, usageData?.analytics_count || 0, usageData?.reports_count || 0, usageData?.insights_count || 0];
                        const hasReachedLimit = limits.some((limit, index) => limit !== -1 && usages[index] >= limit);
                        return hasReachedLimit 
                          ? 'Some features have reached their limits. Consider upgrading your plan.'
                          : 'All features are within your plan limits.';
                      })()}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Feedback Widget: {usageData?.feedback_count || 0} submissions in current period
                      {planLimits.feedback !== -1 && ` (${Math.max(0, planLimits.feedback - (usageData?.feedback_count || 0))} remaining)`}
                    </p>
                  </div>
                  {(() => {
                    const limits = [planLimits.feedback, planLimits.analytics, planLimits.reports, planLimits.insights];
                    const usages = [usageData?.feedback_count || 0, usageData?.analytics_count || 0, usageData?.reports_count || 0, usageData?.insights_count || 0];
                    const hasReachedLimit = limits.some((limit, index) => limit !== -1 && usages[index] >= limit);
                    return hasReachedLimit ? (
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => setUpgradePlanModal('pro')}
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade Plan
                      </Button>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Plan Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Current Plan</span>
            </CardTitle>
            <CardDescription>
              Your subscription details and billing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plan Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plan</span>
              <Badge className={getCurrentPlanDisplay().color}>
                {getCurrentPlanDisplay().label}
              </Badge>
            </div>

            {/* Trial Info */}
            {trialDaysLeft > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trial Days Left</span>
                  <span className="text-sm text-blue-600 font-medium">
                    {trialDaysLeft} days
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trial Ends</span>
                  <span className="text-sm text-muted-foreground">
                    {billingProfile?.trial_ends_at ? formatDate(billingProfile.trial_ends_at) : 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {/* Next Billing Date */}
            {nextBillingDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Next Billing</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(nextBillingDate)}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              {isSubscriptionActive && (
                <Button
                  variant="outline"
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className="w-full"
                >
                  {cancelling ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Cancel Subscription
                </Button>
              )}

              {billingProfile?.paystack_customer_id && (
                <Button
                  variant="outline"
                  onClick={handleUpdateCard}
                  disabled={updatingCard}
                  className="w-full"
                >
                  {updatingCard ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Update Card
                </Button>
              )}

              {!isSubscriptionActive && (isTrialExpired || currentPlan === 'free') && (
                <div className="space-y-2">
                  <Button className="w-full" onClick={() => setUpgradePlanModal('pro')}>
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setUpgradePlanModal('business')}>
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade to Business
                  </Button>
                </div>
              )}

              {isSubscriptionActive && currentPlan === 'pro' && (
                <Button variant="outline" className="w-full" onClick={() => setUpgradePlanModal('business')}>
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to Business
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="h-5 w-5" />
            <span>Transaction History</span>
          </CardTitle>
          <CardDescription>
            View your payment history and download invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
              <p className="text-muted-foreground">
                Your transaction history will appear here once you make your first payment.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const statusDisplay = getStatusDisplay(transaction.status);
                  
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">
                        {formatDate(transaction.created_at)}
                      </TableCell>
                      <TableCell>
                        {transaction.description || 'Subscription Payment'}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className={statusDisplay.color}>
                            {statusDisplay.icon}
                          </span>
                          <span className="capitalize">{transaction.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {transaction.paystack_reference && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://dashboard.paystack.com/#/transactions/${transaction.paystack_reference}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingPage;