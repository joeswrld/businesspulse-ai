import React, { useEffect } from 'react';
import { Card, Badge, Button, Progress, Alert, AlertDescription } from '@/components/ui';
import {
  MessageSquare, Brain, BarChart3, FileText, AlertTriangle, CheckCircle,
  Infinity, RefreshCw, Loader2, Lock, Clock, Crown, XCircle
} from 'lucide-react';
import { useUsageOverview } from '@/hooks/useUsageOverview';

interface UsageOverviewProps {
  userId: string;
  onUpgrade?: (plan: 'business') => void;
  refreshTrigger?: number;
}

interface Feature {
  key: string;
  name: string;
  icon: React.FC<any>;
  description: string;
  count: number;
  limit: number;
  remaining: number;
  percentage: number;
  isLimitReached: boolean;
}

const FeatureCard: React.FC<{ feature: Feature; onUpgrade?: (plan: 'business') => void }> = ({ feature, onUpgrade }) => {
  const Icon = feature.icon;

  const getStatusColor = () => {
    if (feature.limit === -1) return 'text-green-600';
    if (feature.isLimitReached) return 'text-red-600';
    if (feature.percentage >= 80) return 'text-orange-600';
    if (feature.percentage >= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (feature.limit === -1) return <Infinity className="h-4 w-4 text-green-600" />;
    if (feature.isLimitReached) return <Lock className="h-4 w-4 text-red-600" />;
    if (feature.percentage >= 80) return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    if (feature.percentage >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  return (
    <div className={`p-4 rounded-lg border-2 transition-all duration-200
      ${feature.isLimitReached ? 'border-red-200 bg-red-50' : feature.percentage >= 80 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
      
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon className={`h-5 w-5 ${getStatusColor()}`} />
          <span className="font-semibold text-gray-900">{feature.name}</span>
          {getStatusIcon()}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {feature.count}{feature.limit === -1 ? ' / ∞' : ` / ${feature.limit}`}
          </div>
          {feature.limit !== -1 && <div className="text-xs text-gray-500">{feature.remaining > 0 ? `${feature.remaining} remaining` : 'Limit reached'}</div>}
        </div>
      </div>

      {feature.limit !== -1 && (
        <Progress value={feature.percentage} className="h-3 mb-2" />
      )}

      <p className="text-xs text-gray-500 mt-2">{feature.description}</p>
    </div>
  );
};

export default function UsageOverview({ userId, onUpgrade, refreshTrigger }: UsageOverviewProps) {
  const { data, loading, refreshing, error, refresh } = useUsageOverview(userId);

  useEffect(() => {
    if (refreshTrigger) refresh?.();
  }, [refreshTrigger, refresh]);

  const formatCurrency = (amount: number, currency = 'NGN') => 
    new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  if (loading) return <Card className="p-6 rounded-xl shadow-lg text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /><p>Loading usage data...</p></Card>;
  if (error) return <Card className="p-6 rounded-xl shadow-lg"><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert></Card>;
  if (!data) return <Card className="p-6 rounded-xl shadow-lg text-center">No usage data yet. <Button onClick={refresh} disabled={refreshing}>{refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}</Button></Card>;

  const planType = data.subscription?.plan_type || 'trial';
  const planDisplayName = planType === 'business' ? 'Business' : 'Free';
  const planPricing = planType === 'business' ? { price: 5300000, currency: 'NGN', period: '30 days' } : { price: 0, currency: 'NGN', period: '8 days' };

  const features: Feature[] = [
    { key: 'feedback', name: 'Feedback', icon: MessageSquare, description: 'Customer feedback submissions', count: data.usage?.feedback_count ?? 0, limit: data.limits?.feedback ?? 50, remaining: data.remaining?.feedback ?? 50, percentage: data.percentages?.feedback ?? 0, isLimitReached: data.isLimitReached?.feedback ?? false },
    { key: 'insights', name: 'AI Insights', icon: Brain, description: 'AI-powered business insights', count: data.usage?.insights_count ?? 0, limit: data.limits?.insights ?? 5, remaining: data.remaining?.insights ?? 5, percentage: data.percentages?.insights ?? 0, isLimitReached: data.isLimitReached?.insights ?? false },
    { key: 'analytics', name: 'Analytics', icon: BarChart3, description: 'Data analytics', count: data.usage?.analytics_count ?? 0, limit: data.limits?.analytics ?? 5, remaining: data.remaining?.analytics ?? 5, percentage: data.percentages?.analytics ?? 0, isLimitReached: data.isLimitReached?.analytics ?? false },
    { key: 'reports', name: 'Reports', icon: FileText, description: 'Comprehensive reports', count: data.usage?.reports_count ?? 0, limit: data.limits?.reports ?? 5, remaining: data.remaining?.reports ?? 5, percentage: data.percentages?.reports ?? 0, isLimitReached: data.isLimitReached?.reports ?? false },
  ];

  return (
    <Card className="p-6 rounded-xl shadow-lg bg-white border-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usage Overview</h2>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-gray-600">Current Plan:</p>
              <Badge variant="outline">{planDisplayName}</Badge>

              {planType === 'trial' && data.subscription?.trial_end && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Trial
                </Badge>
              )}
            </div>

            {planType === 'business' && data.subscription?.renewal_date && (
              <div className="text-sm text-gray-600">
                {formatCurrency(planPricing.price / 100, planPricing.currency)} / month • Next Renewal: {formatDate(data.subscription.renewal_date)}
              </div>
            )}

            {planType === 'trial' && data.subscription?.trial_end && (
              <div className="text-sm text-gray-600">Trial ends: {formatDate(data.subscription.trial_end)}</div>
            )}
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="border-gray-300 hover:bg-gray-50">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
        </Button>
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {features.map(f => <FeatureCard key={f.key} feature={f} onUpgrade={onUpgrade} />)}
      </div>

      {/* Footer */}
      <div className="mt-6 text-xs text-gray-500 text-center">
        Last updated: {new Date().toLocaleTimeString()} • Updates every 30 seconds
      </div>
    </Card>
  );
}
