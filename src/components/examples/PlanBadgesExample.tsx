import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, Shield, Users, Star } from 'lucide-react';

/**
 * Example component showcasing all plan badges
 */
export function PlanBadgesExample() {
  const plans = [
    {
      name: 'Free Plan',
      description: 'Basic features with limitations',
      badge: {
        label: 'Free Plan',
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: <Users className="h-3 w-3" />
      },
      features: ['Basic analytics', 'Limited reports', 'Email support']
    },
    {
      name: 'Free Trial',
      description: '8-day trial of Pro features',
      badge: {
        label: 'Free Trial (5 days left)',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: <Star className="h-3 w-3" />
      },
      features: ['All Pro features', 'Full access', 'No commitment']
    },
    {
      name: 'Pro Plan',
      description: 'Advanced features for individuals',
      badge: {
        label: 'Pro Plan',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: <Crown className="h-3 w-3" />
      },
      features: ['Advanced analytics', 'Unlimited reports', 'Priority support', 'Custom insights']
    },
    {
      name: 'Business Plan',
      description: 'Team features and advanced analytics',
      badge: {
        label: 'Business Plan',
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: <Zap className="h-3 w-3" />
      },
      features: ['Team collaboration', 'Advanced analytics', 'API access', 'Dedicated support', 'Custom integrations']
    },
    {
      name: 'Enterprise Plan',
      description: 'Custom solutions for large organizations',
      badge: {
        label: 'Enterprise Plan',
        color: 'bg-purple-100 text-purple-800 border-purple-300',
        icon: <Shield className="h-3 w-3" />
      },
      features: ['Custom solutions', 'SLA guarantee', 'On-premise deployment', '24/7 support', 'Custom training']
    },
    {
      name: 'Payment Due',
      description: 'Subscription requires attention',
      badge: {
        label: 'Pro Plan - Payment Due',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: <Crown className="h-3 w-3" />
      },
      features: ['Payment required', 'Service may be limited', 'Contact support']
    },
    {
      name: 'Cancelled',
      description: 'Subscription has been cancelled',
      badge: {
        label: 'Free Plan',
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: <Users className="h-3 w-3" />
      },
      features: ['Basic features only', 'No premium access', 'Can reactivate anytime']
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Plan Status Badges</h2>
        <p className="text-muted-foreground">
          All available plan badges with their respective colors and states
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <Badge className={`${plan.badge.color} flex items-center space-x-1`}>
                  {plan.badge.icon}
                  <span>{plan.badge.label}</span>
                </Badge>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Badge Color Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Color Reference</CardTitle>
          <CardDescription>
            Color scheme for different plan types and states
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Free Plans</h4>
              <div className="space-y-1">
                <Badge className="bg-gray-100 text-gray-800 border-gray-300">Free Plan</Badge>
                <Badge className="bg-blue-100 text-blue-800 border-blue-300">Free Trial</Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Paid Plans</h4>
              <div className="space-y-1">
                <Badge className="bg-green-100 text-green-800 border-green-300">Pro Plan</Badge>
                <Badge className="bg-amber-100 text-amber-800 border-amber-300">Business Plan</Badge>
                <Badge className="bg-purple-100 text-purple-800 border-purple-300">Enterprise Plan</Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Status States</h4>
              <div className="space-y-1">
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Payment Due</Badge>
                <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Special States</h4>
              <div className="space-y-1">
                <Badge className="bg-orange-100 text-orange-800 border-orange-300">Coming Soon</Badge>
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">Beta</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PlanBadgesExample;