import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  Zap,
  Shield,
  Star,
  Crown,
  ArrowUpRight,
  Settings,
  Download,
  MessageSquare,
  Database,
  Users,
  HelpCircle,
  Receipt,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import PaystackPayment from '@/components/PaystackPayment';

const SimpleBillingPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'business' | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const plans = [
    {
      id: 'free',
      name: 'Free Trial',
      price: 'Free',
      period: 'per 8 days',
      icon: <Star className="h-6 w-6 text-yellow-600" />,
      features: [
        'Feedback Collection: 50 responses',
        'AI Insights: 5 insights',
        'Basic Analytics: 5 reports',
        'Reports: 2 reports',
        'Team Members: 1 member',
        'Export Formats: CSV',
        'Support: Email',
        'Data Retention: 8 days retention'
      ],
      popular: false,
      current: false
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      price: '₦35,000.00',
      period: 'per 30 days',
      icon: <Zap className="h-6 w-6 text-blue-600" />,
      features: [
        'Feedback Collection: 300 responses',
        'AI Insights: 50 insights',
        'Advanced Analytics: 100 reports',
        'Reports: 20 reports',
        'Team Members: 5 members',
        'Export Formats: CSV, PDF, Excel',
        'Support: Email, Chat',
        'Data Retention: 12 months retention',
        'Priority Support: No',
        'Widget Access: No'
      ],
      popular: true,
      current: true,
      planCode: 'PLN_4z2wpgmw41z2k7r'
    },
    {
      id: 'business',
      name: 'Business Plan',
      price: '₦53,000.00',
      period: 'per 30 days',
      icon: <Shield className="h-6 w-8 text-purple-600" />,
      features: [
        'Feedback Collection: Unlimited',
        'AI Insights: Unlimited',
        'Enterprise Analytics: Unlimited',
        'Reports: Unlimited',
        'Team Members: Unlimited',
        'Export Formats: CSV, PDF, Excel',
        'Support: Email, Chat, Phone, Priority',
        'Data Retention: Unlimited retention',
        'Priority Support: Yes',
        'Predictive Analytics: Yes',
        'Custom widget Integrations: Yes'
      ],
      popular: false,
      current: false,
      planCode: 'PLN_esryg99ztsy9xc8'
    }
  ];


  const transactionHistory = [
    {
      date: 'Aug 30, 2025',
      description: 'Pro Plan Subscription',
      amount: '₦35,000.00',
      status: 'Success',
      receipt: 'Receipt'
    },
    {
      date: 'Aug 30, 2025',
      description: 'Business Plan Subscription',
      amount: '₦53,000.00',
      status: 'Success',
      receipt: 'Receipt'
    },
    {
      date: 'Aug 30, 2025',
      description: 'Pro Plan Subscription',
      amount: '₦35,000.00',
      status: 'Success',
      receipt: 'Receipt'
    }
  ];

  const faqs = [
    {
      question: 'Can I change my plan anytime?',
      answer: 'Yes! You can upgrade your plan at any time. Downgrades take effect at the end of your current billing period.'
    },
    {
      question: 'What happens when my trial expires?',
      answer: 'When your trial expires, you\'ll need to upgrade to Pro or Business to continue using advanced features. No automatic downgrade to a free plan.'
    },
    {
      question: 'Is there a setup fee?',
      answer: 'No setup fees! Start with a free trial and only pay when you\'re ready to upgrade.'
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Absolutely! Cancel your subscription anytime and continue using your plan until the end of the billing period.'
    }
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser({
          id: 'default',
          email: 'user@example.com',
          trial_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_status: 'trial',
          plan: 'pro',
          next_billing: 'Sep 29, 2025'
        });
        return;
      }

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        trial_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_status: 'active',
        plan: 'pro',
        next_billing: 'Sep 29, 2025'
      });

    } catch (error) {
      setUser({
        id: 'default',
        email: 'user@example.com',
        trial_end: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_status: 'active',
        plan: 'pro',
        next_billing: 'Sep 29, 2025'
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
    
    setTimeout(() => {
      fetchUserData();
    }, 2000);
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setSelectedPlan(null);
  };

  const getCurrentPlan = () => plans.find(p => p.id === user?.plan) || plans[1];
  const currentPlan = getCurrentPlan();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Manage your subscription and track usage
        </p>
      </div>

      {/* Current Plan Status */}
      <Card className="mb-8 border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-blue-900">
            <Crown className="h-6 w-6 text-blue-600" />
            Current Plan
          </CardTitle>
          <p className="text-blue-700 text-sm">Your current subscription and billing status</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blue-900">{currentPlan.name}</h3>
              <p className="text-3xl font-bold text-blue-600">{currentPlan.price}</p>
              <p className="text-blue-700">{currentPlan.period}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-700 text-sm">Next billing</p>
              <p className="text-lg font-semibold text-blue-900">{user?.next_billing}</p>
            </div>
            <div className="text-center">
              <Button 
                onClick={() => handlePlanSelect('business')}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Upgrade to Business
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Plan Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Settings className="h-5 w-5" />
                Plan Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Download className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Export: CSV, PDF, Excel</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Support: Email, Chat</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Database className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Data Retention: 12 months</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Users className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium">Teams: 5</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium">Priority Support: No</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium">Widget Access: No</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Usage Tips */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-green-800">
                <TrendingUp className="h-5 w-5" />
                Usage Tips
              </CardTitle>
              <p className="text-green-700 text-sm">Make the most of your current plan</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="p-2 bg-green-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-medium text-green-800 mb-2">Monitor Usage Regularly</h4>
                  <p className="text-sm text-green-700">Check your usage dashboard to stay aware of your limits and plan accordingly.</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <ArrowUpRight className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-blue-800 mb-2">Upgrade Before Limits</h4>
                  <p className="text-sm text-blue-700">Upgrade your plan before hitting limits to ensure uninterrupted service.</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="p-2 bg-purple-100 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Settings className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-purple-800 mb-2">Choose the Right Plan</h4>
                  <p className="text-sm text-purple-700">Consider your team size and usage patterns when selecting a plan.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          {/* Plan Selection */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
            <p className="text-muted-foreground">Start with a free trial, then choose the plan that fits your needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-blue-500' : ''} ${plan.current ? 'border-blue-500 bg-blue-50/30' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-3 py-1">Most Popular</Badge>
                  </div>
                )}
                {plan.current && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-green-600 text-white px-3 py-1">Current Plan</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-3">
                    {plan.icon}
                  </div>
                  <CardTitle className="text-2xl text-gray-900">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-primary">
                    {plan.price}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.period}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.id === 'free' ? (
                    <Button 
                      className="w-full h-12 text-lg font-semibold bg-gray-600 hover:bg-gray-700"
                      size="lg"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : plan.current ? (
                    <Button 
                      className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
                      size="lg"
                      disabled
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handlePlanSelect(plan.id as 'pro' | 'business')}
                      className="w-full h-12 text-lg font-semibold"
                      size="lg"
                    >
                      Choose Plan
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feature Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Feature Comparison</CardTitle>
              <p className="text-muted-foreground">Compare all features across plans to make the best choice</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Feature</th>
                      <th className="text-center p-3 font-medium">Free Trial</th>
                      <th className="text-center p-3 font-medium">Pro Plan</th>
                      <th className="text-center p-3 font-medium">Business Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3">Feedback Collection</td>
                      <td className="text-center p-3">50 responses</td>
                      <td className="text-center p-3">300 responses</td>
                      <td className="text-center p-3">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">AI Insights</td>
                      <td className="text-center p-3">5 insights</td>
                      <td className="text-center p-3">50 insights</td>
                      <td className="text-center p-3">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Analytics</td>
                      <td className="text-center p-3">5 reports</td>
                      <td className="text-center p-3">100 reports</td>
                      <td className="text-center p-3">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Reports</td>
                      <td className="text-center p-3">2 reports</td>
                      <td className="text-center p-3">20 reports</td>
                      <td className="text-center p-3">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Team Members</td>
                      <td className="text-center p-3">1 member</td>
                      <td className="text-center p-3">5 members</td>
                      <td className="text-center p-3">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Export Formats</td>
                      <td className="text-center p-3">CSV</td>
                      <td className="text-center p-3">CSV, PDF, Excel</td>
                      <td className="text-center p-3">CSV, PDF, Excel</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Support</td>
                      <td className="text-center p-3">Email</td>
                      <td className="text-center p-3">Email, Chat</td>
                      <td className="text-center p-3">Email, Chat, Priority</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3">Data Retention</td>
                      <td className="text-center p-3">8 days retention</td>
                      <td className="text-center p-3">12 months retention</td>
                      <td className="text-center p-3">Unlimited retention</td>
                    </tr>
                    <tr>
                      <td className="p-3">Priority Support</td>
                      <td className="text-center p-3">No</td>
                      <td className="text-center p-3">No</td>
                      <td className="text-center p-3">Yes</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="space-y-3">
                    <h4 className="font-semibold text-lg">{faq.question}</h4>
                    <p className="text-muted-foreground">{faq.answer}</p>
                    {index < faqs.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Receipt className="h-5 w-5" />
                Transaction History
              </CardTitle>
              <p className="text-muted-foreground">Your payment and subscription history</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-left p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionHistory.map((transaction, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-3">{transaction.date}</td>
                        <td className="p-3">{transaction.description}</td>
                        <td className="p-3 font-medium">{transaction.amount}</td>
                        <td className="p-3">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {transaction.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button variant="outline" size="sm">
                            {transaction.receipt}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
