import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Brain, 
  BarChart3, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Infinity,
  RefreshCw,
  Loader2,
  Lock,
  Clock,
  Zap,
  Crown,
  XCircle,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useUsageOverview } from '@/hooks/useUsageOverview';
import { toast } from 'sonner';



interface UsageSummary {
  user_id: string;
  plan_code: string;
  plan_name: string;
  feedback_count: number;
  insights_count: number;
  analytics_count: number;
  reports_count: number;
  feedback_limit: number;
  insights_limit: number;
  analytics_limit: number;
  reports_limit: number;
  feedback_remaining: number;
  insights_remaining: number;
  analytics_remaining: number;
  reports_remaining: number;
  month_start: string;
}

interface SubscriptionDetails {
  next_billing_date: string | null;
  trial_ends_at: string | null;
  subscription_status: string;
  plan_price?: number | null;
  plan_currency?: string | null;
  id?: string;
  created_at?: string;
  paystack_customer_id?: string;
  paystack_subscription_id?: string;
  plan?: string;
}


interface UsageOverviewProps {
  userId: string;
  onUpgrade?: (plan: 'business') => void;
  refreshTrigger?: number;
}

export default function UsageOverview({ userId, onUpgrade, refreshTrigger }: UsageOverviewProps) {
  const { data, loading, refreshing, error, refresh } = useUsageOverview(userId);


  // Trigger refresh when refreshTrigger changes
  React.useEffect(() => {
    if (refreshTrigger) {
      refresh();
    }
  }, [refreshTrigger, refresh]);

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanPricing = (planType: string) => {
    const pricing = {
      'trial': { price: 0, currency: 'NGN', period: '8 days' },
      'business': { price: 5300000, currency: 'NGN', period: '30 days' } // ₦53,000 in kobo
    };
    return pricing[planType as keyof typeof pricing] || pricing.trial;
  };

  const getPlanDisplayName = (planType: string) => {
    const names = {
      'trial': 'Free Trial',
      'business': 'Business Plan'
    };
    return names[planType as keyof typeof names] || 'Free Trial';
  };

  const getStatusColor = (feature: string, isLimitReached: boolean, percentage: number) => {
    if (isLimitReached) return 'text-red-600';
    if (percentage >= 80) return 'text-orange-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (feature: string, isLimitReached: boolean, percentage: number, limit: number) => {
    if (limit === -1) return <Infinity className="h-4 w-4 text-green-600" />;
    if (isLimitReached) return <Lock className="h-4 w-4 text-red-600" />;
    if (percentage >= 80) return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    if (percentage >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  if (loading) {
    return (
      <Card className="p-6 rounded-xl shadow-lg bg-white border-0">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading usage data...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 rounded-xl shadow-lg bg-white border-0">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading usage data: {error}
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6 rounded-xl shadow-lg bg-white border-0">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to load usage data. Please try again.
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  // Trial expired state
  if (data.isTrialExpired) {
    return (
      <Card className="p-6 rounded-xl shadow-lg bg-white border-0 border-red-200">
        <div className="text-center py-8">
          <div className="p-4 bg-red-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Trial Expired</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your free trial has expired or you've reached your limits. Upgrade to Business to continue using advanced features.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => onUpgrade?.('business')}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Business
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const features = [
    {
      key: 'feedback',
      name: 'Feedback Collection',
      icon: MessageSquare,
      description: 'Customer feedback submissions',
      count: data.usage.feedback_count,
      limit: data.limits.feedback,
      remaining: data.remaining.feedback,
      percentage: data.percentages.feedback,
      isLimitReached: data.isLimitReached.feedback
    },
    {
      key: 'insights',
      name: 'AI Insights',
      icon: Brain,
      description: 'AI-powered business insights',
      count: data.usage.insights_count,
      limit: data.limits.insights,
      remaining: data.remaining.insights,
      percentage: data.percentages.insights,
      isLimitReached: data.isLimitReached.insights
    },
    {
      key: 'analytics',
      name: 'Analytics Reports',
      icon: BarChart3,
      description: 'Data analytics and reports',
      count: data.usage.analytics_count,
      limit: data.limits.analytics,
      remaining: data.remaining.analytics,
      percentage: data.percentages.analytics,
      isLimitReached: data.isLimitReached.analytics
    },
    {
      key: 'reports',
      name: 'Detailed Reports',
      icon: FileText,
      description: 'Comprehensive business reports',
      count: data.usage.reports_count,
      limit: data.limits.reports,
      remaining: data.remaining.reports,
      percentage: data.percentages.reports,
      isLimitReached: data.isLimitReached.reports
    }
  ];

  const planPricing = getPlanPricing(data.subscription.plan_type);
  const planDisplayName = getPlanDisplayName(data.subscription.plan_type);

  return (
    <Card className="p-6 rounded-xl shadow-lg bg-white border-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usage Overview</h2>
          <p className="text-sm text-gray-600 mt-1">Free plan resets every 30 days (rolling). Limits per cycle: Feedback 50, Insights 5, Reports 5. Data retention: 8 days.</p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-gray-600">Current Plan:</p>
              <Badge variant="outline" className="font-medium">
                {planDisplayName}
              </Badge>
              {data.subscription.plan_type === 'trial' && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Trial
                </Badge>
              )}
            </div>
            
            {/* Show pricing and renewal date */}
            {data.subscription.plan_type !== 'trial' && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  {formatCurrency(planPricing.price / 100, planPricing.currency)}/month
                </span>
                {data.subscription.renewal_date && (
                  <span>
                    Next Renewal: {formatDate(data.subscription.renewal_date)}
                  </span>
                )}
              </div>
            )}
            
            {data.subscription.plan_type === 'trial' && data.subscription.trial_end && (
              <div className="text-sm text-gray-600">
                Trial ends: {formatDate(data.subscription.trial_end)}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={refreshing}
          className="border-gray-300 hover:bg-gray-50"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {/* Usage Alerts */}
      {features.some(feature => feature.isLimitReached) && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Some features have reached their limits!</strong> Upgrade your plan to continue using these features.
          </AlertDescription>
        </Alert>
      )}

      {features.some(feature => feature.percentage >= 90) && !features.some(feature => feature.isLimitReached) && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Usage Warning:</strong> Some features are very close to their limits. Consider upgrading soon.
          </AlertDescription>
        </Alert>
      )}

      {features.some(feature => feature.percentage >= 70 && feature.percentage < 90) && !features.some(feature => feature.percentage >= 90) && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Usage Notice:</strong> Some features are approaching their limits. Keep an eye on your usage.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => {
          const IconComponent = feature.icon;
          const statusColor = getStatusColor(feature.key, feature.isLimitReached, feature.percentage);
          const statusIcon = getStatusIcon(feature.key, feature.isLimitReached, feature.percentage, feature.limit);
          
          return (
            <div 
              key={feature.key} 
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                feature.isLimitReached 
                  ? 'border-red-200 bg-red-50' 
                  : feature.percentage >= 80 
                    ? 'border-yellow-200 bg-yellow-50' 
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <IconComponent className={`h-5 w-5 ${statusColor}`} />
                  <span className="font-semibold text-gray-900">{feature.name}</span>
                  {statusIcon}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {feature.count}
                    {feature.limit === -1 ? (
                      <span className="text-green-600 text-sm"> / ∞</span>
                    ) : (
                      <span className="text-gray-600 text-sm"> / {feature.limit}</span>
                    )}
                  </div>
                  {feature.limit !== -1 && (
                    <div className="text-xs text-gray-500">
                      {feature.remaining > 0 ? `${feature.remaining} remaining` : 'Limit reached'}
                    </div>
                  )}
                </div>
              </div>
              
              {feature.limit !== -1 && (
                <div className="space-y-2">
                  <Progress 
                    value={feature.percentage} 
                    className="h-3"
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {feature.isLimitReached ? 'Limit reached' : `${feature.remaining} remaining`}
                    </span>
                    <span className="font-medium">{Math.round(feature.percentage)}%</span>
                  </div>
                </div>
              )}
              
              {feature.limit === -1 && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 p-2 rounded">
                  <Infinity className="h-4 w-4" />
                  <span>Unlimited usage</span>
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-3">{feature.description}</p>
              
              {feature.isLimitReached && (
                <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-700">
                  <strong>Limit reached!</strong> You've used {feature.count}/{feature.limit} {feature.name.toLowerCase()}. Upgrade to Business for unlimited access.
                </div>
              )}
              
              {feature.percentage >= 90 && !feature.isLimitReached && (
                <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-700">
                  <strong>Very close to limit!</strong> You've used {feature.count}/{feature.limit} {feature.name.toLowerCase()}. Only {feature.remaining} remaining.
                </div>
              )}
              
              {feature.percentage >= 70 && feature.percentage < 90 && !feature.isLimitReached && (
                <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-700">
                  <strong>Approaching limit.</strong> You've used {feature.count}/{feature.limit} {feature.name.toLowerCase()}. {feature.remaining} remaining.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-xs text-gray-500 text-center">
        Last updated: {new Date().toLocaleTimeString()} • Updates every 30 seconds
      </div>
    </Card>
  );
}