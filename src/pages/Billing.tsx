import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Star,
  Zap,
  Shield,
  Users,
  Database,
  Brain,
  Download,
  Clock,
  TrendingUp,
  FileText,
  BarChart3,
  Settings,
  RefreshCw,
  ExternalLink,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUsageTracking, type UsageData } from "@/hooks/useUsageTracking";
import PaystackPayment from "@/components/PaystackPayment";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  status: string;
  trial_end?: string;
  current_period_end?: string;
  limits: {
    ai_insights: number;
    data_sources: number;
    team_members: number;
    ai_reports: number;
    business_analytics: number;
  };
}

const Billing = () => {
  const { user } = useAuth();
  const { 
    usage, 
    loading, 
    subscription, 
    refreshUsage: hookRefreshUsage, 
    getUsagePercentage, 
    getUsageStatus 
  } = useUsageTracking();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'business' | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching subscription:', error);
      }

      if (data) {
        setSubscriptionData(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  }, [user]);

  // Get plan name based on subscription status
  const getPlanName = () => {
    if (!subscriptionData) return 'Free Trial';
    
    // Check if user has an active subscription
    if (subscriptionData.status === 'active' || subscriptionData.status === 'trialing') {
      // Determine plan based on subscription details
      if (subscriptionData.plan_name) {
        return subscriptionData.plan_name;
      }
      
      // Fallback: determine plan based on price or other indicators
      if (subscriptionData.price === 35000) return 'Pro';
      if (subscriptionData.price === 53000) return 'Business';
      
      // Default to Pro if we can't determine
      return 'Pro';
    }
    
    return 'Free Trial';
  };

  // Get plan price and interval
  const getPlanPrice = () => {
    if (!subscriptionData) return { price: 0, currency: '₦', interval: '8 days' };
    
    return {
      price: subscriptionData.price || 0,
      currency: subscriptionData.currency || '₦',
      interval: subscriptionData.interval || 'month'
    };
  };

  // Get subscription status
  const getSubscriptionStatus = () => {
    if (!subscriptionData) return 'trialing';
    return subscriptionData.status || 'trialing';
  };

  // Fetch subscription on component mount
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Default to Free Trial plan
  const defaultPlan: SubscriptionPlan = {
    id: 'trial',
    name: 'Free Trial',
    price: 0,
    currency: '₦',
    interval: '8 days',
    status: 'trialing',
    trial_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    limits: {
      ai_insights: 20,
      data_sources: 1,
      team_members: 1,
      ai_reports: 2,
      business_analytics: 1
    }
  };







  const refreshUsage = async () => {
    setRefreshing(true);
    await hookRefreshUsage();
    await fetchSubscription();
    setRefreshing(false);
    toast.success("Usage data refreshed");
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_end) return 0;
    const trialEnd = new Date(subscription.trial_end);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };



  const plans = [
    {
      name: "Free Trial",
      price: "₦0",
      period: "8 days",
      description: "Perfect for testing our BI platform",
      icon: Zap,
      badge: "Start Here",
      badgeVariant: "default" as const,
      features: [
        "AI Insights → up to 20 insights total",
        "Data Sources → 1 source (CSV/Excel upload only)",
        "Team Members → 1 user (owner only)",
        "AI Reports → 2 executive reports",
        "Business Analytics → Basic metrics (static dashboards)",
        "Upload business data (CSV/Excel, DOCX, TXT, PDF)",
        "Generate simple insights (summaries, patterns)",
        "Limited visualization (basic charts only)",
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "hero" as const,
      popular: false
    },
    {
      name: "Pro",
      price: "₦35,000",
      period: "/month",
      description: "For SMBs and growing startups",
      icon: Star,
      badge: "Most Popular",
      badgeVariant: "default" as const,
      features: [
        "AI Insights → up to 500 per month",
        "Data Sources → 5 sources (CSV/Excel, Google Sheets, DOCX, TXT, PDF)",
        "Team Members → up to 5 users",
        "AI Reports → 20 per month (executive summaries, trend detection)",
        "Business Analytics → Real-time dashboards + export to PDF/CSV",
        "Multi-source data sync (auto-refresh)",
        "AI insights generator (trends, anomalies, opportunities)",
        "Forecasting (short-term predictions)",
        "Visual dashboards (charts, KPIs)",
        "Data drill-down (filter/slice insights by category)",
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "hero" as const,
      popular: true
    },
    {
      name: "Business",
      price: "₦53,000",
      period: "/month",
      description: "For enterprises and large teams",
      icon: Shield,
      badge: "Enterprise",
      badgeVariant: "secondary" as const,
      features: [
        "AI Insights → Unlimited",
        "Data Sources → Unlimited (databases, CRMs, ERPs, APIs)",
        "Team Members → Unlimited (with role-based access)",
        "AI Reports → Unlimited (weekly & on-demand reports)",
        "Business Analytics → Enterprise-grade real-time + predictive analytics",
        "Everything in Pro",
        "White-label dashboards (brand it as your own)",
        "Predictive forecasting (AI-powered trend projection)",
        "Automated alerts (Teams, Email when KPIs shift)",
        "Dedicated support & SLA",
        "Compliance (GDPR, SOC2)",
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "premium" as const,
      popular: false
    }
  ];

  const handleUpgrade = async (planName: string) => {
    const plan = planName.toLowerCase() as 'pro' | 'business';
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (subscriptionData: any) => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
    
    toast.success('Subscription activated successfully!');
    
    // Refresh usage data to reflect new plan limits
    await refreshUsage();
    
    // Track successful upgrade
    try {
      await supabase.from('analytics_events').insert({
        user_id: user?.id,
        event_type: 'upgrade_success',
        event_data: { plan: selectedPlan, subscription_ref: subscriptionData.reference }
      });
    } catch (error) {
      console.error('Error tracking upgrade success:', error);
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
  };

  const handleCancelSubscription = async () => {
    if (!user?.email || !subscriptionData?.subscription_id) {
      toast.error("Unable to cancel subscription. Please contact support.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'cancel',
          subscription_id: subscriptionData.subscription_id,
          email: user.email
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast.success("Subscription cancelled successfully");
        toast.info("Your subscription will be cancelled at the end of the current billing period.");
        await refreshUsage(); // Refresh to show updated status
      } else {
        toast.error(data?.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error("Failed to cancel subscription. Please try again or contact support.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Usage & Billing</h1>
          <p className="text-muted-foreground">
            Monitor your usage and manage your subscription
          </p>
        </div>
        <Button onClick={refreshUsage} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Usage
        </Button>
      </div>

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Current Subscription
            </span>
            <Badge className={getSubscriptionStatus() === 'active' ? 'bg-success' : 'bg-warning'}>
              {getSubscriptionStatus() === 'trialing' ? 'Trial' : getSubscriptionStatus() === 'active' ? 'Active' : 'Unknown'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {getPlanName()} Plan
              </h3>
              <p className="text-muted-foreground mb-4">
                {getPlanPrice().currency}{getPlanPrice().price}/{getPlanPrice().interval}
              </p>
              
                              {getSubscriptionStatus() === 'trialing' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Trial Progress</span>
                    <span>{8 - getTrialDaysRemaining()} of 8 days used</span>
                  </div>
                  <Progress value={((8 - getTrialDaysRemaining()) / 8) * 100} />
                  <p className="text-sm text-muted-foreground">
                    {getTrialDaysRemaining()} days remaining in your trial
                  </p>
                </div>
              )}
              
              {subscriptionData?.current_period_end && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                                      Next billing: {new Date(subscriptionData.current_period_end).toLocaleDateString()}
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Usage Overview</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        Feedback Submitted
                      </span>
                      <span>{usage.ai_insights.current}</span>
                    </div>
                    <Progress value={getUsagePercentage('ai_insights')} />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center">
                        <Brain className="h-4 w-4 mr-1" />
                        AI Analytics Generated
                      </span>
                      <span>{usage.ai_reports.current}</span>
                    </div>
                    <Progress value={getUsagePercentage('ai_reports')} />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Executive Reports Generated
                      </span>
                      <span>{usage.business_analytics.current}</span>
                    </div>
                    <Progress value={getUsagePercentage('business_analytics')} />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Business Intelligence Generated
                      </span>
                      <span>{usage.data_sources.current}</span>
                    </div>
                    <Progress value={getUsagePercentage('data_sources')} />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        Teams (Coming Soon)
                      </span>
                      <span>0</span>
                    </div>
                    <Progress value={0} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Upgrade Plans */}
      <div>
        <h2 className="text-xl font-bold mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary px-3 py-1">
                    <Star className="h-3 w-3 mr-2" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-success mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <div className="pt-4">
                  <Button
                    onClick={() => handleUpgrade(plan.name)}
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {plan.name === 'Free Trial' ? 'Current Plan' : 'Upgrade to ' + plan.name}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Usage Limits & Enforcement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Usage Limits & Enforcement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold">Current Limits</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="flex items-center">
                    <Brain className="h-4 w-4 mr-2 text-blue-600" />
                    AI Insights
                  </span>
                  <Badge variant="outline">{usage.ai_insights.limit}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="flex items-center">
                    <Database className="h-4 w-4 mr-2 text-green-600" />
                    Data Sources
                  </span>
                  <Badge variant="outline">{usage.data_sources.limit}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-purple-600" />
                    Team Members
                  </span>
                  <Badge variant="outline">{usage.team_members.limit}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-orange-600" />
                    AI Reports
                  </span>
                  <Badge variant="outline">{usage.ai_reports.limit}</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold">Automatic Enforcement</h4>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 mt-0.5 text-blue-600" />
                  <span>Usage limits are automatically enforced by the platform</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 mt-0.5 text-orange-600" />
                  <span>You'll receive warnings when approaching limits</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 mt-0.5 text-red-600" />
                  <span>Features are disabled when limits are exceeded</span>
                </div>
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 mt-0.5 text-green-600" />
                  <span>Upgrade anytime to increase your limits</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payment history yet</p>
            <p className="text-sm">Your payment history will appear here after your first payment</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Subscription Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Need to make changes to your subscription? We're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {subscription?.status === 'active' ? (
              <Button variant="outline" onClick={handleCancelSubscription}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Cancel Subscription
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Cancel Subscription
              </Button>
            )}
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Invoice
            </Button>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Paystack Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <PaystackPayment
              plan={selectedPlan}
              planName={selectedPlan === 'pro' ? 'Pro' : 'Business'}
              planPrice={selectedPlan === 'pro' ? '₦35,000' : '₦53,000'}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;