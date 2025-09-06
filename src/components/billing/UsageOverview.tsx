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

interface SubscriptionDetails {
  next_billing_date: string | null;
  trial_ends_at: string | null;
  subscription_status: string;
  plan_price: number | null;
  plan_currency: string | null;
}

interface UsageOverviewProps {
  userId: string;
  onUpgrade?: (plan: 'pro' | 'business') => void;
  refreshTrigger?: number; // Add this to trigger refresh when plan changes
}

export default function UsageOverview({ userId, onUpgrade, refreshTrigger }: UsageOverviewProps) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch billing profile with minimal columns first
      let billingProfile = null;
      let currentPlan = 'free'; // Default fallback
      
      try {
        const { data, error } = await supabase
          .from('billing_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error && data) {
          billingProfile = data;
          currentPlan = data.plan || 'free';
          console.log('Billing profile data:', data); // Debug log
        } else {
          console.warn('Billing profile not found, attempting to create one:', error);
          
          // Try to create a billing profile using the RPC function
          try {
            const { data: createResult, error: createError } = await supabase
              .rpc('create_user_billing_profile', { user_uuid: userId });
            
            if (!createError && createResult) {
              console.log('Billing profile created successfully');
              // Try to fetch the newly created profile
              const { data: newProfile } = await supabase
                .from('billing_profiles')
                .select('*')
                .eq('id', userId)
                .single();
              
              if (newProfile) {
                billingProfile = newProfile;
                currentPlan = newProfile.plan || 'trial';
              } else {
                currentPlan = 'trial';
              }
            } else {
              console.warn('Failed to create billing profile:', createError);
              currentPlan = 'trial';
            }
          } catch (createError) {
            console.warn('Error creating billing profile:', createError);
            currentPlan = 'trial';
          }
        }
      } catch (billingError) {
        console.warn('Error fetching billing profile, using default plan:', billingError);
        currentPlan = 'trial';
      }

      // Fetch usage counters from the actual database tables
      let usageCounters = {
        feedback_count: 0,
        insights_count: 0,
        analytics_count: 0,
        reports_count: 0
      };

      try {
        // First try to get from usage_counters table (if it exists with the right schema)
        const { data: usageData, error: usageError } = await supabase
          .from('usage_counters')
          .select('feedback_count, insights_count, analytics_count, reports_count')
          .eq('user_id', userId)
          .single();

        if (!usageError && usageData) {
          usageCounters = {
            feedback_count: usageData.feedback_count || 0,
            insights_count: usageData.insights_count || 0,
            analytics_count: usageData.analytics_count || 0,
            reports_count: usageData.reports_count || 0
          };
          console.log('Usage counters loaded from table:', usageData);
        } else {
          // Fallback: Try to refresh usage data using the RPC function
          console.log('Usage counters table not found or empty, refreshing usage data');
          
          try {
            const { error: refreshError } = await supabase
              .rpc('ensure_current_month_usage', { user_uuid: userId });
            
            if (!refreshError) {
              // Try to fetch again after refresh
              const { data: refreshedData, error: retryError } = await supabase
                .from('usage_counters')
                .select('feedback_count, insights_count, analytics_count, reports_count')
                .eq('user_id', userId)
                .single();
              
              if (!retryError && refreshedData) {
                usageCounters = {
                  feedback_count: refreshedData.feedback_count || 0,
                  insights_count: refreshedData.insights_count || 0,
                  analytics_count: refreshedData.analytics_count || 0,
                  reports_count: refreshedData.reports_count || 0
                };
                console.log('Usage counters refreshed and loaded:', usageCounters);
              } else {
                console.warn('Failed to load refreshed usage data, using defaults');
              }
            } else {
              console.warn('Failed to refresh usage data:', refreshError);
            }
          } catch (refreshError) {
            console.warn('Error refreshing usage data:', refreshError);
          }
        }
      } catch (countersError) {
        console.warn('Error fetching usage counters, using defaults:', countersError);
      }

      // Get plan limits based on the current plan
      const planLimits = getPlanLimits(currentPlan);

      // Create usage summary with correct plan data
      const usageSummary = {
        plan_code: currentPlan,
        plan_name: getPlanDisplayName(currentPlan),
        feedback_count: usageCounters.feedback_count || 0,
        insights_count: usageCounters.insights_count || 0,
        analytics_count: usageCounters.analytics_count || 0,
        reports_count: usageCounters.reports_count || 0,
        feedback_limit: planLimits.feedback,
        insights_limit: planLimits.insights,
        analytics_limit: planLimits.analytics,
        reports_limit: planLimits.reports,
        feedback_remaining: Math.max(0, planLimits.feedback - (usageCounters.feedback_count || 0)),
        insights_remaining: Math.max(0, planLimits.insights - (usageCounters.insights_count || 0)),
        analytics_remaining: Math.max(0, planLimits.analytics - (usageCounters.analytics_count || 0)),
        reports_remaining: Math.max(0, planLimits.reports - (usageCounters.reports_count || 0))
      };

      setUsage(usageSummary);
      setSubscription(billingProfile);
      
      // Debug logging
      console.log('Usage Overview Data Loaded:', {
        currentPlan,
        usageCounters,
        planLimits,
        usageSummary,
        billingProfile: billingProfile ? {
          id: billingProfile.id,
          plan: billingProfile.plan,
          subscription_status: billingProfile.subscription_status,
          trial_ends_at: billingProfile.trial_ends_at
        } : null
      });
      
      // Check if trial has expired
      if ((currentPlan === 'trial' || currentPlan === 'free') && billingProfile?.trial_ends_at) {
        const trialEnd = new Date(billingProfile.trial_ends_at);
        const now = new Date();
        setTrialExpired(now > trialEnd);
      }
    } catch (error) {
      console.error('Error in loadUsageData:', error);
      // Don't show error toast for now, just log it
      console.warn('Using fallback data due to error');
      
      // Set fallback data
      const fallbackUsage = {
        plan_code: 'trial',
        plan_name: 'Free Trial',
        feedback_count: 0,
        insights_count: 0,
        analytics_count: 0,
        reports_count: 0,
        feedback_limit: 50,
        insights_limit: 5,
        analytics_limit: 5,
        reports_limit: 2,
        feedback_remaining: 50,
        insights_remaining: 5,
        analytics_remaining: 5,
        reports_remaining: 2
      };
      
      setUsage(fallbackUsage);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsage = async () => {
    try {
      setRefreshing(true);
      
      // First try to refresh usage data in the database
      try {
        const { error: refreshError } = await supabase
          .rpc('ensure_current_month_usage', { user_uuid: userId });
        
        if (refreshError) {
          console.warn('Failed to refresh usage data in database:', refreshError);
        } else {
          console.log('Usage data refreshed in database successfully');
        }
      } catch (refreshError) {
        console.warn('Error calling refresh function:', refreshError);
      }
      
      // Then reload the component data
      await loadUsageData();
      toast.success('Usage data refreshed');
    } catch (error) {
      console.error('Error refreshing usage:', error);
      // Don't show error toast, just log it
      console.warn('Refresh failed, but component will continue with existing data');
    } finally {
      setRefreshing(false);
    }
  };

  // Helper functions
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

  const getPlanPricing = (planCode: string) => {
    const pricing = {
      'free': { price: 0, currency: 'NGN', period: '8 days' },
      'pro': { price: 3500000, currency: 'NGN', period: '30 days' }, // ₦35,000 in kobo
      'business': { price: 5300000, currency: 'NGN', period: '30 days' } // ₦53,000 in kobo
    };
    return pricing[planCode as keyof typeof pricing] || pricing.free;
  };

  const getPlanLimits = (planCode: string) => {
    const limits = {
      'trial': { feedback: 50, insights: 5, analytics: 5, reports: 2 },
      'free': { feedback: 50, insights: 5, analytics: 5, reports: 2 },
      'pro': { feedback: 300, insights: 50, analytics: 100, reports: 20 },
      'business': { feedback: -1, insights: -1, analytics: -1, reports: -1 } // unlimited
    };
    return limits[planCode as keyof typeof limits] || limits.trial;
  };

  const getPlanDisplayName = (planCode: string) => {
    const names = {
      'trial': 'Free Trial',
      'free': 'Free Trial',
      'pro': 'Pro Plan',
      'business': 'Business Plan'
    };
    return names[planCode as keyof typeof names] || 'Free Trial';
  };

  // Function to set next billing date for Pro/Business users if missing
  const setNextBillingDate = async (planCode: string) => {
    if ((planCode === 'pro' || planCode === 'business') && subscription && !subscription.next_billing_date) {
      try {
        // Try to get the last transaction to calculate billing date from subscription start
        const { data: transactions } = await supabase
          .from('transactions')
          .select('created_at')
          .eq('user_id', userId)
          .eq('status', 'success')
          .order('created_at', { ascending: false })
          .limit(1);

        let nextBilling: Date;
        
        if (transactions && transactions.length > 0) {
          // Calculate from last successful payment + 30 days
          const lastPayment = new Date(transactions[0].created_at);
          nextBilling = new Date(lastPayment);
          nextBilling.setDate(nextBilling.getDate() + 30);
        } else {
          // Fallback: 30 days from now
          nextBilling = new Date();
          nextBilling.setDate(nextBilling.getDate() + 30);
        }
        
        const { error } = await supabase
          .from('billing_profiles')
          .update({ next_billing_date: nextBilling.toISOString() })
          .eq('id', userId);

        if (!error) {
          console.log('Next billing date set successfully:', nextBilling.toISOString());
          toast.success('Next billing date set successfully');
          // Refresh the data to show the updated date
          await loadUsageData();
        } else {
          console.error('Error setting next billing date:', error);
          toast.error('Failed to set next billing date');
        }
      } catch (error) {
        console.error('Error in setNextBillingDate:', error);
        toast.error('Failed to set next billing date');
      }
    }
  };

  useEffect(() => {
    loadUsageData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadUsageData, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Watch for refreshTrigger changes (when plan changes)
  useEffect(() => {
    if (refreshTrigger) {
      loadUsageData();
    }
  }, [refreshTrigger]);

  // Set next billing date for Pro/Business users if missing
  useEffect(() => {
    if (usage && subscription) {
      setNextBillingDate(usage.plan_code);
    }
  }, [usage, subscription]);

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
    const percentage = getUsagePercentage(feature);
    if (percentage >= 70 && percentage < 90) return 'text-yellow-600';
    if (percentage >= 90) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStatusIcon = (feature: any) => {
    if (feature.limit === -1) return <Infinity className="h-4 w-4 text-green-600" />;
    if (isLimitReached(feature)) return <Lock className="h-4 w-4 text-red-600" />;
    const percentage = getUsagePercentage(feature);
    if (percentage >= 70 && percentage < 90) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    if (percentage >= 90) return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  return (
    <Card className="p-6 rounded-xl shadow-lg bg-white border-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usage Overview</h2>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-gray-600">
                Current Plan: 
              </p>
              <Badge variant="outline" className="font-medium">
                {usage.plan_name}
              </Badge>
              {(usage.plan_code === 'trial' || usage.plan_code === 'free') && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Trial
                </Badge>
              )}
            </div>
            
            {/* Show pricing and renewal date */}
            {usage.plan_code !== 'trial' && usage.plan_code !== 'free' && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  {formatCurrency(getPlanPricing(usage.plan_code).price / 100, getPlanPricing(usage.plan_code).currency)}/month
                </span>
                {subscription?.next_billing_date ? (
                  <span>
                    Next Renewal: {formatDate(subscription.next_billing_date)}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">
                      Next Renewal: Not set
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setNextBillingDate(usage.plan_code)}
                      className="h-6 px-2 text-xs"
                    >
                      Set Date
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {(usage.plan_code === 'trial' || usage.plan_code === 'free') && subscription?.trial_ends_at && (
              <div className="text-sm text-gray-600">
                Trial ends: {formatDate(subscription.trial_ends_at)}
              </div>
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

      {features.some(feature => getUsagePercentage(feature) >= 90) && !features.some(feature => isLimitReached(feature)) && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Usage Warning:</strong> Some features are very close to their limits. Consider upgrading soon.
          </AlertDescription>
        </Alert>
      )}

      {features.some(feature => getUsagePercentage(feature) >= 70 && getUsagePercentage(feature) < 90) && !features.some(feature => getUsagePercentage(feature) >= 90) && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Usage Notice:</strong> Some features are approaching their limits. Keep an eye on your usage.
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
                  <strong>Limit reached!</strong> You've used {feature.count}/{feature.limit} {feature.name.toLowerCase()}. Upgrade to Business for unlimited access.
                </div>
              )}
              
              {percentage >= 90 && !reached && (
                <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-700">
                  <strong>Very close to limit!</strong> You've used {feature.count}/{feature.limit} {feature.name.toLowerCase()}. Only {feature.remaining} remaining.
                </div>
              )}
              
              {percentage >= 70 && percentage < 90 && !reached && (
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
