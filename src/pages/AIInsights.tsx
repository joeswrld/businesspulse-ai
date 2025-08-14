import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Bookmark, 
  TrendingUp, 
  Target,
  Calendar,
  Tag,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Download,
  Share2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

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
  bookmarked: boolean;
  source: string | null;
  created_at: string;
  updated_at: string;
}

const AIInsights: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');

  // Fetch insights data
  const fetchInsightsData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching insights data for user:', user.id);
      
      const { data: insightsData, error: insightsError } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (insightsError) throw insightsError;

      console.log('📊 Insights data fetched:', insightsData?.length || 0);
      setInsights(insightsData || []);
      
    } catch (error) {
      console.error('❌ Error fetching insights data:', error);
      toast({
        title: "Error",
        description: "Failed to load insights",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time insights subscriptions for user:', user.id);

    const insightsChannel = supabase
      .channel('insights-realtime')
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

    return () => {
      console.log('🔄 Cleaning up real-time insights subscriptions');
      supabase.removeChannel(insightsChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchInsightsData();
  }, [fetchInsightsData]);

  // Filter insights based on selections
  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      const matchesSearch = searchTerm === '' || 
        insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insight.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insight.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || insight.category === selectedCategory;
      const matchesPriority = selectedPriority === 'all' || insight.priority === selectedPriority;
      
      // Filter by time range
      const insightDate = new Date(insight.created_at);
      const now = new Date();
      let matchesTimeRange = true;
      
      switch (selectedTimeRange) {
        case 'today':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          matchesTimeRange = insightDate >= today;
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesTimeRange = insightDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          matchesTimeRange = insightDate >= monthAgo;
          break;
        case 'quarter':
          const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          matchesTimeRange = insightDate >= quarterAgo;
          break;
      }
      
      return matchesSearch && matchesCategory && matchesPriority && matchesTimeRange;
    });
  }, [insights, searchTerm, selectedCategory, selectedPriority, selectedTimeRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalInsights = insights.length;
    const highPriority = insights.filter(i => i.priority === 'high').length;
    const avgConfidence = insights.length > 0 
      ? Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length)
      : 0;
    const bookmarked = insights.filter(i => i.bookmarked).length;

    return { totalInsights, highPriority, avgConfidence, bookmarked };
  }, [insights]);

  // Toggle bookmark
  const toggleBookmark = async (insightId: string, currentBookmarked: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_insights')
        .update({ bookmarked: !currentBookmarked })
        .eq('id', insightId);

      if (error) throw error;

      toast({
        title: currentBookmarked ? "Bookmark Removed" : "Bookmark Added",
        description: currentBookmarked 
          ? "Insight removed from bookmarks" 
          : "Insight added to bookmarks",
      });

    } catch (error: any) {
      console.error('❌ Error toggling bookmark:', error);
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive"
      });
    }
  };

  // Export insights
  const exportInsights = async (format: 'CSV' | 'JSON') => {
    try {
      let content = '';
      let filename = '';
      let mimeType = '';

      if (format === 'CSV') {
        const headers = ['Title', 'Description', 'Category', 'Priority', 'Confidence', 'Key Findings', 'Recommendations', 'Projected Impact', 'Tags', 'Created At'];
        const rows = filteredInsights.map(insight => [
          `"${insight.title}"`,
          `"${insight.description}"`,
          `"${insight.category}"`,
          `"${insight.priority}"`,
          insight.confidence,
          `"${insight.key_findings.join('; ')}"`,
          `"${insight.recommendations.join('; ')}"`,
          `"${insight.projected_impact || ''}"`,
          `"${insight.tags.join(', ')}"`,
          `"${new Date(insight.created_at).toLocaleDateString()}"`
        ]);

        content = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        filename = `insights-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        content = JSON.stringify(filteredInsights, null, 2);
        filename = `insights-${new Date().toISOString().split('T')[0]}.json`;
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
        description: "Failed to export insights",
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

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'finance':
        return <TrendingUp className="h-4 w-4" />;
      case 'marketing':
        return <Target className="h-4 w-4" />;
      case 'operations':
        return <CheckCircle className="h-4 w-4" />;
      case 'customer':
        return <Eye className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
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
          <p className="mt-4 text-gray-600">Loading insights...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
              <p className="mt-2 text-lg text-gray-600">
                Discover intelligent business insights generated from your data.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportInsights('CSV')}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => exportInsights('JSON')}>
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
              <Button onClick={() => navigate('/data-upload')}>
                <Plus className="h-4 w-4 mr-2" />
                Generate New Insights
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Metrics Cards */}
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
                    {metrics.totalInsights}
                  </div>
                  <div className="text-sm text-gray-500">AI-generated insights</div>
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
                <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {metrics.highPriority}
                  </div>
                  <div className="text-sm text-gray-500">Critical insights</div>
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
                    {metrics.avgConfidence}%
                  </div>
                  <div className="text-sm text-gray-500">Insight accuracy</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Bookmarked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Bookmark className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {metrics.bookmarked}
                  </div>
                  <div className="text-sm text-gray-500">Saved insights</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-white shadow-sm border-0 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search insights by title, description, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={fetchInsightsData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Insights List */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader>
            <CardTitle>Business Intelligence Insights</CardTitle>
            <CardDescription>
              {filteredInsights.length} insight{filteredInsights.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredInsights.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No insights found</h3>
                <p className="text-gray-500">
                  {insights.length === 0 
                    ? 'Upload some data to generate your first AI insights.' 
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
                {insights.length === 0 && (
                  <Button 
                    className="mt-4"
                    onClick={() => navigate('/data-upload')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Data
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={getPriorityColor(insight.priority)}>
                            {insight.priority.toUpperCase()}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            {getCategoryIcon(insight.category)}
                            <span className="capitalize">{insight.category}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Target className="h-3 w-3" />
                            {insight.confidence}% confidence
                          </div>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {insight.title}
                        </h3>
                        <p className="text-gray-600 mb-3">
                          {insight.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant={insight.bookmarked ? "default" : "outline"}
                          onClick={() => toggleBookmark(insight.id, insight.bookmarked)}
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/ai-insights')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>

                    {/* Key Findings */}
                    {insight.key_findings && insight.key_findings.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Key Findings</h4>
                        <ul className="space-y-1">
                          {insight.key_findings.map((finding, index) => (
                            <li key={index} className="flex items-start text-sm text-gray-600">
                              <span className="text-blue-500 mr-2 mt-1">•</span>
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {insight.recommendations && insight.recommendations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                        <ul className="space-y-1">
                          {insight.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start text-sm text-gray-600">
                              <span className="text-green-500 mr-2 mt-1">→</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Projected Impact */}
                    {insight.projected_impact && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-1">Projected Impact</h4>
                        <p className="text-sm text-blue-800">{insight.projected_impact}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatTimeAgo(insight.created_at)}
                        </div>
                        {insight.source && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            {insight.source}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {insight.tags && insight.tags.length > 0 && (
                          <div className="flex gap-1">
                            {insight.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {insight.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{insight.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
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

export default AIInsights;