import React from 'react';

// Explicit imports from UI components
import { Card } from '@/components/ui/card';
import { CardContent } from '@/components/ui/card';
import { CardHeader } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import { AlertDescription } from '@/components/ui/alert';

// Icons
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
  Crown,
  XCircle,
  DollarSign
} from 'lucide-react';

// Custom hooks & utilities
import { useUsageOverview } from '@/hooks/useUsageOverview';
import { toast } from 'sonner';


interface UsageOverviewProps {
  userId: string;
  onUpgrade?: (plan: 'business') => void;
  refreshTrigger?: number;
}

// Feature type
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

// Feature Card Component
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
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon className={`h-5 w-5 ${getStatusColor()}`} />
          <span className="font-semibold text-gray-900">{feature.name}</span>
          {getStatusIcon()}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {feature.count}{feature.limit === -1 ? <span className="text-green-600 text-sm"> / ∞</span> : <span className="text-gray-600 text-sm"> / {feature.limit}</span>}
          </div>
          {feature.limit !== -1 && (
            <div className="text-xs text-gray-500">{feature.remaining > 0 ? `${feature.remaining} remaining` : 'Limit reached'}</div>
          )}
        </div>
      </div>

      {/* Progress */}
      {feature.limit !== -1 && (
        <div className="space-y-2">
          <Progress value={feature.percentage} className="h-3" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{feature.isLimitReached ? 'Limit reached' : `${feature.remaining} remaining`}</span>
            <span className="font-medium">{Math.round(feature.percentage)}%</span>
          </div>
        </div>
      )}

      {/* Unlimited badge */}
      {feature.limit === -1 && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-100 p-2 rounded">
          <Infinity className="h-4 w-4" /> Unlimited usage
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3">{feature.description}</p>

      {/* Alerts */}
      {feature.isLimitReached && (
        <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-700">
          <strong>Limit reached!</strong> Upgrade for unlimited access.
          {onUpgrade && (
            <Button size="xs" className="ml-2 bg-red-600 hover:bg-red-700" onClick={() => onUpgrade('business')}>Upgrade</Button>
          )}
        </div>
      )}
      {feature.percentage >= 90 && !feature.isLimitReached && (
        <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-700">
          <strong>Very close to limit!</strong> Only {feature.remaining} remaining.
        </div>
      )}
      {feature.percentage >= 70 && feature.percentage < 90 && !feature.isLimitReached && (
        <div className="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-700">
          <strong>Approaching limit.</strong> {feature.remaining} remaining.
        </div>
      )}
    </div>
  );
};

// UsageOverview Component
export default function UsageOverview({ userId, onUpgrade, refreshTrigger }: UsageOverviewProps) {
  const { data, loading, refreshing, error, refresh } = useUsageOverview(userId);

  useEffect(() => {
    if (refreshTrigger) refresh();
  }, [refreshTrigger, refresh]);

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const getPlanPricing = (planType: string) => ({
    'trial': { price: 0, currency: 'NGN', period: '8 days' },
    'business': { price: 5300000, currency: 'NGN', period: '30 days' }
  }[planType as 'trial' | 'business'] || { price: 0, currency: 'NGN', period: '8 days' });

  const getPlanDisplayName = (planType: string) => ({
    'trial': 'Free Trial',
    'business': 'Business Plan'
  }[planType as 'trial' | 'business'] || 'Free Trial');

  if (loading) return <Card className="p-6 rounded-xl shadow-lg text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /><p>Loading usage data...</p></Card>;
  if (error) return <Card className="p-6 rounded-xl shadow-lg"><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>Error: {error}</AlertDescription></Alert></Card>;
  if (!data) return <Card className="p-6 rounded-xl shadow-lg text-center">No usage data yet. <Button onClick={refresh} disabled={refreshing}>{refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}</Button></Card>;
  if (data.isTrialExpired) return (
    <Card className="p-6 rounded-xl shadow-lg text-center border-red-200">
      <div className="py-8">
        <div className="p-4 bg-red-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center"><XCircle className="h-10 w-10 text-red-600" /></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Trial Expired</h2>
        <p className="text-gray-600 mb-6">Upgrade to Business to continue using advanced features.</p>
        <Button onClick={() => onUpgrade?.('business')} className="bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-2"><Crown className="h-4 w-4" /> Upgrade</Button>
      </div>
    </Card>
  );

  const features: Feature[] = [
    { key: 'feedback', name: 'Feedback', icon: MessageSquare, description: 'Customer feedback submissions', count: data.usage.feedback_count, limit: data.limits.feedback, remaining: data.remaining.feedback, percentage: data.percentages.feedback, isLimitReached: data.isLimitReached.feedback },
    { key: 'insights', name: 'AI Insights', icon: Brain, description: 'AI-powered business insights', count: data.usage.insights_count, limit: data.limits.insights, remaining: data.remaining.insights, percentage: data.percentages.insights, isLimitReached: data.isLimitReached.insights },
    { key: 'analytics', name: 'Analytics', icon: BarChart3, description: 'Data analytics', count: data.usage.analytics_count, limit: data.limits.analytics, remaining: data.remaining.analytics, percentage: data.percentages.analytics, isLimitReached: data.isLimitReached.analytics },
    { key: 'reports', name: 'Reports', icon: FileText, description: 'Comprehensive reports', count: data.usage.reports_count, limit: data.limits.reports, remaining: data.remaining.reports, percentage: data.percentages.reports, isLimitReached: data.isLimitReached.reports }
  ];

  const planPricing = getPlanPricing(data.subscription.plan_type);
  const planDisplayName = getPlanDisplayName(data.subscription.plan_type);

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
              {data.subscription.plan_type === 'trial' && <Badge variant="secondary" className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Trial</Badge>}
            </div>
            {data.subscription.plan_type !== 'trial' && <div className="text-sm text-gray-600">{formatCurrency(planPricing.price/100, planPricing.currency)}/month • Next Renewal: {data.subscription.renewal_date && formatDate(data.subscription.renewal_date)}</div>}
            {data.subscription.plan_type === 'trial' && data.subscription.trial_end && <div className="text-sm text-gray-600">Trial ends: {formatDate(data.subscription.trial_end)}</div>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="border-gray-300 hover:bg-gray-50">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
        </Button>
      </div>

      {/* Feature Grid */}
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
