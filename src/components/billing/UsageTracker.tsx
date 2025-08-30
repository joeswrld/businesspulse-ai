import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  MessageSquare, 
  Brain, 
  FileText, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Infinity,
  Zap,
  Crown
} from 'lucide-react';
import { UsageData, UsageLimits } from '@/hooks/useBillingSystem';

interface UsageTrackerProps {
  usageData: UsageData;
  planLimits: UsageLimits;
  currentPlan: 'trial' | 'free' | 'pro' | 'business';
  onUpgrade: (plan: 'pro' | 'business') => void;
}

const UsageTracker: React.FC<UsageTrackerProps> = ({
  usageData,
  planLimits,
  currentPlan,
  onUpgrade
}) => {
  const features = [
    {
      key: 'feedback',
      name: 'Feedback Collection',
      icon: MessageSquare,
      description: 'Customer feedback submissions',
      color: 'blue',
      unit: 'responses'
    },
    {
      key: 'insights',
      name: 'AI Insights',
      icon: Brain,
      description: 'AI-powered business insights',
      color: 'purple',
      unit: 'insights'
    },
    {
      key: 'analytics',
      name: 'Analytics Reports',
      icon: BarChart3,
      description: 'Data analytics and reports',
      color: 'green',
      unit: 'reports'
    },
    {
      key: 'reports',
      name: 'Detailed Reports',
      icon: FileText,
      description: 'Comprehensive business reports',
      color: 'orange',
      unit: 'reports'
    },
    {
      key: 'teams',
      name: 'Team Members',
      icon: Users,
      description: 'Team collaboration features',
      color: 'indigo',
      unit: 'members'
    }
  ];

  const getUsagePercentage = (featureKey: string) => {
    const limit = planLimits[featureKey as keyof UsageLimits] as number;
    const usage = usageData[`${featureKey}_count` as keyof UsageData] as number;
    
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 100; // No access
    
    return Math.min(100, (usage / limit) * 100);
  };

  const isLimitReached = (featureKey: string) => {
    const limit = planLimits[featureKey as keyof UsageLimits] as number;
    const usage = usageData[`${featureKey}_count` as keyof UsageData] as number;
    
    if (limit === -1) return false; // Unlimited
    return usage >= limit;
  };

  const getRemaining = (featureKey: string) => {
    const limit = planLimits[featureKey as keyof UsageLimits] as number;
    const usage = usageData[`${featureKey}_count` as keyof UsageData] as number;
    
    if (limit === -1) return 'Unlimited';
    return Math.max(0, limit - usage);
  };

  const getStatusColor = (featureKey: string) => {
    const percentage = getUsagePercentage(featureKey);
    const reached = isLimitReached(featureKey);
    
    if (reached) return 'red';
    if (percentage >= 80) return 'orange';
    if (percentage >= 60) return 'yellow';
    return 'green';
  };

  const getStatusIcon = (featureKey: string) => {
    const reached = isLimitReached(featureKey);
    const percentage = getUsagePercentage(featureKey);
    
    if (reached) return <XCircle className="h-5 w-5 text-red-600" />;
    if (percentage >= 80) return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    if (percentage >= 60) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  const getStatusText = (featureKey: string) => {
    const reached = isLimitReached(featureKey);
    const percentage = getUsagePercentage(featureKey);
    
    if (reached) return 'Limit Reached';
    if (percentage >= 80) return 'Almost Full';
    if (percentage >= 60) return 'Getting Full';
    return 'Good';
  };

  const hasAnyLimitsReached = features.some(feature => isLimitReached(feature.key));
  const hasAnyWarnings = features.some(feature => getUsagePercentage(feature.key) >= 80);

  return (
    <div className="space-y-6">
      {/* Usage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Overview
          </CardTitle>
          <CardDescription>
            Track your current usage against your {currentPlan === 'trial' ? 'trial' : currentPlan} plan limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasAnyLimitsReached && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Some features have reached their limits!</strong> Upgrade your plan to continue using these features.
              </AlertDescription>
            </Alert>
          )}

          {hasAnyWarnings && !hasAnyLimitsReached && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Usage Warning:</strong> Some features are approaching their limits. Consider upgrading soon.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const usage = usageData[`${feature.key}_count` as keyof UsageData] as number;
              const limit = planLimits[feature.key as keyof UsageLimits] as number;
              const percentage = getUsagePercentage(feature.key);
              const reached = isLimitReached(feature.key);
              const statusColor = getStatusColor(feature.key);
              const statusIcon = getStatusIcon(feature.key);
              const statusText = getStatusText(feature.key);
              const remaining = getRemaining(feature.key);
              
              const IconComponent = feature.icon;
              
              return (
                <Card 
                  key={feature.key} 
                  className={`relative ${
                    reached 
                      ? 'border-red-200 bg-red-50' 
                      : percentage >= 80 
                        ? 'border-orange-200 bg-orange-50' 
                        : 'border-gray-200'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className={`h-5 w-5 text-${statusColor}-600`} />
                        <CardTitle className="text-base">{feature.name}</CardTitle>
                      </div>
                      <Badge 
                        variant={reached ? 'destructive' : percentage >= 80 ? 'secondary' : 'default'}
                        className="text-xs"
                      >
                        {statusText}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Usage</span>
                      <span className="font-medium">
                        {usage} {limit === -1 ? '' : `/ ${limit}`} {feature.unit}
                      </span>
                    </div>
                    
                    {limit !== -1 && (
                      <>
                        <Progress 
                          value={percentage} 
                          className={`h-2 ${
                            reached 
                              ? 'bg-red-100' 
                              : percentage >= 80 
                                ? 'bg-orange-100' 
                                : ''
                          }`}
                        />
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {reached ? 'Limit reached' : `${remaining} remaining`}
                          </span>
                          <span>{Math.round(percentage)}%</span>
                        </div>
                      </>
                    )}
                    
                    {limit === -1 && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Infinity className="h-4 w-4" />
                        <span>Unlimited usage</span>
                      </div>
                    )}
                    
                    {reached && (
                      <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                        <strong>Upgrade required!</strong> You've reached the limit for this feature.
                      </div>
                    )}
                    
                    {percentage >= 80 && !reached && (
                      <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
                        <strong>Almost full!</strong> Consider upgrading soon to avoid hitting limits.
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Recommendations */}
      {(hasAnyLimitsReached || hasAnyWarnings) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Zap className="h-5 w-5" />
              Upgrade Recommendations
            </CardTitle>
            <CardDescription className="text-blue-700">
              Based on your current usage, here are our recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasAnyLimitsReached && (
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">🚨 Immediate Action Required</h4>
                <p className="text-blue-800 text-sm mb-3">
                  Some features have reached their limits and are no longer available. Upgrade now to restore access.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => onUpgrade('pro')} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                  <Button 
                    onClick={() => onUpgrade('business')} 
                    variant="outline"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Business
                  </Button>
                </div>
              </div>
            )}
            
            {hasAnyWarnings && !hasAnyLimitsReached && (
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">⚠️ Usage Warning</h4>
                <p className="text-blue-800 text-sm mb-3">
                  Some features are approaching their limits. Consider upgrading to avoid interruptions.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => onUpgrade('pro')} 
                    variant="outline"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                  <Button 
                    onClick={() => onUpgrade('business')} 
                    variant="outline"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Business
                  </Button>
                </div>
              </div>
            )}
            
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Plan Benefits</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• 6x more feedback submissions (300 vs 50)</li>
                <li>• 10x more AI insights (50 vs 5)</li>
                <li>• 20x more reports (20 vs 2)</li>
                <li>• PDF & Excel export formats</li>
                <li>• Chat support + longer data retention</li>
              </ul>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">👑 Business Plan Benefits</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Unlimited usage across all features</li>
                <li>• Priority phone support</li>
                <li>• API access for integrations</li>
                <li>• Predictive analytics</li>
                <li>• Custom integrations</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Tips</CardTitle>
          <CardDescription>
            Make the most of your current plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium">Monitor Usage Regularly</h4>
              <p className="text-sm text-muted-foreground">
                Check your usage dashboard to stay aware of your limits and plan accordingly.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Zap className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium">Upgrade Before Limits</h4>
              <p className="text-sm text-muted-foreground">
                Upgrade your plan before hitting limits to ensure uninterrupted service.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Crown className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium">Choose the Right Plan</h4>
              <p className="text-sm text-muted-foreground">
                Consider your team size and usage patterns when selecting a plan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageTracker;