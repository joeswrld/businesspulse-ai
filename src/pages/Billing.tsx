import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUsageEnforcement } from '@/hooks/useUsageEnforcement';
import { formatUsageDisplay, PLAN_LIMITS, PLAN_NAMES } from '@/lib/usageEnforcement';
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
  RefreshCw
} from 'lucide-react';

// Types
interface UsageData {
  id: string;
  user_id: string;
  feedback_count: number;
  analytics_count: number;
  reports_count: number;
  insights_count: number;
  teams_count: number;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'success' | 'pending' | 'failed';
  created_at: string;
  invoice_url?: string;
  description?: string;
}

interface Subscription {
  id: string;
  status: 'active' | 'trialing' | 'cancelled' | 'past_due';
  current_period_start: string;
  current_period_end: string;
  trial_start?: string;
  trial_end?: string;
  plan_id: string;
  paystack_subscription_code?: string;
  paystack_token?: string;
}

type PlanType = 'free' | 'pro' | 'business' | 'enterprise';

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const {
    loading: usageLoading,
    error: usageError,
    usage: usageData,
    subscription,
    plan,
    limits,
    checks,
    refreshUsage
  } = useUsageEnforcement();
  
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [updatingCard, setUpdatingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeFeedbackCount, setRealtimeFeedbackCount] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // Load data on component mount and when user changes
  useEffect(() => {
    if (user) {
      loadBillingData();
    }
  }, [user]);

  // Set up real-time subscription for usage updates
  useEffect(() => {
    if (!user) return;

    // Subscribe to usage_tracking changes
    const usageChannel = supabase
      .channel('usage-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usage_tracking',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Usage data changed:', payload);
          // Refresh usage data when changes occur
          loadBillingData(true);
        }
      )
      .subscribe();

    // Subscribe to transaction changes
    const transactionChannel = supabase
      .channel('transaction-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Transaction data changed:', payload);
          // Refresh transaction data when changes occur
          loadBillingData(true);
        }
      )
      .subscribe();

    // Subscribe to subscription changes
    const subscriptionChannel = supabase
      .channel('subscription-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Subscription data changed:', payload);
          // Refresh subscription data when changes occur
          loadBillingData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(usageChannel);
      supabase.removeChannel(transactionChannel);
      supabase.removeChannel(subscriptionChannel);
    };
  }, [user]);

  // Load project id and subscribe to feedback count in real-time
  useEffect(() => {
    if (!user) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // fetch latest project_id from feedback_settings
      const { data: settings } = await supabase
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const pid = settings && settings.length > 0 ? settings[0].project_id : null;
      setProjectId(pid);

      if (!pid) return;

      // compute initial count within window
      const computeCount = async () => {
        const now = new Date();
        const planType = plan;
        const windowDays = planType === 'free' ? 8 : (planType === 'pro' ? 30 : 30);
        const fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - windowDays);

        const { count } = await supabase
          .from('feedbacks')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', pid)
          .gte('timestamp', fromDate.toISOString());

        setRealtimeFeedbackCount(count || 0);
      };

      await computeCount();

      channel = supabase
        .channel(`feedbacks-${pid}-billing`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'feedbacks', filter: `project_id=eq.${pid}` },
          () => {
            computeCount();
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, plan]);

  const loadBillingData = async (isRefresh = false) => {
    if (!user) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Refresh usage data using the hook
      await refreshUsage();

      // Load transactions from transactions table
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, amount, currency, status, created_at, invoice_url, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Error loading transactions:', transactionsError);
        toast.error('Failed to load transaction history');
      } else {
        setTransactions(transactionsData || []);
      }

    } catch (err) {
      console.error('Error loading billing data:', err);
      setError('Failed to load billing information');
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate trial days left
  const getTrialDaysLeft = (): number => {
    if (!user?.created_at) return 0;
    
    const trialEnd = new Date(user.created_at);
    trialEnd.setDate(trialEnd.getDate() + 8); // 8-day trial
    
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  // Get current plan
  const getCurrentPlan = (): { type: PlanType; label: string; color: string } => {
    if (subscription) {
      // Check plan type based on plan_id or metadata
      const planId = subscription.plan_id?.toLowerCase() || '';
      
      // Determine plan type and status
      let planType: PlanType = 'pro';
      let statusLabel = '';
      
      if (planId.includes('business')) {
        planType = 'business';
      } else if (planId.includes('enterprise')) {
        planType = 'enterprise';
      } else if (planId.includes('pro') || planId.includes('premium')) {
        planType = 'pro';
      } else {
        planType = 'free';
      }
      
      // Add status to label
      switch (subscription.status) {
        case 'active':
          statusLabel = '';
          break;
        case 'trialing':
          statusLabel = ' Trial';
          break;
        case 'cancelled':
          return { type: 'free', label: 'Free Plan', color: 'bg-gray-100 text-gray-800' };
        case 'past_due':
          statusLabel = ' - Payment Due';
          break;
        default:
          return { type: 'free', label: 'Free Plan', color: 'bg-gray-100 text-gray-800' };
      }
      
      // Return plan with appropriate color
      switch (planType) {
        case 'business':
          return { 
            type: 'business', 
            label: `Business Plan${statusLabel}`, 
            color: 'bg-amber-100 text-amber-800 border-amber-300' 
          };
        case 'enterprise':
          return { 
            type: 'enterprise', 
            label: `Enterprise Plan${statusLabel}`, 
            color: 'bg-purple-100 text-purple-800 border-purple-300' 
          };
        case 'pro':
          return { 
            type: 'pro', 
            label: `Pro Plan${statusLabel}`, 
            color: 'bg-green-100 text-green-800 border-green-300' 
          };
        default:
          return { 
            type: 'free', 
            label: `Free Plan${statusLabel}`, 
            color: 'bg-gray-100 text-gray-800 border-gray-300' 
          };
      }
    }
    
    // Check if user is in trial period
    const trialDaysLeft = getTrialDaysLeft();
    if (trialDaysLeft > 0) {
      return { type: 'free', label: 'Free Trial', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    
    return { type: 'free', label: 'Free Plan', color: 'bg-gray-100 text-gray-800 border-gray-300' };
  };

  // Cancel subscription
  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setCancelling(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      toast.success('Subscription cancelled successfully');
      await loadBillingData(true); // Refresh data
      
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  // Update payment method
  const handleUpdateCard = async () => {
    if (!subscription) return;

    setUpdatingCard(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/paystack/update-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate update link');
      }

      if (result.url) {
        window.open(result.url, '_blank');
        toast.success('Payment method update page opened');
      } else {
        throw new Error('No update URL received');
      }
      
    } catch (err) {
      console.error('Error updating card:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update payment method');
    } finally {
      setUpdatingCard(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Convert from kobo to naira
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

  // Download invoice
  const handleDownloadInvoice = async (transactionId: string, invoiceUrl?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Option 1: Use the API route to get the invoice URL
      const response = await fetch(`/api/invoice/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to get invoice');
      }

      const result = await response.json();
      
      if (result.invoice_url) {
        // Open the invoice URL in a new tab
        window.open(result.invoice_url, '_blank');
        toast.success('Invoice opened in new tab');
      } else {
        throw new Error('No invoice URL received');
      }
      
    } catch (err) {
      console.error('Error downloading invoice:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to download invoice');
    }
  };

  // Refresh data
  const handleRefresh = () => {
    loadBillingData(true);
  };

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

  const currentPlan = getCurrentPlan();
  const trialDaysLeft = getTrialDaysLeft();

  return (
    <div className="space-y-6">
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
          onClick={handleRefresh}
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
                  const limitVal = checks.feedback.limit;
                  const current = realtimeFeedbackCount ?? checks.feedback.currentUsage;
                  const over = limitVal !== -1 && current >= limitVal;
                  return over ? 'bg-red-50 border border-red-200' : 'bg-blue-50';
                })()
              }`}>
                <div className="flex items-center space-x-2">
                  <MessageSquare className={`h-5 w-5 ${
                    (() => {
                      const limitVal = checks.feedback.limit;
                      const current = realtimeFeedbackCount ?? checks.feedback.currentUsage;
                      const over = limitVal !== -1 && current >= limitVal;
                      return over ? 'text-red-600' : 'text-blue-600';
                    })()
                  }`} />
                  <div>
                    <p className="text-sm font-medium">Feedback</p>
                    <p className="text-xs text-muted-foreground">
                      {plan === 'free' && '50 submissions / 8 days (Free Trial)'}
                      {plan === 'pro' && '300 submissions / 30 days (Pro Plan)'}
                      {plan === 'business' && 'Unlimited submissions / 30 days (Business Plan)'}
                      {plan === 'enterprise' && 'Unlimited submissions (Enterprise Plan)'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    (() => {
                      const limitVal = checks.feedback.limit;
                      const current = realtimeFeedbackCount ?? checks.feedback.currentUsage;
                      const over = limitVal !== -1 && current >= limitVal;
                      return over ? 'text-red-600' : 'text-blue-600';
                    })()
                  }`}>
                    {(() => {
                      const limitVal = checks.feedback.limit;
                      const current = realtimeFeedbackCount ?? checks.feedback.currentUsage;
                      return limitVal === -1 ? current : Math.min(current, limitVal);
                    })()}
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    {checks.feedback.limit === -1 ? 'Unlimited' : `/${checks.feedback.limit}`}
                  </span>
                  {(() => {
                    const limitVal = checks.feedback.limit;
                    const current = realtimeFeedbackCount ?? checks.feedback.currentUsage;
                    const over = limitVal !== -1 && current >= limitVal;
                    return over ? (<div className="text-xs text-red-600 mt-1">Limit Reached</div>) : null;
                  })()}
                </div>
              </div>

              {/* Analytics Usage */}
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                checks.analytics.canUse ? 'bg-green-50' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <BarChart3 className={`h-5 w-5 ${
                    checks.analytics.canUse ? 'text-green-600' : 'text-red-600'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">Analytics</p>
                    <p className="text-xs text-muted-foreground">
                      {formatUsageDisplay(
                        checks.analytics.currentUsage,
                        checks.analytics.limit,
                        plan,
                        'analytics'
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    checks.analytics.canUse ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {checks.analytics.currentUsage}
                  </span>
                  {!checks.analytics.canUse && (
                    <div className="text-xs text-red-600 mt-1">Limit Reached</div>
                  )}
                </div>
              </div>

              {/* Reports Usage */}
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                checks.reports.canUse ? 'bg-purple-50' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <FileText className={`h-5 w-5 ${
                    checks.reports.canUse ? 'text-purple-600' : 'text-red-600'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">Reports</p>
                    <p className="text-xs text-muted-foreground">
                      {formatUsageDisplay(
                        checks.reports.currentUsage,
                        checks.reports.limit,
                        plan,
                        'reports'
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    checks.reports.canUse ? 'text-purple-600' : 'text-red-600'
                  }`}>
                    {checks.reports.currentUsage}
                  </span>
                  {!checks.reports.canUse && (
                    <div className="text-xs text-red-600 mt-1">Limit Reached</div>
                  )}
                </div>
              </div>

              {/* Insights Usage */}
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                checks.insights.canUse ? 'bg-orange-50' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <Brain className={`h-5 w-5 ${
                    checks.insights.canUse ? 'text-orange-600' : 'text-red-600'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">Insights</p>
                    <p className="text-xs text-muted-foreground">
                      {formatUsageDisplay(
                        checks.insights.currentUsage,
                        checks.insights.limit,
                        plan,
                        'insights'
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    checks.insights.canUse ? 'text-orange-600' : 'text-red-600'
                  }`}>
                    {checks.insights.currentUsage}
                  </span>
                  {!checks.insights.canUse && (
                    <div className="text-xs text-red-600 mt-1">Limit Reached</div>
                  )}
                </div>
              </div>

              {/* Teams Usage (Coming Soon) */}
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
                    <h4 className="font-medium text-blue-900">Current Plan: {PLAN_NAMES[plan]}</h4>
                    <p className="text-sm text-blue-700">
                      {Object.values(checks).some(check => !check.canUse) 
                        ? 'Some features have reached their limits. Consider upgrading your plan.'
                        : 'All features are within your plan limits.'
                      }
                    </p>
                    {checks.feedback && (
                      <p className="text-xs text-blue-600 mt-1">
                        Feedback Widget: {realtimeFeedbackCount ?? checks.feedback.currentUsage} submissions in current period
                        {checks.feedback.limit !== -1 && ` (${Math.max(0, (checks.feedback.limit) - (realtimeFeedbackCount ?? checks.feedback.currentUsage))} remaining)`}
                      </p>
                    )}
                  </div>
                  {Object.values(checks).some(check => !check.canUse) && (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  )}
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
              <Badge className={currentPlan.color}>
                {currentPlan.label}
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
                    {(() => {
                      if (!user?.created_at) return '';
                      const trialEnd = new Date(user.created_at);
                      trialEnd.setDate(trialEnd.getDate() + 8);
                      return formatDate(trialEnd.toISOString());
                    })()}
                  </span>
                </div>
              </div>
            )}

            {/* Subscription Period */}
            {subscription && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {subscription.status === 'trialing' ? 'Trial Ends' : 'Next Billing'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {subscription.status === 'trialing' && subscription.trial_end
                    ? formatDate(subscription.trial_end)
                    : formatDate(subscription.current_period_end)}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              {subscription && subscription.status === 'active' && (
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

              {subscription && (
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

              {!subscription && trialDaysLeft === 0 && (
                <div className="space-y-2">
                  <Button className="w-full">
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade to Business
                  </Button>
                </div>
              )}

              {subscription && subscription.status === 'active' && currentPlan.type === 'pro' && (
                <Button variant="outline" className="w-full">
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to Business
                </Button>
              )}

              {subscription && subscription.status === 'active' && currentPlan.type === 'business' && (
                <Button variant="outline" className="w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Upgrade to Enterprise
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
                         {transaction.invoice_url && (
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleDownloadInvoice(transaction.id, transaction.invoice_url)}
                           >
                             <Download className="h-4 w-4 mr-2" />
                             Invoice
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