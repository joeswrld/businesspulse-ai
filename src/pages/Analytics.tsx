import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Search, 
  Filter,
  Download,
  Calendar,
  Tag,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Feedback {
  id: string;
  user_id: string;
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  rating: number;
  message: string;
  tags: string[];
  ai_analysis: any;
  created_at: string;
}

interface UsageStats {
  id: string;
  user_id: string;
  date: string;
  period: 'daily' | 'weekly' | 'monthly';
  insights_generated: number;
  reports_created: number;
  data_uploads: number;
  api_calls: number;
  active_minutes: number;
}

interface RevenueStats {
  id: string;
  user_id: string;
  date: string;
  mrr: number;
  arr: number;
  churn_rate: number;
  expansion_rate: number;
  customer_count: number;
  trial_conversions: number;
}

interface AnalyticsSummary {
  id: string;
  user_id: string;
  total_feedback: number;
  avg_sentiment_score: number;
  nps_score: number;
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  total_revenue: number;
  growth_rate: number;
  last_updated: string;
}

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSentiment, setSelectedSentiment] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching analytics data for user:', user.id);
      
      // Fetch feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      // Fetch usage stats
      const { data: usageData, error: usageError } = await supabase
        .from('usage_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('period', selectedPeriod)
        .order('date', { ascending: false })
        .limit(30);

      if (usageError) throw usageError;

      // Fetch revenue stats
      const { data: revenueData, error: revenueError } = await supabase
        .from('revenue_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      if (revenueError) throw revenueError;

      // Fetch analytics summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('analytics_summary')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (summaryError && summaryError.code !== 'PGRST116') throw summaryError;

      console.log('📊 Analytics data fetched:', {
        feedback: feedbackData?.length || 0,
        usage: usageData?.length || 0,
        revenue: revenueData?.length || 0,
        summary: summaryData ? 'Yes' : 'No'
      });
      
      setFeedback(feedbackData || []);
      setUsageStats(usageData || []);
      setRevenueStats(revenueData || []);
      setAnalyticsSummary(summaryData);
      
    } catch (error) {
      console.error('❌ Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, selectedPeriod, toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time subscriptions for user:', user.id);

    // Subscribe to feedback changes
    const feedbackChannel = supabase
      .channel('feedback-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Feedback real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            setFeedback(prev => [payload.new as Feedback, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setFeedback(prev => 
              prev.map(item => 
                item.id === payload.new.id ? payload.new as Feedback : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setFeedback(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to analytics summary changes
    const summaryChannel = supabase
      .channel('analytics-summary-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analytics_summary',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Analytics summary real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setAnalyticsSummary(payload.new as AnalyticsSummary);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time subscriptions');
      supabase.removeChannel(feedbackChannel);
      supabase.removeChannel(summaryChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Filtered feedback
  const filteredFeedback = useMemo(() => {
    return feedback.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSentiment = selectedSentiment === 'all' || item.sentiment === selectedSentiment;
      
      return matchesSearch && matchesCategory && matchesSentiment;
    });
  }, [feedback, searchTerm, selectedCategory, selectedSentiment]);

  // Get unique categories and sentiments
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(feedback.map(item => item.category))];
    return ['all', ...uniqueCategories.sort()];
  }, [feedback]);

  const sentiments = ['all', 'positive', 'neutral', 'negative'];

  // Export analytics data
  const exportAnalytics = async (format: 'csv' | 'json') => {
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        const csvHeaders = ['Category', 'Sentiment', 'Rating', 'Message', 'Tags', 'Created At'];
        const csvRows = filteredFeedback.map(item => [
          item.category,
          item.sentiment,
          item.rating || '',
          `"${item.message}"`,
          item.tags.join(', '),
          new Date(item.created_at).toLocaleDateString()
        ]);
        
        content = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        filename = `analytics-${Date.now()}.csv`;
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify({
          summary: analyticsSummary,
          feedback: filteredFeedback,
          usage_stats: usageStats,
          revenue_stats: revenueStats
        }, null, 2);
        filename = `analytics-${Date.now()}.json`;
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Analytics data exported to ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export analytics data",
        variant: "destructive"
      });
    }
  };

  // Utility functions
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'neutral':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4" />;
      case 'neutral':
        return <Clock className="h-4 w-4" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-lg text-gray-600">
            Real-time insights and metrics from your business data.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(analyticsSummary?.total_feedback || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Responses</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">NPS Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analyticsSummary?.nps_score || 0}
                  </div>
                  <div className="text-sm text-gray-500">Net Promoter</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Daily Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatNumber(analyticsSummary?.daily_active_users || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Active today</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(analyticsSummary?.total_revenue || 0)}
                  </div>
                  <div className="text-sm text-gray-500">Monthly recurring</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Growth Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle>Growth Rate</CardTitle>
              <CardDescription>Monthly revenue growth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {analyticsSummary?.growth_rate ? `${analyticsSummary.growth_rate.toFixed(1)}%` : '0%'}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {analyticsSummary?.growth_rate && analyticsSummary.growth_rate > 0 ? 'Growing' : 'Stable'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle>Sentiment Score</CardTitle>
              <CardDescription>Average customer sentiment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {analyticsSummary?.avg_sentiment_score ? (analyticsSummary.avg_sentiment_score * 100).toFixed(0) : '0'}%
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {analyticsSummary?.avg_sentiment_score && analyticsSummary.avg_sentiment_score > 0.7 ? 'Positive' : 'Neutral'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export and Filters */}
        <div className="bg-white rounded-xl shadow-sm border-0 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportAnalytics('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => exportAnalytics('json')}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full sm:w-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sentiment Filter */}
              <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sentiments" />
                </SelectTrigger>
                <SelectContent>
                  {sentiments.map(sentiment => (
                    <SelectItem key={sentiment} value={sentiment}>
                      {sentiment === 'all' ? 'All Sentiments' : sentiment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Customer Feedback</h2>
            <Badge variant="outline">
              {filteredFeedback.length} feedback items
            </Badge>
          </div>

          {filteredFeedback.length === 0 ? (
            <Card className="bg-white shadow-sm border-0">
              <CardContent className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {feedback.length === 0 ? 'No feedback yet' : 'No feedback matches your filters'}
                </h3>
                <p className="text-gray-500">
                  {feedback.length === 0 
                    ? 'Start collecting customer feedback to see insights here!' 
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredFeedback.map((item) => (
              <Card key={item.id} className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={`${getSentimentColor(item.sentiment)} border`}>
                          <div className="flex items-center gap-1">
                            {getSentimentIcon(item.sentiment)}
                            <span className="capitalize">{item.sentiment}</span>
                          </div>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        {item.rating && (
                          <Badge variant="secondary" className="text-xs">
                            {item.rating}/10
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{item.message}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatTimeAgo(item.created_at)}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;