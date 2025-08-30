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
  AlertCircle,
  Lock,
  Unlock,
  Star,
  ArrowRight,
  Check,
  X,
  Infinity,
  Play
} from 'lucide-react';
import PaystackPayment from '@/components/PaystackPayment';
import UsageTracker from '@/components/billing/UsageTracker';
import PlanComparison from '@/components/billing/PlanComparison';

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
    isInGracePeriod,
    gracePeriodDaysLeft,
    usagePercentages,
    isLimitReached,
    refreshData,
    cancelSubscription,
    updatePaymentMethod,
    upgradePlan,
    reactivateSubscription
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

  // Handle subscription reactivation
  const handleReactivateSubscription = async () => {
    try {
      await reactivateSubscription();
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
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

  // Check if we have any billing data
  const hasBillingData = billingProfile || transactions.length > 0 || usageData;
  
  // If no billing data and no error, show a helpful message
  if (!hasBillingData && !loading && !error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
          <p className="text-muted-foreground">
            Manage your subscription and view usage statistics
          </p>
        </div>
        
        <div className="space-y-8">
          {/* Welcome Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Star className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Welcome to NoteX! 🎉</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              You're starting your journey with a <strong>free 8-day trial</strong>. 
              Explore all our features and see how NoteX can transform your feedback collection.
            </p>
          </div>

          {/* Trial Benefits Card */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Zap className="h-6 w-6 text-blue-600" />
                Your Free Trial Benefits
              </CardTitle>
              <CardDescription className="text-lg">
                Full access to NoteX features for 8 days - no credit card required!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-green-700">✅ What's Included:</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">50 Feedback Submissions</span>
                        <p className="text-sm text-muted-foreground">Collect customer feedback and insights</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">5 AI Insights</span>
                        <p className="text-sm text-muted-foreground">AI-powered business intelligence</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">5 Analytics Reports</span>
                        <p className="text-sm text-muted-foreground">Data-driven insights and trends</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">2 Detailed Reports</span>
                        <p className="text-sm text-muted-foreground">Comprehensive business analysis</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">1 Team Member</span>
                        <p className="text-sm text-muted-foreground">Collaborate with your team</p>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-blue-700">🚀 After Trial:</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">Pro Plan - ₦35,000/month</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• 300 feedback submissions (6x increase)</li>
                        <li>• 50 AI insights (10x increase)</li>
                        <li>• 100 analytics reports (20x increase)</li>
                        <li>• PDF & Excel export</li>
                        <li>• Email + Chat support</li>
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2">Business Plan - ₦53,000/month</h4>
                      <ul className="text-sm text-amber-800 space-y-1">
                        <li>• Unlimited usage across all features</li>
                        <li>• Priority phone support</li>
                        <li>• API access & custom integrations</li>
                        <li>• Predictive analytics</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="text-center p-6">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Play className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Start Using NoteX</h3>
              <p className="text-muted-foreground mb-4">
                Begin collecting feedback and generating insights right away. Your trial is active now!
              </p>
              <Button className="w-full" onClick={() => window.location.href = '/dashboard'}>
                Go to Dashboard
              </Button>
            </Card>

            <Card className="text-center p-6">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Crown className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Upgrade Early</h3>
              <p className="text-muted-foreground mb-4">
                Love what you see? Upgrade anytime during your trial to unlock unlimited features.
              </p>
              <div className="space-y-2">
                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setUpgradePlanModal('pro')}>
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
                <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => setUpgradePlanModal('business')}>
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Business
                </Button>
              </div>
            </Card>
          </div>

          {/* Trial Status */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">Trial Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="h-12 w-12 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {trialDaysLeft} Days Remaining
                  </p>
                  <p className="text-muted-foreground">
                    Your trial started today and will end on {new Date(Date.now() + (trialDaysLeft * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex justify-center">
                  <Progress value={((8 - trialDaysLeft) / 8) * 100} className="w-64 h-2" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {8 - trialDaysLeft} of 8 days used
                </p>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">What happens when my trial ends?</h4>
                  <p className="text-sm text-muted-foreground">
                    You'll need to upgrade to Pro or Business to continue using advanced features. No automatic charges - you decide when to upgrade.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Can I upgrade during my trial?</h4>
                  <p className="text-sm text-muted-foreground">
                    Absolutely! You can upgrade anytime during your trial. Your billing cycle will start from the upgrade date.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Is my data safe?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes! Your data is secure and will be preserved even after the trial ends. Upgrade anytime to continue accessing it.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
        <p className="text-muted-foreground">
          Manage your subscription and view usage statistics
        </p>
      </div>

      {/* Critical Alerts */}
      {isTrialExpired && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Trial Expired!</strong> Your free trial has ended. Upgrade to Pro or Business to continue using advanced features.
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => setUpgradePlanModal('pro')}>
                Upgrade to Pro
              </Button>
              <Button size="sm" variant="outline" onClick={() => setUpgradePlanModal('business')}>
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
            <strong>Payment Failed!</strong> Your payment method has failed. Update your payment method to avoid account suspension.
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={handleUpdateCard}>
                Update Payment Method
              </Button>
              <Button size="sm" variant="outline" onClick={handleReactivateSubscription}>
                Reactivate Subscription
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isPaymentPastDue && isInGracePeriod && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Payment Due!</strong> Your payment has failed, but you have {gracePeriodDaysLeft} days to update your payment method before your account is suspended.
            <div className="mt-3">
              <Button size="sm" onClick={handleUpdateCard}>
                Update Payment Method
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your current subscription and billing status
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getCurrentPlanDisplay().color}>
                {getCurrentPlanDisplay().label}
              </Badge>
              {refreshing && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {planPricing.price === 0 ? 'Free' : formatCurrency(planPricing.price, planPricing.currency)}
              </div>
              <div className="text-sm text-gray-600">per {planPricing.period}</div>
            </div>
            
            {currentPlan === 'trial' && !isTrialExpired && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">{trialDaysLeft}</div>
                <div className="text-sm text-blue-600">trial days left</div>
              </div>
            )}
            
            {nextBillingDate && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {formatDate(nextBillingDate)}
                </div>
                <div className="text-sm text-gray-600">Next billing</div>
              </div>
            )}
          </div>

          {/* Plan Features */}
          <div className="mt-6">
            <h4 className="font-semibold mb-3">Plan Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Export: {planLimits.export.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Support: {planLimits.support.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Data Retention: {planLimits.retention}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Teams: {planLimits.teams === -1 ? 'Unlimited' : planLimits.teams}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Priority Support: {currentPlan === 'business' ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>API Access: {currentPlan === 'business' ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            {currentPlan === 'trial' && !isTrialExpired && (
              <>
                <Button onClick={() => setUpgradePlanModal('pro')} className="bg-green-600 hover:bg-green-700">
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
                <Button onClick={() => setUpgradePlanModal('business')} variant="outline">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Business
                </Button>
              </>
            )}
            
            {isSubscriptionActive && (
              <Button variant="outline" onClick={handleUpdateCard}>
                <CreditCard className="h-4 w-4 mr-2" />
                Update Payment Method
              </Button>
            )}
            
            {isSubscriptionActive && (
              <Button variant="outline" onClick={handleCancelSubscription} disabled={cancelling}>
                {cancelling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                Cancel Subscription
              </Button>
            )}
            
            {currentPlan === 'pro' && (
              <Button onClick={() => setUpgradePlanModal('business')} variant="outline">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Business
              </Button>
            )}
            
            <Button variant="ghost" onClick={refreshData} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tracking */}
      {usageData && (
        <UsageTracker 
          usageData={usageData}
          planLimits={planLimits}
          currentPlan={currentPlan}
          onUpgrade={(plan) => setUpgradePlanModal(plan)}
        />
      )}

      {/* Plan Comparison */}
      <PlanComparison 
        currentPlan={currentPlan}
        onUpgrade={(plan) => setUpgradePlanModal(plan)}
      />

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>
            Your payment and subscription history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
                        <span className="font-medium">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusDisplay.icon}
                          <Badge 
                            variant={transaction.status === 'success' ? 'default' : 
                                   transaction.status === 'pending' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </Badge>
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

      {/* Upgrade Plan Modal */}
      {upgradePlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <PaystackPayment
              plan={upgradePlanModal}
              planName={upgradePlanModal === 'pro' ? 'Pro' : 'Business'}
              planPrice={getPlanPrice(upgradePlanModal)}
              onSuccess={async ({ reference, plan: paidPlan }) => {
                try {
                  toast.success(`🎉 Welcome to ${upgradePlanModal === 'pro' ? 'Pro' : 'Business'}! Your subscription has been activated.`);
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
      )}
    </div>
  );
};

export default BillingPage;