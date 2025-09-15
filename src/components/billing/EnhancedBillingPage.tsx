import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  DollarSign,
  AlertTriangle,
  Crown,
  Zap,
  Users,
  BarChart3,
  Brain,
  FileText,
  ArrowUpRight,
  RefreshCw,
  Star,
  Shield,
  HeadphonesIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PaystackPayment from '@/components/PaystackPayment';
import UsageBar from '@/components/billing/UsageBar';

interface PlanTier {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  feedback_limit: number;
  ai_insights_limit: number;
  reports_limit: number;
  team_members_limit: number;
  features: string[];
  paystack_plan_code: string | null;
  is_active: boolean;
}

interface BillingDashboard {
  user_id: string;
  plan: string;
  plan_display_name: string;
  price_monthly: number;
  feedback_limit: number;
  ai_insights_limit: number;
  reports_limit: number;
  team_members_limit: number;
  features: string[];
  current_feedback_usage: number;
  current_ai_insights_usage: number;
  current_reports_usage: number;
  subscription_status: string;
  trial_end_date: string | null;
  subscription_end_date: string | null;
}

interface SubscriptionHistory {
  id: string;
  action: string;
  previous_plan: string | null;
  new_plan: string | null;
  amount_paid: number | null;
  currency: string;
  created_at: string;
}

interface BillingNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [billingData, setBillingData] = useState<BillingDashboard | null>(null);
  const [planTiers, setPlanTiers] = useState<PlanTier[]>([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistory[]>([]);
  const [notifications, setNotifications] = useState<BillingNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, [user]);

  const fetchBillingData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [billingResult, plansResult, historyResult, notificationsResult] = await Promise.all([
        // Get user billing dashboard
        supabase
          .from('user_billing_dashboard')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        
        // Get available plan tiers
        supabase
          .from('plan_tiers')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly', { ascending: true }),
        
        // Get subscription history
        supabase
          .from('subscription_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Get billing notifications
        supabase
          .from('billing_notifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      if (billingResult.error) {
        console.error('Error loading billing data:', billingResult.error);
        toast.error('Failed to load billing information');
        return;
      }

      if (plansResult.error) {
        console.error('Error loading plan tiers:', plansResult.error);
        toast.error('Failed to load plan information');
        return;
      }

      setBillingData(billingResult.data);
      setPlanTiers(plansResult.data || []);
      setSubscriptionHistory(historyResult.data || []);
      setNotifications(notificationsResult.data || []);

    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planName: string) => {
    setSelectedPlan(planName);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (subscriptionData: any) => {
    toast.success('Payment successful! Your subscription is being activated...');
    setShowPayment(false);
    setSelectedPlan(null);
    
    // Refresh billing data
    setTimeout(() => {
      fetchBillingData();
    }, 2000);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setSelectedPlan(null);
  };

  const handleCancelSubscription = async () => {
    if (!billingData?.plan) return;

    try {
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: billingData.plan
        }),
      });

      if (response.ok) {
        toast.success('Subscription cancellation initiated');
        fetchBillingData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast.error('Failed to cancel subscription');
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('billing_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPrice = (priceKobo: number) => {
    if (priceKobo === 0) return 'Free';
    const priceNGN = priceKobo / 100;
    return `₦${priceNGN.toLocaleString()}`;
  };

  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'free':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'business':
        return <Crown className="h-5 w-5 text-purple-500" />;
      case 'scale':
        return <Star className="h-5 w-5 text-yellow-500" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFeatureIcon = (feature: string) => {
    if (feature.toLowerCase().includes('feedback')) return <BarChart3 className="h-4 w-4" />;
    if (feature.toLowerCase().includes('insight')) return <Brain className="h-4 w-4" />;
    if (feature.toLowerCase().includes('report')) return <FileText className="h-4 w-4" />;
    if (feature.toLowerCase().includes('team')) return <Users className="h-4 w-4" />;
    if (feature.toLowerCase().includes('support')) return <HeadphonesIcon className="h-4 w-4" />;
    if (feature.toLowerCase().includes('security')) return <Shield className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const isTrialActive = billingData?.subscription_status === 'trial' && billingData?.trial_end_date && 
                       new Date(billingData.trial_end_date) > new Date();
  const hasActiveSubscription = billingData?.subscription_status === 'active';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading Billing Information...</h2>
          <p className="text-gray-600">Please wait while we fetch your subscription details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-2">Manage your subscription and billing information</p>
      </div>

      {/* Usage Overview */}
      <div className="mb-8">
        <UsageBar />
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Important Notifications</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-yellow-800">{notification.title}</h4>
                    <p className="text-sm text-yellow-700 mt-1">{notification.message}</p>
                    <p className="text-xs text-yellow-600 mt-2">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markNotificationAsRead(notification.id)}
                    className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                  >
                    Dismiss
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {billingData?.plan_display_name || 'Free Trial'}
              </div>
              <div className="text-sm text-gray-600">Current Plan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {getStatusBadge(billingData?.subscription_status || 'trial')}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {isTrialActive ? (
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-600">
                      {Math.ceil((new Date(billingData?.trial_end_date || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                ) : billingData?.subscription_end_date ? (
                  <div className="flex items-center justify-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span>
                      {new Date(billingData.subscription_end_date).toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  'N/A'
                )}
              </div>
              <div className="text-sm text-gray-600">
                {isTrialActive ? 'Trial Remaining' : 'Next Payment'}
              </div>
            </div>
          </div>

          {isTrialActive && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Free Trial Active - Upgrade Early</span>
              </div>
              <p className="text-blue-700 text-sm mt-1">
                Love what you see? Upgrade anytime during your trial to unlock unlimited features. 
                Your trial ends on {new Date(billingData?.trial_end_date || '').toLocaleDateString()}.
              </p>
            </div>
          )}

          {billingData?.subscription_status === 'past_due' && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Payment Failed</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">
                Your last payment failed. Please update your payment method to continue.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      {!hasActiveSubscription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <p className="text-gray-600 text-sm">Upgrade now to unlock all features and continue building amazing experiences.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {planTiers.map((plan) => (
                <Card key={plan.id} className={`relative border-2 hover:border-primary/50 transition-colors ${
                  plan.name === 'business' ? 'border-purple-200 bg-purple-50/30' :
                  plan.name === 'scale' ? 'border-yellow-200 bg-yellow-50/30' :
                  'border-blue-200 bg-blue-50/30'
                }`}>
                  {plan.name === 'scale' && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-yellow-500 text-white">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      {getPlanIcon(plan.name)}
                      <span>{plan.display_name}</span>
                    </CardTitle>
                    <div className="text-3xl font-bold text-gray-900">
                      {formatPrice(plan.price_monthly)}
                      <span className="text-lg font-normal text-gray-600">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          {getFeatureIcon(feature)}
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      onClick={() => handlePlanSelect(plan.name)}
                      className={`w-full ${
                        plan.name === 'scale' ? 'bg-yellow-600 hover:bg-yellow-700' :
                        plan.name === 'business' ? 'bg-purple-600 hover:bg-purple-700' :
                        'bg-blue-600 hover:bg-blue-700'
                      }`}
                      size="lg"
                    >
                      {plan.name === 'free' ? 'Current Plan' : `Upgrade to ${plan.display_name}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription Details */}
      {hasActiveSubscription && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">{billingData?.plan_display_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status:</span>
                {getStatusBadge(billingData?.subscription_status || '')}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Next Payment:</span>
                <span>
                  {billingData?.subscription_end_date 
                    ? new Date(billingData.subscription_end_date).toLocaleDateString()
                    : 'N/A'
                  }
                </span>
              </div>
              <Separator />
              <Button 
                variant="outline" 
                onClick={handleCancelSubscription}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Cancel Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription History */}
      {subscriptionHistory.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Subscription History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscriptionHistory.map((history) => (
                <div key={history.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      history.action === 'upgrade' ? 'bg-green-100' : 
                      history.action === 'cancel' ? 'bg-red-100' :
                      'bg-blue-100'
                    }`}>
                      {history.action === 'upgrade' ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : history.action === 'cancel' ? (
                        <XCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium capitalize">
                        {history.action.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {history.previous_plan && history.new_plan ? 
                          `${history.previous_plan} → ${history.new_plan}` :
                          history.new_plan || history.previous_plan || 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {history.amount_paid && (
                      <div className="font-medium">
                        {formatPrice(history.amount_paid)}
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      {new Date(history.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Modal */}
      {showPayment && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Complete Payment for {planTiers.find(p => p.name === selectedPlan)?.display_name} Plan
            </h3>
            <PaystackPayment
              plan={selectedPlan}
              planName={planTiers.find(p => p.name === selectedPlan)?.display_name || ''}
              planPrice={formatPrice(planTiers.find(p => p.name === selectedPlan)?.price_monthly || 0)}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;