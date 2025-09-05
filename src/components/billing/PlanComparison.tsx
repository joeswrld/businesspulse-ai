import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown, Zap, Star, Sparkles, ArrowRight, Infinity } from 'lucide-react';
import { getPlanLimits, getPlanPricing } from '@/hooks/useBillingSystem';

interface PlanComparisonProps {
  currentPlan: 'trial' | 'pro' | 'business';
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
      planCode: null,
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
      id: 'pro',
      name: 'Pro Plan',
      planCode: 'PLN_4z2wpgmw41w2k7r',
      description: 'Advanced features for growing businesses',
      price: 3500000, // ₦35,000 in kobo
      currency: 'NGN',
      period: '30 days',
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
      planCode: 'PLN_esryg99ztsy9xc8',
      description: 'Enterprise features for large organizations',
      price: 5300000, // ₦53,000 in kobo
      currency: 'NGN',
      period: '30 days',
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
    // Convert from kobo to naira
    const amountInNaira = price / 100;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountInNaira);
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
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h2 className="text-3xl font-bold text-gray-900">Choose Your Plan</h2>
        </div>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Start with a free trial, then choose the plan that fits your business needs
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const isUpgradeable = currentPlan === 'trial' && plan.id === 'pro';
          const isDowngradeable = currentPlan === 'business' && plan.id === 'pro';
          
          return (
            <Card 
              key={plan.id} 
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                plan.popular ? 'ring-2 ring-blue-500 shadow-lg scale-105' : 'shadow-md hover:shadow-lg'
              } ${
                isCurrentPlan ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-white'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 text-sm font-medium shadow-lg">
                    <Star className="h-4 w-4 mr-2" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 text-sm font-medium shadow-lg">
                    <Check className="h-4 w-4 mr-2" />
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-6 pt-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  {plan.id === 'business' && (
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                  )}
                  {plan.id === 'pro' && (
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                  )}
                  {plan.id === 'trial' && (
                    <div className="p-3 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
                
                <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-gray-600 mb-6">
                  {plan.description}
                </CardDescription>
                
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    {formatPrice(plan.price, plan.currency)}
                  </div>
                  <div className="text-sm text-gray-600">
                    per {plan.period}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {plan.features.map((feature, index) => {
                    const display = getFeatureDisplay(feature);
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-gray-100">
                        <div className="flex-shrink-0">
                          {display.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {feature.name}
                          </div>
                          <div className={`text-sm ${display.color} font-medium`}>
                            {display.text}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {showUpgradeButtons && (
                  <div className="pt-6 border-t border-gray-200">
                    {isCurrentPlan ? (
                      <Button disabled className="w-full bg-gray-100 text-gray-500 cursor-not-allowed py-3 rounded-lg font-medium">
                        <Check className="h-5 w-5 mr-2" />
                        Current Plan
                      </Button>
                    ) : isUpgradeable ? (
                      <Button 
                        onClick={() => onUpgrade('pro')} 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Zap className="h-5 w-5 mr-2" />
                        Upgrade to Pro
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : isDowngradeable ? (
                      <Button 
                        variant="outline" 
                        className="w-full border-2 border-blue-200 text-blue-700 hover:bg-blue-50 py-3 rounded-lg font-medium transition-all duration-200"
                        onClick={() => onUpgrade('pro')}
                      >
                        Downgrade to Pro
                      </Button>
                    ) : plan.id === 'business' && currentPlan === 'trial' ? (
                      <Button 
                        onClick={() => onUpgrade('business')} 
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Crown className="h-5 w-5 mr-2" />
                        Upgrade to Business
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : plan.id === 'business' && currentPlan === 'pro' ? (
                      <Button 
                        onClick={() => onUpgrade('business')} 
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Crown className="h-5 w-5 mr-2" />
                        Upgrade to Business
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full border-2 border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition-all duration-200"
                        onClick={() => onUpgrade(plan.id as 'pro' | 'business')}
                      >
                        Choose Plan
                        <ArrowRight className="h-4 w-4 ml-2" />
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
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Detailed Feature Comparison</CardTitle>
              <CardDescription className="text-gray-600">
                Compare all features across plans to make the best choice
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">Feature</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">Free Trial</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">Pro Plan</th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-900">Business Plan</th>
                </tr>
              </thead>
              <tbody>
                {plans[0].features.map((feature, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200">
                    <td className="py-4 px-6 font-medium text-gray-900">{feature.name}</td>
                    {plans.map((plan) => {
                      const planFeature = plan.features[index];
                      const display = getFeatureDisplay(planFeature);
                      return (
                        <td key={plan.id} className="text-center py-4 px-6">
                          <div className="flex items-center justify-center gap-2">
                            {display.icon}
                            <span className={`${display.color} font-medium`}>{display.text}</span>
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
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Frequently Asked Questions</CardTitle>
              <CardDescription className="text-gray-600">
                Everything you need to know about our billing and plans
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-blue-600" />
              Can I change my plan anytime?
            </h4>
            <p className="text-sm text-gray-700">
              Yes! You can upgrade your plan at any time. Downgrades take effect at the end of your current billing period.
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-green-600" />
              What happens when my trial expires?
            </h4>
            <p className="text-sm text-gray-700">
              When your trial expires, you'll need to upgrade to Pro or Business to continue using advanced features. No automatic downgrade to a free plan.
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-purple-600" />
              Is there a setup fee?
            </h4>
            <p className="text-sm text-gray-700">
              No setup fees! Start with a free trial and only pay when you're ready to upgrade.
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-orange-600" />
              Can I cancel anytime?
            </h4>
            <p className="text-sm text-gray-700">
              Absolutely! Cancel your subscription anytime and continue using your plan until the end of the billing period.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanComparison;