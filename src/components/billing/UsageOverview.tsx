import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
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
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsageSummary {
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
}

interface UsageOverviewProps {
  userId: string;
  onUpgrade?: (plan: 'pro' | 'business') => void;
}

export default function UsageOverview({ userId, onUpgrade }: UsageOverviewProps) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_user_usage_summary', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error fetching usage data:', error);
        toast.error('Failed to load usage data');
        return;
      }

      if (data && data.length > 0) {
        const usageData = data[0];
        setUsage(usageData);
        
        // Check if trial has expired
        if (usageData.plan_code === 'free') {
          const { data: billingData } = await supabase
            .from('billing_profiles')
            .select('trial_ends_at')
            .eq('id', userId)
            .single();
          
          if (billingData?.trial_ends_at) {
            const trialEnd = new Date(billingData.trial_ends_at);
            const now = new Date();
            setTrialExpired(now > trialEnd);
          }
        }
      }
    } catch (error) {
      console.error('Error in loadUsageData:', error);
      toast.error('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const refreshUsage = async () => {
    try {
      setRefreshing(true);
      await loadUsageData();
      toast.success('Usage data refreshed');
    } catch (error) {
      console.error('Error refreshing usage:', error);
      toast.error('Failed to refresh usage data');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsageData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadUsageData, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  if (loading) {
    return (
      <Card className="p-4 rounded-xl shadow bg-white">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading usage data...</span>
        </div>
      </Card>
    );
  }

  if (!usage) {
    return (
      <Card className="p-4 rounded-xl shadow bg-white">
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
  if (trialExpired && usage.plan_code === 'free') {
    return (
      <Card className="p-6 rounded-xl shadow-lg bg-white border-0 border-red-200">
        <div className="text-center py-8">
          <div className="p-4 bg-red-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Free Trial Expired</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Your Free Trial has expired. Upgrade to Pro or Business to continue collecting feedback and generating insights.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => onUpgrade?.('pro')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
            <Button
              onClick={() => onUpgrade?.('business')}
              variant="outline"
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
      count: usage.feedback_count,
      limit: usage.feedback_limit,
      remaining: usage.feedback_remaining
    },
    {
      key: 'insights',
      name: 'AI Insights',
      icon: Brain,
      description: 'AI-powered business insights',
      count: usage.insights_count,
      limit: usage.insights_limit,
      remaining: usage.insights_remaining
    },
    {
      key: 'analytics',
      name: 'Analytics Reports',
      icon: BarChart3,
      description: 'Data analytics and reports',
      count: usage.analytics_count,
      limit: usage.analytics_limit,
      remaining: usage.analytics_remaining
    },
    {
      key: 'reports',
      name: 'Detailed Reports',
      icon: FileText,
      description: 'Comprehensive business reports',
      count: usage.reports_count,
      limit: usage.reports_limit,
      remaining: usage.reports_remaining
    }
  ];

  const getUsagePercentage = (feature: any) => {
    if (feature.limit === -1) return 0;
    if (feature.limit === 0) return 100;
    return Math.min(100, (feature.count / feature.limit) * 100);
  };

  const isLimitReached = (feature: any) => {
    if (feature.limit === -1) return false;
    return feature.count >= feature.limit;
  };

  const getStatusColor = (feature: any) => {
    if (feature.limit === -1) return 'text-green-600';
    if (isLimitReached(feature)) return 'text-red-600';
    if (getUsagePercentage(feature) > 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (feature: any) => {
    if (feature.limit === -1) return <Infinity className="h-4 w-4 text-green-600" />;
    if (isLimitReached(feature)) return <Lock className="h-4 w-4 text-red-600" />;
    if (getUsagePercentage(feature) > 80) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  return (
    <Card className="p-6 rounded-xl shadow-lg bg-white border-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usage Overview</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">
              Current plan: 
            </p>
            <Badge variant="outline" className="font-medium">
              {usage.plan_name}
            </Badge>
            {usage.plan_code === 'free' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Clock className="h-3 w-3 mr-1" />
                Trial
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshUsage}
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
      {features.some(feature => isLimitReached(feature)) && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Some features have reached their limits!</strong> Upgrade your plan to continue using these features.
          </AlertDescription>
        </Alert>
      )}

      {features.some(feature => getUsagePercentage(feature) > 80) && !features.some(feature => isLimitReached(feature)) && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Usage Warning:</strong> Some features are approaching their limits. Consider upgrading soon.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => {
          const percentage = getUsagePercentage(feature);
          const reached = isLimitReached(feature);
          const IconComponent = feature.icon;
          
          return (
            <div 
              key={feature.key} 
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                reached 
                  ? 'border-red-200 bg-red-50' 
                  : percentage >= 80 
                    ? 'border-yellow-200 bg-yellow-50' 
                    : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <IconComponent className={`h-5 w-5 ${getStatusColor(feature)}`} />
                  <span className="font-semibold text-gray-900">{feature.name}</span>
                  {getStatusIcon(feature)}
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
                    value={percentage} 
                    className="h-3"
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {reached ? 'Limit reached' : `${feature.remaining} remaining`}
                    </span>
                    <span className="font-medium">{Math.round(percentage)}%</span>
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
              
              {reached && (
                <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-700">
                  <strong>Upgrade required!</strong> You've reached the limit for this feature.
                </div>
              )}
              
              {percentage >= 80 && !reached && (
                <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-700">
                  <strong>Almost full!</strong> Consider upgrading soon to avoid hitting limits.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Upgrade Prompts */}
      {usage.plan_code === 'free' && (
        <Alert className="mt-6 border-blue-200 bg-blue-50">
          <Zap className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Upgrade to unlock more features!</strong> Get higher limits and unlimited access with Pro or Business plans.
            {onUpgrade && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onUpgrade('pro')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpgrade('business')}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Business
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 text-xs text-gray-500 text-center">
        Last updated: {new Date().toLocaleTimeString()} • Updates every 30 seconds
      </div>
    </Card>
  );
}
