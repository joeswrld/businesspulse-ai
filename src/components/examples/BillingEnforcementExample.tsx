import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  TrendingUp, 
  FileText, 
  Zap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useBillingEnforcementWithTracking } from '@/hooks/useBillingEnforcement';
import UpgradeModal from '@/components/billing/UpgradeModal';
import UsageDashboard from '@/components/billing/UsageDashboard';
import { type PlanTier, type FeatureType } from '@/lib/billingEnforcement';

const BillingEnforcementExample: React.FC = () => {
  const {
    usage,
    subscription,
    plan,
    limits,
    checks,
    isTrialExpired,
    daysUntilExpiry,
    loading,
    error,
    enforceLimit,
    trackUsage,
    hasActiveAccess,
    isTrialActive,
    needsUpgrade,
    featuresNeedingUpgrade
  } = useBillingEnforcementWithTracking();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState<FeatureType | undefined>();
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const handleFeatureAction = async (feature: FeatureType) => {
    setActionLoading(prev => ({ ...prev, [feature]: true }));
    
    try {
      const canUse = await trackUsage(feature, () => {
        setBlockedFeature(feature);
        setShowUpgradeModal(true);
      });

      if (canUse) {
        toast.success(`${feature.charAt(0).toUpperCase() + feature.slice(1)} action completed successfully!`);
      }
    } catch (error) {
      console.error(`Error with ${feature} action:`, error);
      toast.error(`Failed to complete ${feature} action`);
    } finally {
      setActionLoading(prev => ({ ...prev, [feature]: false }));
    }
  };

  const handleUpgrade = (selectedPlan: PlanTier) => {
    setShowUpgradeModal(false);
    setBlockedFeature(undefined);
    toast.info(`Redirecting to upgrade to ${selectedPlan} plan...`);
    // In a real app, this would redirect to the payment flow
    window.location.href = '/billing';
  };

  const features = [
    {
      key: 'feedback' as FeatureType,
      name: 'Submit Feedback',
      icon: MessageSquare,
      description: 'Collect user feedback through widgets',
      action: 'Submit Feedback'
    },
    {
      key: 'insights' as FeatureType,
      name: 'Generate AI Insights',
      icon: TrendingUp,
      description: 'Create AI-powered insights from your data',
      action: 'Generate Insight'
    },
    {
      key: 'reports' as FeatureType,
      name: 'Create Report',
      icon: FileText,
      description: 'Generate analytics reports and exports',
      action: 'Create Report'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Billing Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing Enforcement Demo</h1>
        <p className="text-gray-600 mt-2">
          This demonstrates the real-world billing flow with usage limits and upgrade prompts.
        </p>
      </div>

      {/* Current Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {plan.charAt(0).toUpperCase() + plan.slice(1)}
              </div>
              <div className="text-sm text-gray-600">Current Plan</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {hasActiveAccess ? (
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600 mx-auto" />
                )}
              </div>
              <div className="text-sm text-gray-600">Access Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {isTrialActive ? (
                  <span className="text-blue-600">{daysUntilExpiry} days</span>
                ) : subscription?.status === 'active' ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-600">Expired</span>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {isTrialActive ? 'Trial Remaining' : 'Subscription Status'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {needsUpgrade ? (
                  <Badge className="bg-red-100 text-red-800">Upgrade Needed</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800">All Good</Badge>
                )}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>

          {/* Warning Messages */}
          {isTrialExpired && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Trial Expired</span>
              </div>
              <p className="text-red-700 text-sm">
                Your free trial has ended. Upgrade now to continue using NoteX.
              </p>
            </div>
          )}

          {needsUpgrade && !isTrialExpired && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 mb-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Limits Reached</span>
              </div>
              <p className="text-yellow-700 text-sm">
                You've reached your limits for: {featuresNeedingUpgrade.join(', ')}. 
                Upgrade to continue using these features.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Dashboard */}
      <UsageDashboard
        plan={plan}
        checks={checks}
        isTrialExpired={isTrialExpired}
        daysUntilExpiry={daysUntilExpiry}
        onUpgrade={() => setShowUpgradeModal(true)}
        className="mb-8"
      />

      {/* Feature Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Try the Features</CardTitle>
          <p className="text-gray-600 text-sm">
            Click the buttons below to test the billing enforcement system. 
            Each action will check your usage limits and show upgrade prompts when needed.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((feature) => {
              const check = checks[feature.key];
              const Icon = feature.icon;
              const isLoading = actionLoading[feature.key];

              return (
                <Card key={feature.key} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-600" />
                      <CardTitle className="text-sm">{feature.name}</CardTitle>
                    </div>
                    <p className="text-xs text-gray-500">{feature.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Usage Info */}
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Usage:</span>
                          <span className="font-medium">
                            {check.isUnlimited 
                              ? `${check.currentUsage} (Unlimited)`
                              : `${check.currentUsage} / ${check.limit}`
                            }
                          </span>
                        </div>
                        {check.remaining > 0 && !check.isUnlimited && (
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Remaining:</span>
                            <span>{check.remaining}</span>
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-between">
                        <Badge className={
                          check.isTrialExpired 
                            ? 'bg-red-100 text-red-800'
                            : check.isUnlimited 
                              ? 'bg-purple-100 text-purple-800'
                              : check.canUse 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                        }>
                          {check.isTrialExpired 
                            ? 'Trial Expired'
                            : check.isUnlimited 
                              ? 'Unlimited'
                              : check.canUse 
                                ? 'Available'
                                : 'Limit Reached'
                          }
                        </Badge>
                      </div>

                      <Separator />

                      {/* Action Button */}
                      <Button
                        onClick={() => handleFeatureAction(feature.key)}
                        disabled={!check.canUse || isLoading}
                        className="w-full"
                        variant={check.canUse ? "default" : "outline"}
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : check.canUse ? (
                          <>
                            <Icon className="h-4 w-4 mr-2" />
                            {feature.action}
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Limit Reached
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          setBlockedFeature(undefined);
        }}
        onUpgrade={handleUpgrade}
        currentPlan={plan}
        blockedFeature={blockedFeature}
        trialDaysRemaining={daysUntilExpiry}
        isTrialExpired={isTrialExpired}
      />
    </div>
  );
};

export default BillingEnforcementExample;