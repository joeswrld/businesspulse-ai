import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Zap,
  Shield,
  Users,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import PaystackPayment from '@/components/PaystackPayment';

const SimpleBillingPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'business' | null>(null);

  const plans = [
    {
      id: 'pro',
      name: 'Pro',
      price: '₦35,000',
      pricePerMonth: '₦35,000/month',
      icon: <Zap className="h-6 w-6 text-blue-600" />,
      features: [
        'Unlimited data sources',
        '100 AI insights per month',
        'Advanced analytics',
        'Priority support',
        'Custom reports',
        'Team collaboration'
      ],
      planCode: 'PLN_4z2wpgmw41z2k7r'
    },
    {
      id: 'business',
      name: 'Business',
      price: '₦53,000',
      pricePerMonth: '₦53,000/month',
      icon: <Shield className="h-6 w-8 text-purple-600" />,
      features: [
        'Unlimited data sources',
        'Unlimited AI insights',
        'Enterprise analytics',
        'Dedicated support',
        'Custom integrations',
        'Advanced team management',
        'API access'
      ],
      planCode: 'PLN_esryg99ztsy9xc8'
    }
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        // Set default user data if no auth user
        setUser({
          id: 'default',
          email: 'user@example.com',
          trial_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_status: 'trial',
          plan: 'trial'
        });
        return;
      }

      // Set user with default trial data
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        trial_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_status: 'trial',
        plan: 'trial'
      });

    } catch (error) {
      // Silently handle errors and set default data
      setUser({
        id: 'default',
        email: 'user@example.com',
        trial_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_status: 'trial',
        plan: 'trial'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan: 'pro' | 'business') => {
    if (!user) {
      toast.error('Please log in to upgrade your plan');
      return;
    }
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (subscriptionData: any) => {
    toast.success('Payment successful! Your subscription is being activated...');
    setShowPayment(false);
    setSelectedPlan(null);
    
    // Refresh user data
    setTimeout(() => {
      fetchUserData();
    }, 2000);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setSelectedPlan(null);
  };

  const isTrialActive = user?.trial_end && new Date(user.trial_end) > new Date();
  const trialDaysLeft = isTrialActive 
    ? Math.ceil((new Date(user?.trial_end || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Ensure user object exists
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Choose Your Plan
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Start with a free trial, then choose the plan that fits your needs
        </p>
      </div>

      {/* Current Status - Simplified */}
      <Card className="mb-8 border-2 border-blue-100 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Free Trial Active</h3>
                <p className="text-blue-700 text-sm">
                  {trialDaysLeft > 0 
                    ? `${trialDaysLeft} days remaining` 
                    : 'Trial expired - upgrade to continue'
                  }
                </p>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
              {trialDaysLeft > 0 ? 'Active Trial' : 'Trial Expired'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Plans - Enhanced Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-3">
                {plan.icon}
              </div>
              <CardTitle className="text-2xl text-gray-900">{plan.name}</CardTitle>
              <div className="text-4xl font-bold text-primary">
                {plan.pricePerMonth}
              </div>
              <p className="text-sm text-muted-foreground">Billed monthly</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                onClick={() => handlePlanSelect(plan.id as 'pro' | 'business')}
                className="w-full h-12 text-lg font-semibold group-hover:scale-105 transition-transform"
                size="lg"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Why Choose NoteX */}
      <Card className="mb-8 bg-gradient-to-r from-gray-50 to-blue-50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Why Choose NoteX?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="p-3 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-semibold mb-2">AI-Powered Insights</h4>
              <p className="text-sm text-muted-foreground">Get intelligent insights from your data automatically</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-green-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="font-semibold mb-2">Team Collaboration</h4>
              <p className="text-sm text-muted-foreground">Work together with your team in real-time</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="font-semibold mb-2">Enterprise Security</h4>
              <p className="text-sm text-muted-foreground">Bank-level security for your sensitive data</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {showPayment && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Complete Payment for {plans.find(p => p.id === selectedPlan)?.name} Plan
            </h3>
            <PaystackPayment
              plan={selectedPlan}
              planName={plans.find(p => p.id === selectedPlan)?.name || ''}
              planPrice={plans.find(p => p.id === selectedPlan)?.price || ''}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleBillingPage;