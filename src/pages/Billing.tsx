import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Clock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Billing = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [subscription, setSubscription] = useState<any>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<any>(null);
  const [usage, setUsage] = useState({
    insights_generated: 0,
    data_sources: 0,
    team_members: 1
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
      fetchUsageData();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    if (!user) return;

    try {
      // Get user subscription
      const { data: userSub } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq('user_id', user.id)
        .single();

      if (userSub) {
        setSubscription(userSub);
        setSubscriptionPlan(userSub.subscription_plans);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageData = async () => {
    if (!user) return;

    try {
      // Get insights count
      const { count: insightsCount } = await supabase
        .from('ai_insights')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get data sources count
      const { count: sourcesCount } = await supabase
        .from('data_sources')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setUsage({
        insights_generated: insightsCount || 0,
        data_sources: sourcesCount || 0,
        team_members: 1 // Will be updated when team features are implemented
      });
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const plans = [
    {
      name: "Trial",
      price: 0,
      interval: "8 days",
      features: [
        "10 AI insights per month",
        "3 data sources",
        "1 team member",
        "Basic analytics",
        "Email support"
      ],
      popular: false,
      current: subscriptionPlan?.name === "Trial"
    },
    {
      name: "Pro",
      price: 17,
      interval: "month",
      features: [
        "100 AI insights per month",
        "Unlimited data sources",
        "5 team members",
        "Advanced analytics",
        "Priority support",
        "Custom reports",
        "API access"
      ],
      popular: true,
      current: subscriptionPlan?.name === "Pro"
    },
    {
      name: "Business",
      price: 30,
      interval: "month",
      features: [
        "Unlimited AI insights",
        "Unlimited data sources",
        "15 team members",
        "Advanced analytics",
        "24/7 phone support",
        "Custom integrations",
        "White-label reports",
        "SSO integration"
      ],
      popular: false,
      current: subscriptionPlan?.name === "Business"
    }
  ];

  const handleUpgrade = async (planName: string) => {
    // In a real app, this would integrate with Paystack
    toast({
      title: "Upgrade initiated",
      description: `Redirecting to payment for ${planName} plan...`
    });
    
    // Simulate Paystack integration
    console.log(`Upgrading to ${planName} plan`);
    
    // Track upgrade attempt
    await supabase.from('analytics_events').insert({
      user_id: user?.id,
      event_type: 'upgrade_attempt',
      event_data: { plan: planName }
    });
  };

  const handleCancelSubscription = async () => {
    toast({
      title: "Cancellation initiated",
      description: "Your subscription will be cancelled at the end of the current billing period."
    });
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_end) return 0;
    const trialEnd = new Date(subscription.trial_end);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
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
          <h1 className="text-2xl md:text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and view usage details
          </p>
        </div>
      </div>

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Current Subscription
            </span>
            <Badge className={subscription?.status === 'active' ? 'bg-success' : 'bg-warning'}>
              {subscription?.status || 'Unknown'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                {subscriptionPlan?.name || 'Trial'} Plan
              </h3>
              <p className="text-muted-foreground mb-4">
                ${subscriptionPlan?.price || 0}/{subscriptionPlan?.interval || 'trial'}
              </p>
              
              {subscription?.status === 'trialing' && (
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
              
              {subscription?.current_period_end && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Usage This Month</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center">
                        <Brain className="h-4 w-4 mr-1" />
                        AI Insights
                      </span>
                      <span>{usage.insights_generated} / {subscriptionPlan?.max_insights_per_month || 10}</span>
                    </div>
                    <Progress value={getUsagePercentage(usage.insights_generated, subscriptionPlan?.max_insights_per_month || 10)} />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center">
                        <Database className="h-4 w-4 mr-1" />
                        Data Sources
                      </span>
                      <span>{usage.data_sources} / {subscriptionPlan?.max_data_sources || 3}</span>
                    </div>
                    <Progress value={getUsagePercentage(usage.data_sources, subscriptionPlan?.max_data_sources || 3)} />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        Team Members
                      </span>
                      <span>{usage.team_members} / {subscriptionPlan?.max_team_members || 1}</span>
                    </div>
                    <Progress value={getUsagePercentage(usage.team_members, subscriptionPlan?.max_team_members || 1)} />
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
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/{plan.interval}</span>
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
                  {plan.current ? (
                    <Button variant="outline" disabled className="w-full">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleUpgrade(plan.name)}
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {subscriptionPlan?.price && plan.price > subscriptionPlan.price ? 'Upgrade' : 'Select'} Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

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
      {subscription?.status === 'active' && (
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
              <Button variant="outline" onClick={handleCancelSubscription}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Cancel Subscription
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Billing;