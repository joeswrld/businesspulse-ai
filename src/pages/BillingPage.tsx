import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Download,
  Calendar,
  Users,
  FileText,
  BarChart3,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Receipt,
  ExternalLink,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface UsageMetrics {
  feedback_submitted: number;
  ai_analytics_generated: number;
  executive_reports_generated: number;
  business_intelligence_generated: number;
  teams: number;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_name: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  currency: string;
  status: 'success' | 'pending' | 'failed';
  paystack_invoice_url?: string;
  created_at: string;
}

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics>({
    feedback_submitted: 0,
    ai_analytics_generated: 0,
    executive_reports_generated: 0,
    business_intelligence_generated: 0,
    teams: 0
  });
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);

  // Load billing data
  const loadBillingData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load usage metrics
      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        console.error('Usage tracking error:', usageError);
      } else if (usageData) {
        setUsageMetrics({
          feedback_submitted: usageData.feedback_submitted || 0,
          ai_analytics_generated: usageData.ai_analytics_generated || 0,
          executive_reports_generated: usageData.executive_reports_generated || 0,
          business_intelligence_generated: usageData.business_intelligence_generated || 0,
          teams: usageData.teams || 0
        });
      }

      // Load subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('Subscription error:', subscriptionError);
      } else if (subscriptionData) {
        setSubscription(subscriptionData);
      }

      // Load transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transactionsError) {
        console.error('Transactions error:', transactionsError);
      } else {
        setTransactions(transactionsData || []);
      }

    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [user]);

  // Handle upgrade to pro
  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/paystack/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id,
          plan: 'pro'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error('Failed to redirect to payment');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Failed to process upgrade request');
    }
  };

  // Handle cancel subscription
  const handleCancelSubscription = async () => {
    if (!subscription) return;

    try {
      setCanceling(true);
      
      const response = await fetch('/api/paystack/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: subscription.id,
          user_id: user?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      toast.success('Subscription cancelled successfully');
      setShowCancelDialog(false);
      loadBillingData(); // Reload data to reflect changes
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setCanceling(false);
    }
  };

  // Format amount in Naira
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date nicely
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get trial days remaining
  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_end) return 0;
    const trialEnd = new Date(subscription.trial_end);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'success':
      case 'active':
        return 'default';
      case 'pending':
      case 'trialing':
        return 'secondary';
      case 'failed':
      case 'canceled':
      case 'past_due':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
      case 'trialing':
        return <Clock className="h-4 w-4" />;
      case 'failed':
      case 'canceled':
      case 'past_due':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading billing information...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Usage</h1>
        <p className="text-gray-600">Manage your subscription and view usage metrics</p>
      </div>

      {/* Usage Overview and Current Plan Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Usage Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Usage Overview
            </CardTitle>
            <CardDescription>
              Your platform usage metrics for this billing period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-900">{usageMetrics.feedback_submitted}</div>
                <div className="text-sm text-blue-700">Feedback Submitted</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-900">{usageMetrics.ai_analytics_generated}</div>
                <div className="text-sm text-purple-700">AI Analytics Generated</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-900">{usageMetrics.executive_reports_generated}</div>
                <div className="text-sm text-green-700">Executive Reports Generated</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <BarChart3 className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-900">{usageMetrics.business_intelligence_generated}</div>
                <div className="text-sm text-orange-700">Business Intelligence Generated</div>
              </div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">0</div>
              <div className="text-sm text-gray-700">Teams (Coming Soon)</div>
            </div>
          </CardContent>
        </Card>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>
              Your subscription details and billing information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{subscription.plan_name}</div>
                    <div className="text-sm text-gray-600">
                      {subscription.status === 'trialing' ? 'Free Trial' : 'Active Subscription'}
                    </div>
                  </div>
                  <Badge variant={getStatusBadgeVariant(subscription.status)}>
                    {subscription.status}
                  </Badge>
                </div>

                {subscription.status === 'trialing' && subscription.trial_end && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Trial ends in {getTrialDaysRemaining()} days</span>
                    </div>
                    <div className="text-sm text-yellow-700 mt-1">
                      {formatDate(subscription.trial_end)}
                    </div>
                  </div>
                )}

                {subscription.status === 'active' && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Next billing date</span>
                    </div>
                    <div className="text-sm text-green-700 mt-1">
                      {formatDate(subscription.current_period_end)}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={handleUpgrade}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Upgrade to Pro
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCancelDialog(true)}
                    className="flex-1"
                  >
                    Cancel Subscription
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                <p className="text-gray-600 mb-4">
                  You're currently on the free plan. Upgrade to unlock premium features.
                </p>
                <Button 
                  onClick={handleUpgrade}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Upgrade to Pro
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Your transaction history and invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
              <p className="text-gray-600">
                You haven't made any payments yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(transaction.status)}
                        <Badge variant={getStatusBadgeVariant(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </div>
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(transaction.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">{formatAmount(transaction.amount)}</div>
                      <div className="text-sm text-gray-600">{transaction.currency}</div>
                    </div>
                    
                    {transaction.paystack_invoice_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(transaction.paystack_invoice_url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Invoice
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={canceling}
            >
              {canceling ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Canceling...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingPage;