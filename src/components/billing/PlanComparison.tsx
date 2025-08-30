import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Zap, Star } from 'lucide-react';
import { getPlanLimits, getPlanPricing } from '@/hooks/useBillingSystem';

interface PlanComparisonProps {
  currentPlan: 'trial' | 'free' | 'pro' | 'business';
  onUpgrade: (plan: 'pro' | 'business') => void;
  showUpgradeButtons?: boolean;
}

const PlanComparison: React.FC<PlanComparisonProps> = ({ 
  currentPlan, 
  onUpgrade, 
  showUpgradeButtons = true 
}) => {
  const plans = [
    {
      id: 'trial',
      name: 'Free Trial',
      description: 'Perfect for trying out NoteX',
      price: 0,
      currency: 'NGN',
      period: '8 days',
      features: [
        { name: 'Feedback Collection', limit: 50, unit: 'responses' },
        { name: 'AI Insights', limit: 5, unit: 'insights' },
        { name: 'Basic Analytics', limit: 5, unit: 'reports' },
        { name: 'Reports', limit: 2, unit: 'reports' },
        { name: 'Team Members', limit: 1, unit: 'member' },
        { name: 'Export Formats', limit: ['CSV'], unit: 'formats' },
        { name: 'Support', limit: ['Email'], unit: 'channels' },
        { name: 'Data Retention', limit: '8 days', unit: 'retention' }
      ],
      popular: false,
      comingSoon: false
    },
    {
      id: 'free',
      name: 'Free Plan',
      description: 'Basic features for small teams',
      price: 0,
      currency: 'NGN',
      period: 'month',
      features: [
        { name: 'Feedback Collection', limit: 10, unit: 'responses' },
        { name: 'AI Insights', limit: 2, unit: 'insights' },
        { name: 'Basic Analytics', limit: 2, unit: 'reports' },
        { name: 'Reports', limit: 1, unit: 'report' },
        { name: 'Team Members', limit: 1, unit: 'member' },
        { name: 'Export Formats', limit: ['CSV'], unit: 'formats' },
        { name: 'Support', limit: ['Email'], unit: 'channels' },
        { name: 'Data Retention', limit: '30 days', unit: 'retention' }
      ],
      popular: false,
      comingSoon: false
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      description: 'Advanced features for growing businesses',
      price: 35000,
      currency: 'NGN',
      period: 'month',
      features: [
        { name: 'Feedback Collection', limit: 300, unit: 'responses' },
        { name: 'AI Insights', limit: 50, unit: 'insights' },
        { name: 'Advanced Analytics', limit: 100, unit: 'reports' },
        { name: 'Reports', limit: 20, unit: 'reports' },
        { name: 'Team Members', limit: 5, unit: 'members' },
        { name: 'Export Formats', limit: ['CSV', 'PDF', 'Excel'], unit: 'formats' },
        { name: 'Support', limit: ['Email', 'Chat'], unit: 'channels' },
        { name: 'Data Retention', limit: '12 months', unit: 'retention' },
        { name: 'Priority Support', limit: false, unit: 'feature' },
        { name: 'API Access', limit: false, unit: 'feature' }
      ],
      popular: true,
      comingSoon: false
    },
    {
      id: 'business',
      name: 'Business Plan',
      description: 'Enterprise features for large organizations',
      price: 53000,
      currency: 'NGN',
      period: 'month',
      features: [
        { name: 'Feedback Collection', limit: -1, unit: 'unlimited' },
        { name: 'AI Insights', limit: -1, unit: 'unlimited' },
        { name: 'Enterprise Analytics', limit: -1, unit: 'unlimited' },
        { name: 'Reports', limit: -1, unit: 'unlimited' },
        { name: 'Team Members', limit: -1, unit: 'unlimited' },
        { name: 'Export Formats', limit: ['CSV', 'PDF', 'Excel', 'API'], unit: 'formats' },
        { name: 'Support', limit: ['Email', 'Chat', 'Phone', 'Priority'], unit: 'channels' },
        { name: 'Data Retention', limit: 'Unlimited', unit: 'retention' },
        { name: 'Priority Support', limit: true, unit: 'feature' },
        { name: 'API Access', limit: true, unit: 'feature' },
        { name: 'Predictive Analytics', limit: true, unit: 'feature' },
        { name: 'Custom Integrations', limit: true, unit: 'feature' }
      ],
      popular: false,
      comingSoon: false
    }
  ];

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price / 100);
  };

  const getFeatureDisplay = (feature: any) => {
    if (feature.limit === -1) {
      return { text: 'Unlimited', icon: <Check className="h-4 w-4 text-green-600" />, color: 'text-green-600' };
    }
    
    if (Array.isArray(feature.limit)) {
      return { text: feature.limit.join(', '), icon: <Check className="h-4 w-4 text-green-600" />, color: 'text-green-600' };
    }
    
    if (typeof feature.limit === 'boolean') {
      if (feature.limit) {
        return { text: 'Yes', icon: <Check className="h-4 w-4 text-green-600" />, color: 'text-green-600' };
      } else {
        return { text: 'No', icon: <X className="h-4 w-4 text-gray-400" />, color: 'text-gray-400' };
      }
    }
    
    return { text: `${feature.limit} ${feature.unit}`, icon: <Check className="h-4 w-4 text-green-600" />, color: 'text-green-600' };
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Choose Your Plan</h2>
        <p className="text-muted-foreground mt-2">
          Start with a free trial, then choose the plan that fits your needs
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const isUpgradeable = (currentPlan === 'trial' || currentPlan === 'free') && plan.id === 'pro';
          const isDowngradeable = currentPlan === 'business' && plan.id === 'pro';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.popular ? 'ring-2 ring-blue-500' : ''} ${isCurrentPlan ? 'border-blue-500 bg-blue-50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-3 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-600 text-white px-3 py-1">
                    <Check className="h-3 w-3 mr-1" />
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="flex items-center justify-center gap-2">
                  {plan.id === 'business' && <Crown className="h-5 w-5 text-amber-600" />}
                  {plan.id === 'pro' && <Zap className="h-5 w-5 text-blue-600" />}
                  {plan.name}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                
                <div className="mt-4">
                  <div className="text-3xl font-bold">
                    {formatPrice(plan.price, plan.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    per {plan.period}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {plan.features.map((feature, index) => {
                    const display = getFeatureDisplay(feature);
                    return (
                      <div key={index} className="flex items-center gap-3">
                        {display.icon}
                        <span className={`text-sm ${display.color}`}>
                          {feature.name}: {display.text}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {showUpgradeButtons && (
                  <div className="pt-4">
                    {isCurrentPlan ? (
                      <Button disabled className="w-full" variant="outline">
                        Current Plan
                      </Button>
                    ) : isUpgradeable ? (
                      <Button 
                        onClick={() => onUpgrade('pro')} 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Upgrade to Pro
                      </Button>
                    ) : isDowngradeable ? (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => onUpgrade('pro')}
                      >
                        Downgrade to Pro
                      </Button>
                    ) : plan.id === 'business' && (currentPlan === 'trial' || currentPlan === 'free') ? (
                      <Button 
                        onClick={() => onUpgrade('business')} 
                        className="w-full bg-amber-600 hover:bg-amber-700"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Business
                      </Button>
                    ) : plan.id === 'business' && currentPlan === 'pro' ? (
                      <Button 
                        onClick={() => onUpgrade('business')} 
                        className="w-full bg-amber-600 hover:bg-amber-700"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Upgrade to Business
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => onUpgrade(plan.id as 'pro' | 'business')}
                      >
                        Choose Plan
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Plan Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Feature Comparison</CardTitle>
          <CardDescription>
            Compare all features across plans to make the best choice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 font-medium">Free Trial</th>
                  <th className="text-center py-3 px-4 font-medium">Free Plan</th>
                  <th className="text-center py-3 px-4 font-medium">Pro Plan</th>
                  <th className="text-center py-3 px-4 font-medium">Business Plan</th>
                </tr>
              </thead>
              <tbody>
                {plans[0].features.map((feature, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-4 font-medium">{feature.name}</td>
                    {plans.map((plan) => {
                      const planFeature = plan.features[index];
                      const display = getFeatureDisplay(planFeature);
                      return (
                        <td key={plan.id} className="text-center py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {display.icon}
                            <span className={display.color}>{display.text}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Can I change my plan anytime?</h4>
            <p className="text-sm text-muted-foreground">
              Yes! You can upgrade your plan at any time. Downgrades take effect at the end of your current billing period.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">What happens when my trial expires?</h4>
            <p className="text-sm text-muted-foreground">
              You'll be moved to the Free plan with limited features. Upgrade to Pro or Business to continue using advanced features.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Is there a setup fee?</h4>
            <p className="text-sm text-muted-foreground">
              No setup fees! Start with a free trial and only pay when you're ready to upgrade.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
            <p className="text-sm text-muted-foreground">
              Absolutely! Cancel your subscription anytime and continue using your plan until the end of the billing period.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanComparison;