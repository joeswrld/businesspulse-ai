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
  Loader2
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
        setUsage(data[0]);
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
    if (feature.limit === -1) return <Infinity className="h-4 w-4" />;
    if (isLimitReached(feature)) return <AlertTriangle className="h-4 w-4" />;
    if (getUsagePercentage(feature) > 80) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <Card className="p-4 rounded-xl shadow bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">Usage Overview</h2>
          <p className="text-sm text-gray-600">
            Current plan: <Badge variant="outline">{usage.plan_name}</Badge>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshUsage}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {features.map((feature) => (
          <div key={feature.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <feature.icon className={`h-4 w-4 ${getStatusColor(feature)}`} />
                <span className="font-medium">{feature.name}</span>
                {getStatusIcon(feature)}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {feature.count}
                  {feature.limit === -1 ? (
                    <span className="text-green-600"> / ∞</span>
                  ) : (
                    <span> / {feature.limit}</span>
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
              <Progress 
                value={getUsagePercentage(feature)} 
                className="h-2"
              />
            )}
            
            <p className="text-xs text-gray-500">{feature.description}</p>
          </div>
        ))}
      </div>

      {usage.plan_code === 'free' && (
        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You're on the free plan. Upgrade to Pro or Business for higher limits and unlimited access.
            {onUpgrade && (
              <Button
                variant="default"
                size="sm"
                className="ml-2"
                onClick={() => onUpgrade('pro')}
              >
                Upgrade Now
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-4 text-xs text-gray-500 text-center">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </Card>
  );
}
