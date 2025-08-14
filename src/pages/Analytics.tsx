import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart,
  Activity,
  Target,
  Users,
  Brain,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  Filter,
  Search
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AnalyticsSummary {
  id: string;
  user_id: string;
  total_insights: number;
  total_uploads: number;
  total_reports: number;
  avg_confidence: number;
  insights_by_category: { category: string; count: number }[];
  insights_by_priority: { priority: string; count: number }[];
  sentiment_distribution: { sentiment: string; count: number }[];
  growth_rate: number;
  top_performing_insights: unknown[];
  created_at: string;
  updated_at: string;
}

interface Insight {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  key_findings: string[];
  recommendations: string[];
  projected_impact: string | null;
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  created_at: string;
  updated_at: string;
}

interface Upload {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: 'processing' | 'completed' | 'failed';
  insights_generated: number;
  created_at: string;
}

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching analytics data for user:', user.id);
      
      // Fetch analytics summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('analytics_summary')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (summaryError && summaryError.code !== 'PGRST116') throw summaryError;

      // Fetch insights for detailed analysis
      const { data: insightsData, error: insightsError } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (insightsError) throw insightsError;

      // Fetch uploads for data source analysis
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('data_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (uploadsError) throw uploadsError;

      console.log('📊 Analytics data fetched:', {
        summary: summaryData ? 'Yes' : 'No',
        insights: insightsData?.length || 0,
        uploads: uploadsData?.length || 0
      });
      
      setAnalyticsSummary(summaryData);
      setInsights(insightsData || []);
      setUploads(uploadsData || []);
      
    } catch (error) {
      console.error('❌ Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time analytics subscriptions for user:', user.id);

    // Subscribe to insights changes
    const insightsChannel = supabase
      .channel('analytics-insights-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_insights',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Insight real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            setInsights(prev => [payload.new as Insight, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setInsights(prev => 
              prev.map(insight => 
                insight.id === payload.new.id ? payload.new as Insight : insight
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setInsights(prev => prev.filter(insight => insight.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to uploads changes
    const uploadsChannel = supabase
      .channel('analytics-uploads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_uploads',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Upload real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            setUploads(prev => [payload.new as Upload, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setUploads(prev => 
              prev.map(upload => 
                upload.id === payload.new.id ? payload.new as Upload : upload
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time analytics subscriptions');
      supabase.removeChannel(insightsChannel);
      supabase.removeChannel(uploadsChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Filter insights based on selections
  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      const matchesCategory = selectedCategory === 'all' || insight.category === selectedCategory;
      const matchesPriority = selectedPriority === 'all' || insight.priority === selectedPriority;
      
      // Filter by time range
      const insightDate = new Date(insight.created_at);
      const now = new Date();
      let matchesTimeRange = true;
      
      switch (selectedTimeRange) {
        case '7d':
          matchesTimeRange = (now.getTime() - insightDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          break;
        case '30d':
          matchesTimeRange = (now.getTime() - insightDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          break;
        case '90d':
          matchesTimeRange = (now.getTime() - insightDate.getTime()) <= 90 * 24 * 60 * 60 * 1000;
          break;
        case '1y':
          matchesTimeRange = (now.getTime() - insightDate.getTime()) <= 365 * 24 * 60 * 60 * 1000;
          break;
      }
      
      return matchesCategory && matchesPriority && matchesTimeRange;
    });
  }, [insights, selectedTimeRange, selectedCategory, selectedPriority]);

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    if (!filteredInsights.length) return null;

    const totalInsights = filteredInsights.length;
    const avgConfidence = filteredInsights.reduce((sum, insight) => sum + insight.confidence, 0) / totalInsights;
    
    const insightsByCategory = filteredInsights.reduce((acc, insight) => {
      acc[insight.category] = (acc[insight.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const insightsByPriority = filteredInsights.reduce((acc, insight) => {
      acc[insight.priority] = (acc[insight.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sentimentDistribution = filteredInsights.reduce((acc, insight) => {
      acc[insight.sentiment] = (acc[insight.sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const highPriorityInsights = filteredInsights.filter(insight => insight.priority === 'high').length;
    const positiveSentimentInsights = filteredInsights.filter(insight => insight.sentiment === 'positive').length;

    return {
      totalInsights,
      avgConfidence: Math.round(avgConfidence),
      insightsByCategory: Object.entries(insightsByCategory).map(([category, count]) => ({ category, count })),
      insightsByPriority: Object.entries(insightsByPriority).map(([priority, count]) => ({ priority, count })),
      sentimentDistribution: Object.entries(sentimentDistribution).map(([sentiment, count]) => ({ sentiment, count })),
      highPriorityInsights,
      positiveSentimentInsights,
      positiveSentimentPercentage: Math.round((positiveSentimentInsights / totalInsights) * 100)
    };
  }, [filteredInsights]);

  // Export analytics data
  const exportAnalytics = async (format: 'CSV' | 'JSON') => {
    if (!derivedMetrics) return;

    try {
      let content = '';
      let filename = '';
      let mimeType = '';

      if (format === 'CSV') {
        const headers = ['Metric', 'Value'];
        const rows = [
          ['Total Insights', derivedMetrics.totalInsights],
          ['Average Confidence', `${derivedMetrics.avgConfidence}%`],
          ['High Priority Insights', derivedMetrics.highPriorityInsights],
          ['Positive Sentiment', `${derivedMetrics.positiveSentimentPercentage}%`]
        ];

        content = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        filename = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify(derivedMetrics, null, 2);
        filename = `analytics-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `${format} file downloaded successfully`,
      });

    } catch (error) {
      console.error('❌ Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export analytics data",
        variant: "destructive"
      });
    }
  };

  // Utility functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      case 'neutral':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'finance':
        return <TrendingUp className="h-4 w-4" />;
      case 'marketing':
        return <Target className="h-4 w-4" />;
      case 'operations':
        return <Activity className="h-4 w-4" />;
      case 'customer':
        return <Users className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
              <p className="mt-2 text-lg text-gray-600">
                AI-powered insights and performance analytics for your business intelligence.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportAnalytics('CSV')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => exportAnalytics('JSON')}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <Card className="bg-white shadow-sm border-0 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
                <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Priority</label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={fetchAnalyticsData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Brain className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {derivedMetrics?.totalInsights || 0}
                  </div>
                  <div className="text-sm text-gray-500">AI-generated insights</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Target className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {derivedMetrics?.avgConfidence || 0}%
                  </div>
                  <div className="text-sm text-gray-500">Insight accuracy</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">High Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {derivedMetrics?.highPriorityInsights || 0}
                  </div>
                  <div className="text-sm text-gray-500">Critical insights</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Positive Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {derivedMetrics?.positiveSentimentPercentage || 0}%
                  </div>
                  <div className="text-sm text-gray-500">Favorable insights</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Insights by Category */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Insights by Category
              </CardTitle>
              <CardDescription>
                Distribution of insights across different business areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {derivedMetrics?.insightsByCategory && derivedMetrics.insightsByCategory.length > 0 ? (
                <div className="space-y-3">
                  {derivedMetrics.insightsByCategory.map((item) => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(item.category)}
                        <span className="font-medium text-gray-900 capitalize">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(item.count / derivedMetrics.totalInsights) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights by Priority */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Insights by Priority
              </CardTitle>
              <CardDescription>
                Distribution of insights by priority level
              </CardDescription>
            </CardHeader>
            <CardContent>
              {derivedMetrics?.insightsByPriority && derivedMetrics.insightsByPriority.length > 0 ? (
                <div className="space-y-3">
                  {derivedMetrics.insightsByPriority.map((item) => (
                    <div key={item.priority} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(item.count / derivedMetrics.totalInsights) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No priority data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sentiment Analysis */}
        <Card className="bg-white shadow-sm border-0 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Sentiment Analysis
            </CardTitle>
            <CardDescription>
              Emotional tone and sentiment distribution of your insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            {derivedMetrics?.sentimentDistribution && derivedMetrics.sentimentDistribution.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {derivedMetrics.sentimentDistribution.map((item) => (
                  <div key={item.sentiment} className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {Math.round((item.count / derivedMetrics.totalInsights) * 100)}%
                    </div>
                    <Badge className={getSentimentColor(item.sentiment)}>
                      {item.sentiment.charAt(0).toUpperCase() + item.sentiment.slice(1)}
                    </Badge>
                    <div className="text-sm text-gray-500 mt-1">
                      {item.count} insights
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No sentiment data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Insights */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader>
            <CardTitle>Recent Insights</CardTitle>
            <CardDescription>
              Latest AI-generated insights and their performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredInsights.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No insights found</h3>
                <p className="text-gray-500">
                  {insights.length === 0 
                    ? 'Upload some data to generate your first AI insights.' 
                    : 'Try adjusting your filters to see more insights.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInsights.slice(0, 10).map((insight) => (
                  <div
                    key={insight.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{insight.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(insight.priority)}>
                          {insight.priority}
                        </Badge>
                        <Badge className={getSentimentColor(insight.sentiment)}>
                          {insight.sentiment}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {insight.confidence}% confidence
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(insight.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Brain className="h-4 w-4" />
                        {insight.category}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;