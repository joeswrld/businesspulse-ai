import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  CheckCircle, 
  Zap, 
  Crown, 
  Clock,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { type PlanTier, type FeatureType, PLAN_NAMES, PLAN_PRICING } from '@/lib/billingEnforcement';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (plan: PlanTier) => void;
  currentPlan: PlanTier;
  blockedFeature?: FeatureType;
  trialDaysRemaining?: number;
  isTrialExpired?: boolean;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  currentPlan,
  blockedFeature,
  trialDaysRemaining = 0,
  isTrialExpired = false
}) => {
  if (!isOpen) return null;

  const plans = [
    {
      id: 'pro' as PlanTier,
      name: 'Pro',
      price: '₦35,000',
      pricePerMonth: '₦35,000/month',
      icon: Zap,
      features: [
        '300 feedback submissions (6x increase)',
        '50 AI insights (10x increase)',
        '20 reports (10x increase)',
        'PDF & Excel export formats',
        'Email + Chat support',
        '12 months data retention',
        'Priority processing'
      ],
      planCode: 'PLN_4z2wpgmw41w2k7r',
      popular: currentPlan === 'free'
    },
    {
      id: 'business' as PlanTier,
      name: 'Business',
      price: '₦53,000',
      pricePerMonth: '₦53,000/month',
      icon: Crown,
      features: [
        'Unlimited feedback submissions',
        'Unlimited AI insights',
        'Unlimited reports',
        'All export formats',
        'Priority phone support',
        'Unlimited data retention',
        'Custom Forms integrations',
        'Advanced analytics'
      ],
      planCode: 'PLN_esryg99ztsy9xc8',
      popular: currentPlan === 'pro'
    }
  ];

  const getModalTitle = () => {
    if (isTrialExpired) {
      return 'Trial Expired - Upgrade to Continue';
    }
    
    if (blockedFeature) {
      const featureName = blockedFeature.charAt(0).toUpperCase() + blockedFeature.slice(1);
      return `${featureName} Limit Reached`;
    }
    
    return 'Upgrade Your Plan';
  };

  const getModalDescription = () => {
    if (isTrialExpired) {
      return 'Your free trial has ended. Choose a plan to continue using NoteX and unlock all features.';
    }
    
    if (blockedFeature) {
      return `You've reached your ${blockedFeature} limit. Upgrade to continue using this feature and unlock more capacity.`;
    }
    
    return 'Unlock more features and capacity with a paid plan.';
  };

  const getUrgencyMessage = () => {
    if (isTrialExpired) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Trial Expired</span>
          </div>
          <p className="text-red-700 text-sm">
            Your free trial has ended. Upgrade now to continue using NoteX and access all your data.
          </p>
        </div>
      );
    }
    
    if (trialDaysRemaining > 0 && trialDaysRemaining <= 3) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-yellow-800 mb-2">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Trial Ending Soon</span>
          </div>
          <p className="text-yellow-700 text-sm">
            Your trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}. 
            Upgrade now to avoid losing access to your data.
          </p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{getModalTitle()}</h2>
            <p className="text-gray-600 mt-1">{getModalDescription()}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Urgency Message */}
          {getUrgencyMessage()}

          {/* Current Plan Status */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-600">Current Plan:</span>
              <Badge variant="secondary">{PLAN_NAMES[currentPlan]}</Badge>
            </div>
            {currentPlan === 'free' && (
              <p className="text-sm text-gray-600">
                You're currently on the free trial with limited features.
              </p>
            )}
          </div>

          {/* Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = plan.id === currentPlan;
              const isUpgrade = currentPlan === 'free' || (currentPlan === 'pro' && plan.id === 'business');
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative border-2 transition-all ${
                    plan.popular 
                      ? 'border-blue-500 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-300'
                  } ${isCurrentPlan ? 'opacity-50' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white px-3 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className="flex items-center justify-center mb-2">
                      <Icon className="h-8 w-8 text-gray-600" />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold text-gray-900 mt-2">
                      {plan.pricePerMonth}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      onClick={() => onUpgrade(plan.id)}
                      disabled={isCurrentPlan}
                      className={`w-full ${
                        plan.popular 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-900 hover:bg-gray-800'
                      }`}
                      size="lg"
                    >
                      {isCurrentPlan ? (
                        'Current Plan'
                      ) : isUpgrade ? (
                        <>
                          Upgrade to {plan.name}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      ) : (
                        'Choose Plan'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Benefits Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Why upgrade to a paid plan?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">More Capacity</h4>
                <p className="text-sm text-gray-600">
                  Handle more feedback, generate more insights, and create more reports.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Priority Support</h4>
                <p className="text-sm text-gray-600">
                  Get faster response times and dedicated support channels.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Crown className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Advanced Features</h4>
                <p className="text-sm text-gray-600">
                  Access to advanced analytics, API, and custom integrations.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              All plans include a 30-day money-back guarantee. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;