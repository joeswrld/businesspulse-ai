import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  MessageSquare, 
  FileText, 
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  Crown
} from 'lucide-react';
import { 
  type PlanTier, 
  type FeatureType, 
  type UsageCheckResult,
  PLAN_NAMES,
  PLAN_PRICING 
} from '@/lib/billingEnforcement';

interface UsageDashboardProps {
  plan: PlanTier;
  checks: Record<FeatureType, UsageCheckResult>;
  isTrialExpired: boolean;
  daysUntilExpiry: number;
  onUpgrade: () => void;
  className?: string;
}

const UsageDashboard: React.FC<UsageDashboardProps> = ({
  plan,
  checks,
  isTrialExpired,
  daysUntilExpiry,
  onUpgrade,
  className = ''
}) => {
  const features = [
    {
      key: 'feedback' as FeatureType,
      name: 'Feedback Submissions',
      icon: MessageSquare,
      description: 'User feedback collected through widgets'
    },
    {
      key: 'insights' as FeatureType,
      name: 'AI Insights',
      icon: TrendingUp,
      description: 'AI-generated insights from your data'
    },
    {
      key: 'reports' as FeatureType,
      name: 'Reports',
      icon: FileText,
      description: 'Analytics reports and exports'
    }
  ];

  const getUsagePercentage = (check: UsageCheckResult): number => {
    if (check.isUnlimited) return 0;
    if (check.limit === 0) return 100;
    return Math.min(100, (check.currentUsage / check.limit) * 100);
  };

  const getUsageColor = (check: UsageCheckResult): string => {
    const percentage = getUsagePercentage(check);
    if (check.isTrialExpired) return 'bg-red-500';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = (check: UsageCheckResult) => {
    if (check.isTrialExpired) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    if (check.isUnlimited) {
      return <Crown className="h-4 w-4 text-purple-600" />;
    }
    if (check.canUse) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  const getStatusText = (check: UsageCheckResult): string => {
    if (check.isTrialExpired) return 'Trial Expired';
    if (check.isUnlimited) return 'Unlimited';
    if (check.canUse) return 'Available';
    return 'Limit Reached';
  };

  const getStatusColor = (check: UsageCheckResult): string => {
    if (check.isTrialExpired) return 'bg-red-100 text-red-800';
    if (check.isUnlimited) return 'bg-purple-100 text-purple-800';
    if (check.canUse) return 'bg-green-100 text-green-800';
    return 'bg-red-100 text-red-800';
  };

  const needsUpgrade = Object.values(checks).some(check => !check.canUse);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Plan Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage Dashboard
              </CardTitle>
              <p className="text-gray-600 text-sm mt-1">
                Track your usage across all features
              </p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="mb-2">
                {PLAN_NAMES[plan]}
              </Badge>
              <div className="text-sm text-gray-600">
                {PLAN_PRICING[plan]}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Free Plan 30-day Cycle Status */}
          {plan === 'free' && (
            <div className={`p-4 rounded-lg mb-4 ${
              daysUntilExpiry <= 3 
                ? 'bg-yellow-50 border border-yellow-200' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className={`h-4 w-4 ${
                  daysUntilExpiry <= 3 
                    ? 'text-yellow-600' 
                    : 'text-blue-600'
                }`} />
                <span className={`font-medium ${
                  daysUntilExpiry <= 3 
                    ? 'text-yellow-800' 
                    : 'text-blue-800'
                }`}>
                  Free Plan: 30-day rolling usage
                </span>
              </div>
              <p className={`text-sm ${
                daysUntilExpiry <= 3 
                  ? 'text-yellow-700' 
                  : 'text-blue-700'
              }`}>
                Cycle resets in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}. Limits per cycle: Feedback 50, Insights 5, Reports 5. Data retention: 8 days.
              </p>
            </div>
          )}

          {/* Upgrade Prompt */}
          {needsUpgrade && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    Ready to unlock more?
                  </h4>
                  <p className="text-sm text-gray-600">
                    You've reached your limits. Upgrade to continue growing.
                  </p>
                </div>
                <Button onClick={onUpgrade} className="bg-blue-600 hover:bg-blue-700">
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((feature) => {
          const check = checks[feature.key];
          const Icon = feature.icon;
          const percentage = getUsagePercentage(check);
          const usageColor = getUsageColor(check);

          return (
            <Card key={feature.key} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-600" />
                    <CardTitle className="text-sm font-medium">
                      {feature.name}
                    </CardTitle>
                  </div>
                  {getStatusIcon(check)}
                </div>
                <p className="text-xs text-gray-500">
                  {feature.description}
                </p>
              </CardHeader>
              <CardContent>
                {/* Usage Stats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Usage</span>
                    <span className="font-medium">
                      {check.isUnlimited 
                        ? `${check.currentUsage} (Unlimited)`
                        : `${check.currentUsage} / ${check.limit}`
                      }
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {!check.isUnlimited && (
                    <div className="space-y-1">
                      <Progress 
                        value={percentage} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0</span>
                        <span>{check.limit}</span>
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(check)}>
                      {getStatusText(check)}
                    </Badge>
                    {check.remaining > 0 && !check.isUnlimited && (
                      <span className="text-xs text-gray-500">
                        {check.remaining} remaining
                      </span>
                    )}
                  </div>

                  {/* Warning for high usage */}
                  {percentage >= 75 && !check.isUnlimited && check.canUse && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                      <p className="text-xs text-yellow-800">
                        {percentage >= 90 
                          ? 'Almost at limit - consider upgrading'
                          : 'Getting close to your limit'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plan Comparison</CardTitle>
          <p className="text-gray-600 text-sm">
            Compare features across different plans
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Feature</th>
                  <th className="text-center py-2">Free Trial</th>
                  <th className="text-center py-2">Pro</th>
                  <th className="text-center py-2">Business</th>
                </tr>
              </thead>
              <tbody className="space-y-2">
                <tr className="border-b">
                  <td className="py-2 font-medium">Feedback Submissions</td>
                  <td className="text-center py-2">50/month</td>
                  <td className="text-center py-2">300/month</td>
                  <td className="text-center py-2">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">AI Insights</td>
                  <td className="text-center py-2">5/month</td>
                  <td className="text-center py-2">50/month</td>
                  <td className="text-center py-2">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Reports</td>
                  <td className="text-center py-2">2/month</td>
                  <td className="text-center py-2">20/month</td>
                  <td className="text-center py-2">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Data Retention</td>
                  <td className="text-center py-2">30 days</td>
                  <td className="text-center py-2">12 months</td>
                  <td className="text-center py-2">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Support</td>
                  <td className="text-center py-2">Community</td>
                  <td className="text-center py-2">Email + Chat</td>
                  <td className="text-center py-2">Priority Phone</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageDashboard;