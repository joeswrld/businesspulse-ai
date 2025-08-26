import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { checkAndSetupDatabase } from '@/utils/databaseCheck';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  FileText, 
  BarChart, 
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  Activity,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  MessageSquare,
  Crown,
  CreditCard,
  Calendar,
  Filter,
  Eye,
  TrendingDown,
  Minus,
  PieChart,
  LineChart,
  BarChart as BarChartIcon,
  Download,
  Settings
} from 'lucide-react';

import {
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

// Types
interface Feedback {
  id: string;
  project_id: string;
  name: string;
  email: string;
  message: string;
  timestamp: string;
  status: 'new' | 'reviewed' | 'resolved';
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_name: string;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  totalFeedback: number;
  positiveSentiment: number;
  negativeSentiment: number;
  neutralSentiment: number;
  activeUsers: number;
  topThemes: Array<{ theme: string; count: number }>;
  feedbackVolume: Array<{ date: string; count: number }>;
  sentimentTrend: {
    currentPeriod: number;
    previousPeriod: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface AIInsight {
  summary: string;
  key_themes: string[];
  suggested_actions: string[];
  sentiment_overview: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  
  // State management
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load user's data
  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('Loading dashboard data for user:', user.id);
      
      // Get user's project IDs from feedback_settings
      let projectSettings = [];
      try {
        const { data, error: projectError } = await supabase
          .from('feedback_settings')
          .select('project_id')
          .eq('user_id', user.id);

        if (projectError) {
          console.error('Error loading project settings:', projectError);
          // Don't show error toast, just continue with empty data
        } else {
          projectSettings = data || [];
        }
      } catch (error) {
        console.error('Exception loading project settings:', error);
        // Continue with empty data
      }

      console.log('Project settings loaded:', projectSettings);
      const projectIds = projectSettings?.map(setting => setting.project_id).filter(Boolean) || [];
      console.log('Project IDs:', projectIds);

      // Get latest 50 feedbacks for user's projects
      let feedbacksData = [];
      if (projectIds.length > 0) {
        try {
          const { data, error: feedbacksError } = await supabase
            .from('feedbacks')
            .select('*')
            .in('project_id', projectIds)
            .order('timestamp', { ascending: false })
            .limit(50);

          if (feedbacksError) {
            console.error('Error loading feedbacks:', feedbacksError);
            // Don't show error toast, just continue with empty data
          } else {
            feedbacksData = data || [];
          }
        } catch (error) {
          console.error('Exception loading feedbacks:', error);
          // Continue with empty data
        }
      } else {
        console.log('No project IDs found, setting empty feedbacks');
      }

      console.log('Feedbacks loaded:', feedbacksData.length);
      setFeedbacks(feedbacksData);

      // Get user subscription
      let subscriptionData = null;
      try {
        const { data, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          console.error('Error loading subscription:', subscriptionError);
          // Don't show error toast, just continue with null subscription
        } else {
          subscriptionData = data;
        }
      } catch (error) {
        console.error('Exception loading subscription:', error);
        // Continue with null subscription
      }

      console.log('Subscription loaded:', subscriptionData);
      console.log('Subscription properties:', {
        plan_name: subscriptionData?.plan_name,
        plan_type: subscriptionData?.plan_type,
        subscription_type: subscriptionData?.subscription_type,
        status: subscriptionData?.status,
        trial_end: subscriptionData?.trial_end,
        current_period_end: subscriptionData?.current_period_end
      });
      setSubscription(subscriptionData);

    } catch (error) {
      console.error('Error in loadDashboardData:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while loading dashboard data');
      // Don't show error toast, just continue with empty data
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data on component mount
  useEffect(() => {
    if (user) {
      // First check and setup database if needed
      checkAndSetupDatabase(user.id).then(() => {
        // Then load dashboard data
        loadDashboardData();
      });
    }
  }, [loadDashboardData, user]);

  // Analyze sentiment from message content
  const analyzeSentiment = (message: string): 'positive' | 'negative' | 'neutral' => {
    const positiveWords = [
      'great', 'good', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'satisfied',
      'perfect', 'awesome', 'outstanding', 'brilliant', 'superb', 'terrific', 'pleased', 'impressed', 'smooth',
      'fast', 'easy', 'intuitive', 'beautiful', 'clean', 'modern', 'helpful', 'supportive', 'responsive'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'annoyed', 'disappointed',
      'broken', 'slow', 'difficult', 'confusing', 'ugly', 'cluttered', 'buggy', 'crash', 'error', 'fail',
      'useless', 'waste', 'problem', 'issue', 'complaint', 'unhappy', 'dissatisfied', 'poor', 'weak'
    ];

    const messageLower = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  };

  // Extract themes from message content
  const extractThemes = (message: string): string[] => {
    const commonThemes = [
      'user interface', 'ui', 'ux', 'design', 'performance', 'speed', 'loading', 'bug', 'error', 'crash',
      'mobile', 'responsive', 'navigation', 'search', 'filter', 'dashboard', 'report', 'export', 'import',
      'notification', 'email', 'login', 'authentication', 'security', 'privacy', 'data', 'storage',
      'customer support', 'help', 'documentation', 'tutorial', 'onboarding', 'feature', 'functionality',
      'pricing', 'billing', 'subscription', 'upgrade', 'downgrade', 'integration', 'api', 'webhook'
    ];

    const messageLower = message.toLowerCase();
    const foundThemes = commonThemes.filter(theme => messageLower.includes(theme));
    
    if (foundThemes.length === 0) {
      const words = messageLower.split(/\s+/).filter(word => word.length > 3);
      const uniqueWords = [...new Set(words)].slice(0, 3);
      return uniqueWords.map(word => word.charAt(0).toUpperCase() + word.slice(1));
    }

    return foundThemes.slice(0, 3);
  };

  // Calculate dashboard stats
  const dashboardStats = useMemo((): DashboardStats => {
    console.log('Calculating dashboard stats for', feedbacks.length, 'feedbacks');
    
    if (feedbacks.length === 0) {
      console.log('No feedbacks, returning empty stats');
      return {
        totalFeedback: 0,
        positiveSentiment: 0,
        negativeSentiment: 0,
        neutralSentiment: 0,
        activeUsers: 0,
        topThemes: [],
        feedbackVolume: [],
        sentimentTrend: { currentPeriod: 0, previousPeriod: 0, change: 0, trend: 'stable' }
      };
    }

    // Filter feedbacks based on date range
    const now = new Date();
    const filteredFeedbacks = feedbacks.filter(feedback => {
      const feedbackDate = new Date(feedback.timestamp);
      const diffTime = Math.abs(now.getTime() - feedbackDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      switch (dateRange) {
        case '7d': return diffDays <= 7;
        case '30d': return diffDays <= 30;
        case '90d': return diffDays <= 90;
        default: return true;
      }
    });

    // Calculate sentiment distribution
    const sentiments = filteredFeedbacks.map(feedback => analyzeSentiment(feedback.message));
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    const neutralCount = sentiments.filter(s => s === 'neutral').length;

    // Calculate active users (unique names/emails)
    const uniqueUsers = new Set();
    filteredFeedbacks.forEach(feedback => {
      if (feedback.name) uniqueUsers.add(feedback.name);
      if (feedback.email) uniqueUsers.add(feedback.email);
    });

    // Extract and count themes
    const allThemes = filteredFeedbacks.flatMap(feedback => extractThemes(feedback.message));
    const themeCounts: Record<string, number> = {};
    allThemes.forEach(theme => {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    });

    const topThemes = Object.entries(themeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));

    // Calculate feedback volume over time
    const volumeData: Record<string, number> = {};
    filteredFeedbacks.forEach(feedback => {
      const date = new Date(feedback.timestamp).toISOString().split('T')[0];
      volumeData[date] = (volumeData[date] || 0) + 1;
    });

    const feedbackVolume = Object.entries(volumeData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Calculate sentiment trend (last 7 days vs previous 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const currentPeriodFeedbacks = filteredFeedbacks.filter(feedback => 
      new Date(feedback.timestamp) >= sevenDaysAgo
    );
    const previousPeriodFeedbacks = filteredFeedbacks.filter(feedback => {
      const feedbackDate = new Date(feedback.timestamp);
      return feedbackDate >= fourteenDaysAgo && feedbackDate < sevenDaysAgo;
    });

    const currentPeriodPositive = currentPeriodFeedbacks.filter(f => 
      analyzeSentiment(f.message) === 'positive'
    ).length;
    const previousPeriodPositive = previousPeriodFeedbacks.filter(f => 
      analyzeSentiment(f.message) === 'positive'
    ).length;

    const currentPeriodTotal = currentPeriodFeedbacks.length;
    const previousPeriodTotal = previousPeriodFeedbacks.length;

    const currentPeriodPercentage = currentPeriodTotal > 0 
      ? (currentPeriodPositive / currentPeriodTotal) * 100 
      : 0;
    const previousPeriodPercentage = previousPeriodTotal > 0 
      ? (previousPeriodPositive / previousPeriodTotal) * 100 
      : 0;

    const change = currentPeriodPercentage - previousPeriodPercentage;
    const trend: 'up' | 'down' | 'stable' = 
      Math.abs(change) < 5 ? 'stable' : change > 0 ? 'up' : 'down';

    return {
      totalFeedback: filteredFeedbacks.length,
      positiveSentiment: positiveCount,
      negativeSentiment: negativeCount,
      neutralSentiment: neutralCount,
      activeUsers: uniqueUsers.size,
      topThemes,
      feedbackVolume,
      sentimentTrend: {
        currentPeriod: Math.round(currentPeriodPercentage),
        previousPeriod: Math.round(previousPeriodPercentage),
        change: Math.round(change),
        trend
      }
    };
  }, [feedbacks, dateRange]);

  // Filter feedbacks based on sentiment
  const filteredFeedbacks = useMemo(() => {
    if (sentimentFilter === 'all') return feedbacks;
    return feedbacks.filter(feedback => analyzeSentiment(feedback.message) === sentimentFilter);
  }, [feedbacks, sentimentFilter]);

  // Generate AI insight
  const generateAIInsight = useCallback(async () => {
    if (!user || feedbacks.length === 0) return;

    setGeneratingInsight(true);
    try {
      // Call the analyze-insights Edge Function
      const response = await fetch('/functions/v1/analyze-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
        },
        body: JSON.stringify({
          data: feedbacks.slice(0, 10).map(f => f.message).join('\n\n'),
          userId: user.id,
          fileType: 'feedback-analysis'
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.analysis) {
        setAiInsight({
          summary: result.analysis.summary,
          key_themes: result.analysis.key_themes,
          suggested_actions: result.analysis.suggested_actions,
          sentiment_overview: `Overall sentiment: ${result.analysis.sentiment.overall} (${result.analysis.sentiment.positive}% positive, ${result.analysis.sentiment.negative}% negative, ${result.analysis.sentiment.neutral}% neutral)`
        });
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error generating AI insight:', error);
      toast.error('Failed to generate AI insight');
    } finally {
      setGeneratingInsight(false);
    }
  }, [user, feedbacks]);

  // Generate insight on mount if feedbacks exist
  useEffect(() => {
    if (feedbacks.length > 0 && !aiInsight) {
      generateAIInsight();
    }
  }, [feedbacks, aiInsight, generateAIInsight]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toISOString().split('T')[0];
  };

  // Get sentiment badge variant
  const getSentimentBadgeVariant = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'default';
      case 'negative':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new':
        return 'secondary';
      case 'reviewed':
        return 'default';
      case 'resolved':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Get plan display info
  const getPlanInfo = () => {
    console.log('🔍 getPlanInfo called with subscription:', subscription);
    
    if (!subscription) {
      console.log('🔍 No subscription, returning default');

    // If no subscription, show Free Trial based on account creation
    if (!subscription) {
      const createdAt = user?.created_at ? new Date(user.created_at) : null;
      let daysLeft = 0;
      if (createdAt) {
        const trialEnd = new Date(createdAt);
        trialEnd.setDate(trialEnd.getDate() + 8);
        const now = new Date();
        daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      return {
        planName: 'Free Trial',
        planType: 'trial',
        isTrial: true,
        daysLeft,
        upgradeText: 'Upgrade to Pro',
        upgradeLink: '/billing?plan=pro'
      };
    }

    // Safely get subscription properties with defaults
    const planName = subscription.plan_name || subscription.subscription_type || 'free';
    const planType = subscription.plan_type || 'free';
    const trialEnd = subscription.trial_end || subscription.current_period_end;
    
    console.log('🔍 Plan info extracted:', { planName, planType, trialEnd });
    
    const isTrial = planName === 'free_trial' || planName === 'free';
    const trialEndDate = trialEnd ? new Date(trialEnd) : new Date();
    const now = new Date();
    const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // With subscription, check if user is currently in trial
    const isTrial = subscription.status === 'trialing';
    let daysLeft = 0;
    if (isTrial && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      const now = new Date();
      daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }


    let upgradeText = '';
    let upgradeLink = '';

    if (isTrial) {
      upgradeText = 'Upgrade to Pro';
      upgradeLink = '/billing?plan=pro';
    } else if (planName === 'pro') {

    } else if ((subscription.plan_name || '').toLowerCase() === 'pro') {

      upgradeText = 'Upgrade to Business';
      upgradeLink = '/billing?plan=business';
    } else {
      upgradeText = 'Manage Subscription';
      upgradeLink = '/billing';
    }

    // Safely format plan name
    const formattedPlanName = planName 
      ? planName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'Free Plan';

    console.log('🔍 Returning plan info:', {
      planName: formattedPlanName,
      planType,
      isTrial,
      daysLeft: Math.max(0, daysLeft),
      upgradeText,
      upgradeLink
    });

    return {
      planName: formattedPlanName,
      planType: planType,

      planName: isTrial
        ? 'Free Trial'
        : (subscription.plan_name || 'Pro').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      planType: isTrial ? 'trial' : subscription.plan_type,

      isTrial,
      daysLeft,
      upgradeText,
      upgradeLink
    };
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to access your dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Loading Dashboard...</h2>
            <p className="text-gray-600">Please wait while we fetch your data.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Dashboard Error</h2>
            <p className="text-gray-600 mb-4">There was an issue loading your dashboard data.</p>
            <div className="space-y-2">
              <Button onClick={() => {
                setError(null);
                setLoading(true);
                loadDashboardData();
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <p className="text-xs text-gray-500">Error: {error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const planInfo = getPlanInfo();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Real-time overview of your feedback and insights
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live</span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-500">
              {feedbacks.length > 0 ? `${feedbacks.length} feedback entries` : 'No feedback yet'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="rounded-xl shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Date Range Filter */}
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            {/* Sentiment Filter */}
            <Select value={sentimentFilter} onValueChange={(value: any) => setSentimentFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>

            {/* Navigation Buttons */}
            <div className="flex space-x-2 ml-auto">
              <Button variant="outline" asChild>
                <a href="/feedback">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Feedback
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/insights-simple">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Insights
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/reports">
                  <FileText className="h-4 w-4 mr-2" />
                  Reports
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/billing">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info - Remove this in production */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="rounded-xl shadow-lg border-2 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="text-sm text-yellow-800">
              <strong>Debug Info:</strong> Feedbacks: {feedbacks.length} | 
              Loading: {loading.toString()} | 
              User: {user?.email} | 
              Subscription: {subscription?.plan_name || 'None'}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Row - KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Feedback */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalFeedback}</div>
            <p className="text-xs text-muted-foreground">
              {dateRange === 'all' ? 'All time' : `Last ${dateRange}`}
            </p>
          </CardContent>
        </Card>

        {/* Positive Sentiment */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardStats.totalFeedback > 0 
                ? Math.round((dashboardStats.positiveSentiment / dashboardStats.totalFeedback) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.positiveSentiment} feedbacks
            </p>
          </CardContent>
        </Card>

        {/* Negative Sentiment */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negative</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {dashboardStats.totalFeedback > 0 
                ? Math.round((dashboardStats.negativeSentiment / dashboardStats.totalFeedback) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.negativeSentiment} feedbacks
            </p>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {dashboardStats.activeUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique feedback providers
            </p>
          </CardContent>
        </Card>

        {/* Plan Status */}
        <Card className="rounded-xl shadow-lg border-2 border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan Status</CardTitle>
            {planInfo.planName === 'Business' ? (
              <Crown className="h-4 w-4 text-yellow-600" />
            ) : (
              <CreditCard className="h-4 w-4 text-blue-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-blue-900">
              {planInfo.planName}
            </div>
            {planInfo.isTrial && planInfo.daysLeft > 0 && (
              <p className="text-xs text-blue-700 mt-1">
                {planInfo.daysLeft} days left
              </p>
            )}
            <Button 
              size="sm" 
              className="mt-2 w-full text-xs"
              asChild
            >
              <a href={planInfo.upgradeLink}>
                {planInfo.upgradeText}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Middle Row - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feedback Volume Over Time */}
        <Card className="rounded-xl shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LineChart className="h-5 w-5" />
              <span>Feedback Volume Over Time</span>
            </CardTitle>
            <CardDescription>
              Daily feedback count for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardStats.feedbackVolume.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboardStats.feedbackVolume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => formatDate(value)}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(value) => formatDate(value)}
                    formatter={(value: any) => [value, 'Feedback Count']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p>No volume data available</p>
                  <p className="text-sm text-gray-400">Start collecting feedback to see trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sentiment Distribution */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Sentiment Breakdown</span>
            </CardTitle>
            <CardDescription>
              Distribution of feedback sentiment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardStats.totalFeedback > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={[
                      { name: 'Positive', value: dashboardStats.positiveSentiment, color: '#10b981' },
                      { name: 'Neutral', value: dashboardStats.neutralSentiment, color: '#f59e0b' },
                      { name: 'Negative', value: dashboardStats.negativeSentiment, color: '#ef4444' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: 'Positive', value: dashboardStats.positiveSentiment, color: '#10b981' },
                      { name: 'Neutral', value: dashboardStats.neutralSentiment, color: '#f59e0b' },
                      { name: 'Negative', value: dashboardStats.negativeSentiment, color: '#ef4444' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No sentiment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Charts and AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Themes */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChartIcon className="h-5 w-5" />
              <span>Top 5 Themes</span>
            </CardTitle>
            <CardDescription>
              Most frequently mentioned themes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardStats.topThemes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={dashboardStats.topThemes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="theme" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: any) => [value, 'Mentions']} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No theme data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Insights Summary */}
        <Card className="rounded-xl shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <span>AI Insights Summary</span>
            </CardTitle>
            <CardDescription>
              AI-generated analysis of your feedback data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatingInsight ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-gray-600">Generating insights...</p>
                </div>
              </div>
            ) : aiInsight ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {aiInsight.summary}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Key Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {aiInsight.key_themes.slice(0, 5).map((theme, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Suggested Actions</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {aiInsight.suggested_actions.slice(0, 3).map((action, index) => (
                      <li key={index} className="flex items-start">
                        <Target className="h-3 w-3 text-blue-600 mr-2 mt-1 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-600">
                    {aiInsight.sentiment_overview}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No insights available</p>
                <Button 
                  size="sm" 
                  onClick={generateAIInsight}
                  className="mt-2"
                >
                  Generate Insights
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Feedback Feed */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Recent Feedback Feed</span>
          </CardTitle>
          <CardDescription>
            Latest feedback entries with sentiment analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFeedbacks.length > 0 ? (
            <div className="space-y-4">
              {filteredFeedbacks.slice(0, 10).map((feedback) => (
                <div key={feedback.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {feedback.name || 'Anonymous'}
                      </span>
                      <Badge variant={getSentimentBadgeVariant(analyzeSentiment(feedback.message))}>
                        {analyzeSentiment(feedback.message)}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(feedback.status)}>
                        {feedback.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(feedback.timestamp)}</span>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm line-clamp-2">{feedback.message}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {extractThemes(feedback.message).map((theme, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchTerm || sentimentFilter !== 'all' ? 'No feedback found' : 'No feedback yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || sentimentFilter !== 'all' 
                  ? 'Try adjusting your search or filters.'
                  : 'Start collecting feedback through your widget to see insights and analytics.'
                }
              </p>
              {!searchTerm && sentimentFilter === 'all' && (
                <div className="flex justify-center space-x-2">
                  <Button asChild>
                    <a href="/feedback">Go to Feedback</a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="/feedback-settings">Configure Widget</a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}