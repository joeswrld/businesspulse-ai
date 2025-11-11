import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Sparkles, Star, ArrowRight, X } from 'lucide-react';

interface TwoPlanLayoutTestProps {
  currentPlan: 'trial' | 'business';
  onUpgrade: (plan: 'business') => void;
}

const TwoPlanLayoutTest: React.FC<TwoPlanLayoutTestProps> = ({ 
  currentPlan, 
  onUpgrade 
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
        '50 feedback submissions',
        '10 AI insights',
        '10 analytics reports',
        '5 detailed reports',
        '1 team member',
        'CSV and PDF export',
        'Email, Chat and Phone support',
        '8 days data retention',        
        'Custom Form integrations'
      ],
      popular: false
    },
    {
      id: 'business',
      name: 'Business Plan',
      description: 'Complete solution for businesses of all sizes',
      price: 2600000, // ₦26,000 in kobo
      currency: 'NGN',
      period: '30 days',
      features: [
        'Unlimited feedback submissions',
        'Unlimited AI insights',
        'Unlimited analytics reports',
        'Unlimited detailed reports',
        'Unlimited team members',
        'All export formats (CSV, PDF, Excel)',
        'Priority support (Email, Chat)',
        'Unlimited data retention',
        'Predictive analytics',
        'Custom Form integrations'
      ],
      popular: true
    }
  ];

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free';
    const amountInNaira = price / 100;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountInNaira);
  };

  return (
    <div className="py-12 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Choose Your Plan</h2>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Start with a free trial, then upgrade to Business for unlimited access to all features
          </p>
        </div>

        <div className="grid gap-6 lg:gap-8 md:grid-cols-2 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const isUpgradeable = currentPlan === 'trial' && plan.id === 'business';
            
            return (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  plan.popular ? 'ring-2 ring-amber-500 shadow-lg scale-105' : 'shadow-md hover:shadow-lg'
                } ${
                  isCurrentPlan ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100' : 'bg-white'
                } ${
                  plan.id === 'business' ? 'border-2 border-amber-200' : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2 text-sm font-medium shadow-lg">
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
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-gray-100">
                        <div className="flex-shrink-0">
                          <Check className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">
                            {feature}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    {isCurrentPlan ? (
                      <Button disabled className="w-full bg-gray-100 text-gray-500 cursor-not-allowed py-3 rounded-lg font-medium">
                        <Check className="h-5 w-5 mr-2" />
                        Current Plan
                      </Button>
                    ) : isUpgradeable ? (
                      <Button 
                        onClick={() => onUpgrade('business')} 
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Crown className="h-5 w-5 mr-2" />
                        Upgrade to Business
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : plan.id === 'trial' && currentPlan === 'business' ? (
                      <Button 
                        variant="outline" 
                        className="w-full border-2 border-gray-200 text-gray-500 cursor-not-allowed py-3 rounded-lg font-medium"
                        disabled
                      >
                        <X className="h-5 w-5 mr-2" />
                        Cannot Downgrade
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full border-2 border-gray-200 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition-all duration-200"
                        onClick={() => onUpgrade('business')}
                      >
                        Choose Plan
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TwoPlanLayoutTest;