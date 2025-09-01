import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  DollarSign
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
      if (!authUser) return;

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        trial_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_status: 'trial',
        plan: 'trial'
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">Manage your subscription and billing information</p>
      </div>

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
              <div className="text-2xl font-bold">
                Free Trial
              </div>
              <div className="text-sm text-muted-foreground">Current Plan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                <Badge className="bg-blue-100 text-blue-800">Trial</Badge>
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {isTrialActive ? (
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-600">
                      {Math.ceil((new Date(user?.trial_end || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                ) : (
                  'N/A'
                )}
              </div>
              <div className="text-sm text-muted-foreground">
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
                Your trial ends on {new Date(user?.trial_end || '').toLocaleDateString()}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Choose Your Plan</CardTitle>
          <p className="text-muted-foreground text-sm">Upgrade now to unlock all features and continue building amazing experiences.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    {plan.pricePerMonth}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    onClick={() => handlePlanSelect(plan.id as 'pro' | 'business')}
                    className="w-full"
                    size="lg"
                  >
                    Upgrade to {plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No transactions yet</p>
            <p className="text-sm mt-2">Your payment history will appear here after your first upgrade.</p>
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