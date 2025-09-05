import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useUsageEnforcement, useFeatureUsage } from '@/hooks/useUsageEnforcement';
import { enforceUsageLimit, showUpgradePrompt } from '@/lib/usageEnforcement';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import {
  MessageSquare,
  BarChart3,
  FileText,
  Brain,
  Users,
  AlertTriangle,
  CheckCircle,
  Crown,
  Zap,
  Shield,
  Loader2,
  RefreshCw
} from 'lucide-react';

const UsageEnforcementExample: React.FC = () => {
  const {
    loading,
    error,
    usage,
    plan,
    limits,
    checks,
    canUseFeature,
    getRemainingUsage,
    needsUpgrade,
    featuresNeedingUpgrade,
    refreshUsage
  } = useUsageEnforcement();

  const { trackUsage, loading: trackingLoading } = useUsageTracking();
  const [testingFeature, setTestingFeature] = useState<string | null>(null);

  // Individual feature hooks for demonstration
  const feedbackUsage = useFeatureUsage('feedback');
  const analyticsUsage = useFeatureUsage('analytics');

  const handleFeatureTest = async (feature: string) => {
    setTestingFeature(feature);
    
    try {
      // First check if user can use the feature
      const canUse = await enforceUsageLimit(feature as any, feature as any);

      if (canUse) {
        // Track usage
        await trackUsage(feature as any);
        console.log(`${feature} usage tracked successfully`);
      }
    } catch (error) {
      console.error(`Error testing ${feature}:`, error);
    } finally {
      setTestingFeature(null);
    }
  };

  const handleUpgradeClick = () => {
    showUpgradePrompt('feedback', plan, checks.feedback.currentUsage, checks.feedback.limit);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading usage data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usage Enforcement Demo</h1>
          <p className="text-muted-foreground">
            Test usage limits and upgrade flows
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshUsage}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="h-5 w-5" />
            <span>Current Plan: {plan}</span>
          </CardTitle>
          <CardDescription>
            Your current subscription plan and limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(limits).map(([feature, limit]) => (
              <div key={feature} className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium capitalize">{feature}</div>
                <div className="text-lg font-bold">
                  {limit === -1 ? '∞' : limit}
                </div>
                <div className="text-xs text-muted-foreground">
                  {limit === -1 ? 'Unlimited' : 'Limit'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Status */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Feature Usage Cards */}
        {Object.entries(checks).map(([feature, check]) => (
          <Card key={feature} className={!check.canUse ? 'border-red-200 bg-red-50' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {feature === 'feedback' && <MessageSquare className="h-5 w-5" />}
                  {feature === 'analytics' && <BarChart3 className="h-5 w-5" />}
                  {feature === 'reports' && <FileText className="h-5 w-5" />}
                  {feature === 'insights' && <Brain className="h-5 w-5" />}
                  {feature === 'teams' && <Users className="h-5 w-5" />}
                  <span className="capitalize">{feature}</span>
                </div>
                <Badge variant={check.canUse ? 'default' : 'destructive'}>
                  {check.canUse ? 'Available' : 'Limit Reached'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Usage Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Usage</span>
                  <span>{check.currentUsage} / {check.limit === -1 ? '∞' : check.limit}</span>
                </div>
                <Progress 
                  value={check.limit === -1 ? 0 : (check.currentUsage / check.limit) * 100} 
                  className="h-2"
                />
              </div>

              {/* Status Info */}
              <div className="flex items-center space-x-2">
                {check.canUse ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">
                  {check.canUse 
                    ? `${check.remaining} remaining`
                    : 'Limit reached - upgrade required'
                  }
                </span>
              </div>

              {/* Test Button */}
              <Button
                onClick={() => handleFeatureTest(feature)}
                disabled={!check.canUse || testingFeature === feature || trackingLoading}
                variant={check.canUse ? 'default' : 'outline'}
                className="w-full"
              >
                {testingFeature === feature ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Test {feature}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upgrade Alerts */}
      {needsUpgrade && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <strong>Upgrade Required:</strong> You've reached limits on{' '}
                {featuresNeedingUpgrade.join(', ')}. 
                Consider upgrading your plan to continue using these features.
              </div>
              <Button size="sm" onClick={handleUpgradeClick} className="ml-4">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Individual Feature Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Feature Testing</CardTitle>
          <CardDescription>
            Test specific features with individual hooks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Feedback Testing */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Feedback Usage</div>
              <div className="text-sm text-muted-foreground">
                Current: {feedbackUsage.currentUsage} | 
                Limit: {feedbackUsage.limit === -1 ? '∞' : feedbackUsage.limit} |
                Can Use: {feedbackUsage.canUse ? 'Yes' : 'No'}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={feedbackUsage.checkUsage}
                disabled={feedbackUsage.loading}
              >
                {feedbackUsage.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Check'
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => feedbackUsage.enforceLimit()}
                disabled={!feedbackUsage.canUse}
              >
                Test Limit
              </Button>
            </div>
          </div>

          {/* Analytics Testing */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium">Analytics Usage</div>
              <div className="text-sm text-muted-foreground">
                Current: {analyticsUsage.currentUsage} | 
                Limit: {analyticsUsage.limit === -1 ? '∞' : analyticsUsage.limit} |
                Can Use: {analyticsUsage.canUse ? 'Yes' : 'No'}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={analyticsUsage.checkUsage}
                disabled={analyticsUsage.loading}
              >
                {analyticsUsage.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Check'
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => analyticsUsage.enforceLimit()}
                disabled={!analyticsUsage.canUse}
              >
                Test Limit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Data Display */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Usage Data</CardTitle>
          <CardDescription>
            Current usage data from the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(usage, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default UsageEnforcementExample;