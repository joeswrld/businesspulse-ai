import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Lock, 
  AlertTriangle, 
  Crown, 
  ArrowUpRight, 
  BarChart3, 
  Brain, 
  FileText, 
  Users,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FeatureLockProps {
  children: React.ReactNode;
  featureType: 'feedback' | 'ai_insights' | 'reports' | 'team_members';
  requiredAmount?: number;
  fallbackComponent?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

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

const FeatureLock: React.FC<FeatureLockProps> = ({
  children,
  featureType,
  requiredAmount = 1,
  fallbackComponent,
  showUpgradePrompt = true
}) => {
  const { user } = useAuth();
  const [billingData, setBillingData] = useState<BillingDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [canUseFeature, setCanUseFeature] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    checkFeatureAccess();
  }, [user, featureType, requiredAmount]);

  const checkFeatureAccess = async () => {
    if (!user) {
      setCanUseFeature(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get user's billing data
      const { data, error } = await supabase
        .from('user_billing_dashboard')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking feature access:', error);
        setCanUseFeature(false);
        setLoading(false);
        return;
      }

      setBillingData(data);

      // Check if user can use this feature
      const canUse = await supabase.rpc('can_perform_action', {
        user_uuid: user.id,
        feature_name: featureType,
        required_amount: requiredAmount
      });

      setCanUseFeature(canUse.data || false);

    } catch (error) {
      console.error('Error checking feature access:', error);
      setCanUseFeature(false);
    } finally {
      setLoading(false);
    }
  };

  const getFeatureInfo = () => {
    if (!billingData) return null;

    let currentUsage = 0;
    let limit = 0;

    switch (featureType) {
      case 'feedback':
        currentUsage = billingData.current_feedback_usage || 0;
        limit = billingData.feedback_limit;
        break;
      case 'ai_insights':
        currentUsage = billingData.current_ai_insights_usage || 0;
        limit = billingData.ai_insights_limit;
        break;
      case 'reports':
        currentUsage = billingData.current_reports_usage || 0;
        limit = billingData.reports_limit;
        break;
      case 'team_members':
        currentUsage = (billingData as any).current_team_members_usage || 0;
        limit = billingData.team_members_limit;
        break;
    }

    return {
      currentUsage,
      limit,
      remaining: limit === -1 ? null : Math.max(0, limit - currentUsage),
      percentage: limit === -1 ? 0 : Math.round((currentUsage / limit) * 100),
      isUnlimited: limit === -1
    };
  };

  const getFeatureIcon = () => {
    switch (featureType) {
      case 'feedback':
        return <BarChart3 className="h-5 w-5" />;
      case 'ai_insights':
        return <Brain className="h-5 w-5" />;
      case 'reports':
        return <FileText className="h-5 w-5" />;
      case 'team_members':
        return <Users className="h-5 w-5" />;
      default:
        return <Lock className="h-5 w-5" />;
    }
  };

  const getFeatureName = () => {
    switch (featureType) {
      case 'feedback':
        return 'Feedback Collection';
      case 'ai_insights':
        return 'AI Insights';
      case 'reports':
        return 'Report Generation';
      case 'team_members':
        return 'Team Management';
      default:
        return 'Feature';
    }
  };

  const formatPrice = (priceKobo: number) => {
    if (priceKobo === 0) return 'Free';
    const priceNGN = priceKobo / 100;
    return `₦${priceNGN.toLocaleString()}`;
  };

  const getUpgradePlans = () => {
    if (!billingData) return [];

    // Return plans that have higher limits for this feature
    const currentLimit = getFeatureInfo()?.limit || 0;
    
    return [
      {
        name: 'Business',
        price: 3500000,
        limit: 300,
        features: ['300 feedback responses/month', '50 AI insights/month', '20 reports/month', 'Priority support']
      },
      {
        name: 'Scale',
        price: 5300000,
        limit: -1,
        features: ['Unlimited everything', 'Dedicated support', 'Custom integrations', 'API access']
      }
    ].filter(plan => plan.limit > currentLimit || plan.limit === -1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Checking access...</p>
        </div>
      </div>
    );
  }

  if (canUseFeature) {
    return <>{children}</>;
  }

  const featureInfo = getFeatureInfo();
  const upgradePlans = getUpgradePlans();

  if (fallbackComponent) {
    return <>{fallbackComponent}</>;
  }

  return (
    <div className="relative">
      {/* Locked Content Overlay */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-lg">Feature Locked</CardTitle>
            <p className="text-sm text-gray-600">
              You've reached your {getFeatureName().toLowerCase()} limit
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Usage */}
            {featureInfo && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {getFeatureName()}
                  </span>
                  <span className="text-sm text-gray-600">
                    {featureInfo.isUnlimited ? 'Unlimited' : `${featureInfo.currentUsage} / ${featureInfo.limit}`}
                  </span>
                </div>
                {!featureInfo.isUnlimited && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        featureInfo.percentage >= 100 ? 'bg-red-500' :
                        featureInfo.percentage >= 80 ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(featureInfo.percentage, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Current Plan */}
            {billingData && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Crown className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Current Plan: {billingData.plan_display_name}
                  </span>
                </div>
                <p className="text-xs text-blue-700">
                  {formatPrice(billingData.price_monthly)}/month
                </p>
              </div>
            )}

            {/* Upgrade Options */}
            {showUpgradePrompt && upgradePlans.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 text-sm">Upgrade to unlock:</h4>
                {upgradePlans.map((plan, index) => (
                  <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium text-gray-900">{plan.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {formatPrice(plan.price)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {plan.limit === -1 ? 'Unlimited' : `${plan.limit} ${featureType.replace('_', ' ')}/month`}
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.location.href = `/billing?plan=${plan.name.toLowerCase()}`}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Upgrade to {plan.name}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Trial Info */}
            {billingData?.subscription_status === 'trial' && billingData?.trial_end_date && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Trial ends {new Date(billingData.trial_end_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.location.href = '/billing'}
              >
                View Plans
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => window.location.href = '/billing'}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blurred Content */}
      <div className="filter blur-sm pointer-events-none">
        {children}
      </div>
    </div>
  );
};

// Higher-order component for easier usage
export const withFeatureLock = <P extends object>(
  Component: React.ComponentType<P>,
  featureType: 'feedback' | 'ai_insights' | 'reports' | 'team_members',
  requiredAmount: number = 1
) => {
  return (props: P) => (
    <FeatureLock featureType={featureType} requiredAmount={requiredAmount}>
      <Component {...props} />
    </FeatureLock>
  );
};

// Hook for checking feature access
export const useFeatureAccess = (featureType: 'feedback' | 'ai_insights' | 'reports' | 'team_members') => {
  const { user } = useAuth();
  const [canUse, setCanUse] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usageInfo, setUsageInfo] = useState<UsageData | null>(null);

  useEffect(() => {
    checkAccess();
  }, [user, featureType]);

  const checkAccess = async () => {
    if (!user) {
      setCanUse(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_billing_dashboard')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error checking feature access:', error);
        setCanUse(false);
        setLoading(false);
        return;
      }

      // Check if user can use this feature
      const canUseResult = await supabase.rpc('can_perform_action', {
        user_uuid: user.id,
        feature_name: featureType,
        required_amount: 1
      });

      setCanUse(canUseResult.data || false);

      // Get usage info
      let currentUsage = 0;
      let limit = 0;

      switch (featureType) {
        case 'feedback':
          currentUsage = data.current_feedback_usage || 0;
          limit = data.feedback_limit;
          break;
        case 'ai_insights':
          currentUsage = data.current_ai_insights_usage || 0;
          limit = data.ai_insights_limit;
          break;
        case 'reports':
          currentUsage = data.current_reports_usage || 0;
          limit = data.reports_limit;
          break;
        case 'team_members':
          currentUsage = data.current_team_members_usage || 0;
          limit = data.team_members_limit;
          break;
      }

      setUsageInfo({
        feature_type: featureType,
        usage_count: currentUsage,
        limit: limit,
        remaining: limit === -1 ? null : Math.max(0, limit - currentUsage),
        percentage: limit === -1 ? 0 : Math.round((currentUsage / limit) * 100),
        is_unlimited: limit === -1
      });

    } catch (error) {
      console.error('Error checking feature access:', error);
      setCanUse(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    canUse,
    loading,
    usageInfo,
    checkAccess
  };
};

export default FeatureLock;