import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Crown,
  Zap,
  Users,
  FileText,
  Brain,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UsageData {
  feature_type: string;
  usage_count: number;
  limit: number;
  remaining: number;
  percentage: number;
  is_unlimited: boolean;
}

interface PlanInfo {
  plan_name: string;
  plan_display_name: string;
  price_monthly: number;
  features: string[];
}

interface BillingDashboard {
  user_id: string;
  plan: string;
  plan_display_name: string;
  price_monthly: number;
  feedback_limit: number;
  ai_insights_limit: number;
  reports_limit: number;
  team_members_limit: number;
  features: string[];
  current_feedback_usage: number;
  current_ai_insights_usage: number;
  current_reports_usage: number;
  subscription_status: string;
  trial_end_date: string | null;
  subscription_end_date: string | null;
}

const UsageBar: React.FC = () => {
  const { user } = useAuth();
  const [billingData, setBillingData] = useState<BillingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBillingData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_billing_dashboard')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading billing data:', error);
        toast.error('Failed to load usage data');
        return;
      }

      setBillingData(data);
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const refreshUsage = async () => {
    if (!user) return;

    try {
      setRefreshing(true);
      await loadBillingData();
      toast.success('Usage data refreshed');
    } catch (error) {
      console.error('Error refreshing usage:', error);
      toast.error('Failed to refresh usage data');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [user]);

  const getUsageData = (): UsageData[] => {
    if (!billingData) return [];

    return [
      {
        feature_type: 'feedback',
        usage_count: billingData.current_feedback_usage || 0,
        limit: billingData.feedback_limit,
        remaining: billingData.feedback_limit === -1 ? null : Math.max(0, billingData.feedback_limit - (billingData.current_feedback_usage || 0)),
        percentage: billingData.feedback_limit === -1 ? 0 : Math.round(((billingData.current_feedback_usage || 0) / billingData.feedback_limit) * 100),
        is_unlimited: billingData.feedback_limit === -1
      },
      {
        feature_type: 'ai_insights',
        usage_count: billingData.current_ai_insights_usage || 0,
        limit: billingData.ai_insights_limit,
        remaining: billingData.ai_insights_limit === -1 ? null : Math.max(0, billingData.ai_insights_limit - (billingData.current_ai_insights_usage || 0)),
        percentage: billingData.ai_insights_limit === -1 ? 0 : Math.round(((billingData.current_ai_insights_usage || 0) / billingData.ai_insights_limit) * 100),
        is_unlimited: billingData.ai_insights_limit === -1
      },
      {
        feature_type: 'reports',
        usage_count: billingData.current_reports_usage || 0,
        limit: billingData.reports_limit,
        remaining: billingData.reports_limit === -1 ? null : Math.max(0, billingData.reports_limit - (billingData.current_reports_usage || 0)),
        percentage: billingData.reports_limit === -1 ? 0 : Math.round(((billingData.current_reports_usage || 0) / billingData.reports_limit) * 100),
        is_unlimited: billingData.reports_limit === -1
      }
    ];
  };

  const getFeatureIcon = (featureType: string) => {
    switch (featureType) {
      case 'feedback':
        return <BarChart3 className="h-4 w-4" />;
      case 'ai_insights':
        return <Brain className="h-4 w-4" />;
      case 'reports':
        return <FileText className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getFeatureName = (featureType: string) => {
    switch (featureType) {
      case 'feedback':
        return 'Feedback Responses';
      case 'ai_insights':
        return 'AI Insights';
      case 'reports':
        return 'Reports';
      default:
        return featureType;
    }
  };

  const getProgressColor = (percentage: number, isUnlimited: boolean) => {
    if (isUnlimited) return 'bg-green-500';
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusBadge = () => {
    if (!billingData) return null;

    switch (billingData.subscription_status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{billingData.subscription_status}</Badge>;
    }
  };

  const formatPrice = (priceKobo: number) => {
    if (priceKobo === 0) return 'Free';
    const priceNGN = priceKobo / 100;
    return `₦${priceNGN.toLocaleString()}/month`;
  };

  const getUpgradeMessage = () => {
    if (!billingData) return null;

    const usageData = getUsageData();
    const hasHighUsage = usageData.some(usage => usage.percentage >= 80 && !usage.is_unlimited);
    const hasReachedLimit = usageData.some(usage => usage.percentage >= 100 && !usage.is_unlimited);

    if (hasReachedLimit) {
      return {
        type: 'error',
        message: 'You\'ve reached your plan limits. Upgrade now to continue using all features.',
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />
      };
    }

    if (hasHighUsage) {
      return {
        type: 'warning',
        message: 'You\'re approaching your plan limits. Consider upgrading for unlimited access.',
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />
      };
    }

    if (billingData.plan === 'free' && billingData.subscription_status === 'trial') {
      return {
        type: 'info',
        message: 'You\'re on a free trial. Upgrade to unlock unlimited features and advanced analytics.',
        icon: <Crown className="h-5 w-5 text-blue-500" />
      };
    }

    return null;
  };

  if (loading) {
    return (
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Usage Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading usage data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!billingData) {
    return (
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Usage Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load usage data</h3>
            <p className="text-gray-600 mb-4">There was an issue loading your usage information.</p>
            <Button onClick={loadBillingData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const usageData = getUsageData();
  const upgradeMessage = getUpgradeMessage();

  return (
    <Card className="rounded-xl shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Usage Overview</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshUsage}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan Info */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Crown className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{billingData.plan_display_name}</h3>
              <p className="text-sm text-gray-600">{formatPrice(billingData.price_monthly)}</p>
            </div>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <a href="/settings">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Manage Plan
            </a>
          </Button>
        </div>

        {/* Upgrade Message */}
        {upgradeMessage && (
          <div className={`p-4 rounded-lg border ${
            upgradeMessage.type === 'error' ? 'bg-red-50 border-red-200' :
            upgradeMessage.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center space-x-2">
              {upgradeMessage.icon}
              <p className={`text-sm font-medium ${
                upgradeMessage.type === 'error' ? 'text-red-800' :
                upgradeMessage.type === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {upgradeMessage.message}
              </p>
            </div>
          </div>
        )}

        {/* Usage Bars */}
        <div className="space-y-4">
          {usageData.map((usage) => (
            <div key={usage.feature_type} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getFeatureIcon(usage.feature_type)}
                  <span className="font-medium text-gray-900">
                    {getFeatureName(usage.feature_type)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {usage.is_unlimited ? (
                      <span className="text-green-600">Unlimited</span>
                    ) : (
                      `${usage.usage_count} / ${usage.limit}`
                    )}
                  </div>
                  {!usage.is_unlimited && (
                    <div className="text-xs text-gray-500">
                      {usage.remaining} remaining
                    </div>
                  )}
                </div>
              </div>
              
              {!usage.is_unlimited && (
                <div className="space-y-1">
                  <Progress 
                    value={usage.percentage} 
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>0</span>
                    <span className={`font-medium ${
                      usage.percentage >= 100 ? 'text-red-600' :
                      usage.percentage >= 80 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {usage.percentage}%
                    </span>
                    <span>{usage.limit}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Plan Features */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Plan Features:</h4>
          <div className="grid grid-cols-1 gap-2">
            {billingData.features?.slice(0, 3).map((feature, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
            {billingData.features?.length > 3 && (
              <div className="text-xs text-gray-500 ml-6">
                +{billingData.features.length - 3} more features
              </div>
            )}
          </div>
        </div>

        {/* Trial/Subscription Info */}
        {billingData.subscription_status === 'trial' && billingData.trial_end_date && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Trial ends {new Date(billingData.trial_end_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {billingData.subscription_status === 'active' && billingData.subscription_end_date && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                Next billing: {new Date(billingData.subscription_end_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageBar;