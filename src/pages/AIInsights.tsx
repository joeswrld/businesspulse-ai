import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Lightbulb, 
  Bookmark, 
  BookmarkPlus, 
  Search, 
  Filter, 
  Download, 
  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Target,
  BarChart3,
  Calendar,
  Tag
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Insight {
  id: string;
  user_id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  confidence: number;
  summary: string;
  key_findings: string[];
  recommendations: string[];
  projected_impact: string;
  source: string;
  tags: string[];
  created_at: string;
}

interface Bookmark {
  id: string;
  user_id: string;
  insight_id: string;
  created_at: string;
}

interface Metrics {
  totalInsights: number;
  highPriority: number;
  avgConfidence: number;
  bookmarked: number;
}

const AIInsights: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [insights, setInsights] = useState<Insight[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [metrics, setMetrics] = useState<Metrics>({
    totalInsights: 0,
    highPriority: 0,
    avgConfidence: 0,
    bookmarked: 0
  });

  // Fetch insights and bookmarks
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (insightsError) throw insightsError;

      // Fetch bookmarks
      const { data: bookmarksData, error: bookmarksError } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user.id);

      if (bookmarksError) throw bookmarksError;

      setInsights(insightsData || []);
      setBookmarks(bookmarksData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load insights and bookmarks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Calculate metrics
  const calculateMetrics = useCallback((insightsData: Insight[], bookmarksData: Bookmark[]) => {
    const totalInsights = insightsData.length;
    const highPriority = insightsData.filter(insight => insight.priority === 'high').length;
    const avgConfidence = insightsData.length > 0 
      ? Math.round(insightsData.reduce((sum, insight) => sum + (insight.confidence || 0), 0) / insightsData.length * 10) / 10
      : 0;
    const bookmarked = bookmarksData.length;

    setMetrics({
      totalInsights,
      highPriority,
      avgConfidence,
      bookmarked
    });
  }, []);

  // Update metrics when data changes
  useEffect(() => {
    calculateMetrics(insights, bookmarks);
  }, [insights, bookmarks, calculateMetrics]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to insights changes
    const insightsChannel = supabase
      .channel('insights-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'insights',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
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

    // Subscribe to bookmarks changes
    const bookmarksChannel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBookmarks(prev => [payload.new as Bookmark, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setBookmarks(prev => 
              prev.map(bookmark => 
                bookmark.id === payload.new.id ? payload.new as Bookmark : bookmark
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setBookmarks(prev => prev.filter(bookmark => bookmark.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(insightsChannel);
      supabase.removeChannel(bookmarksChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered insights
  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      const matchesSearch = searchTerm === '' || 
        insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insight.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insight.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || insight.category === selectedCategory;
      const matchesPriority = selectedPriority === 'all' || insight.priority === selectedPriority;
      
      return matchesSearch && matchesCategory && matchesPriority;
    });
  }, [insights, searchTerm, selectedCategory, selectedPriority]);

  // Get unique categories and priorities
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(insights.map(insight => insight.category))];
    return ['all', ...uniqueCategories.sort()];
  }, [insights]);

  const priorities = ['all', 'high', 'medium', 'low'];

  // Bookmark functions
  const toggleBookmark = async (insightId: string) => {
    if (!user) return;

    try {
      const existingBookmark = bookmarks.find(b => b.insight_id === insightId);
      
      if (existingBookmark) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existingBookmark.id);

        if (error) throw error;

        toast({
          title: "Bookmark removed",
          description: "Insight removed from bookmarks",
        });
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            insight_id: insightId
          });

        if (error) throw error;

        toast({
          title: "Bookmark added",
          description: "Insight added to bookmarks",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update bookmark",
        variant: "destructive"
      });
    }
  };

  const isBookmarked = (insightId: string) => {
    return bookmarks.some(bookmark => bookmark.insight_id === insightId);
  };

  // Export functions
  const exportToCSV = () => {
    const csvContent = [
      ['Title', 'Priority', 'Category', 'Confidence', 'Summary', 'Tags', 'Created At'].join(','),
      ...filteredInsights.map(insight => [
        `"${insight.title}"`,
        insight.priority,
        insight.category,
        insight.confidence,
        `"${insight.summary}"`,
        `"${insight.tags.join(', ')}"`,
        new Date(insight.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noteX-insights-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Insights exported to CSV",
    });
  };

  const exportToPDF = () => {
    // For now, just show a toast - PDF export would require a library like jsPDF
    toast({
      title: "PDF Export",
      description: "PDF export functionality coming soon",
    });
  };

  // Utility functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
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
          <p className="mt-4 text-gray-600">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
          <p className="mt-2 text-lg text-gray-600">
            Real-time business intelligence powered by advanced AI analysis.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Button className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Generate New Insights
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Lightbulb className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{metrics.totalInsights}</div>
                  <div className="text-sm text-gray-500">AI generated</div>
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
                  <div className="text-2xl font-bold text-gray-900">{metrics.highPriority}</div>
                  <div className="text-sm text-gray-500">Require attention</div>
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
                <BarChart3 className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{metrics.avgConfidence}%</div>
                  <div className="text-sm text-gray-500">AI accuracy</div>
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
                  <div className="text-2xl font-bold text-gray-900">{metrics.bookmarked}</div>
                  <div className="text-sm text-gray-500">Saved insights</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border-0 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search insights, tags, or categories..."
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

            {/* Priority Filter */}
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                {priorities.map(priority => (
                  <SelectItem key={priority} value={priority}>
                    {priority === 'all' ? 'All Priorities' : priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-6">
          {filteredInsights.length === 0 ? (
            <Card className="bg-white shadow-sm border-0">
              <CardContent className="text-center py-12">
                <Lightbulb className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {insights.length === 0 ? 'No insights yet' : 'No insights match your filters'}
                </h3>
                <p className="text-gray-500">
                  {insights.length === 0 
                    ? 'Upload some data to generate your first AI insights!' 
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredInsights.map((insight) => (
              <Card key={insight.id} className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={`${getPriorityColor(insight.priority)} border`}>
                          <div className="flex items-center gap-1">
                            {getPriorityIcon(insight.priority)}
                            <span className="capitalize">{insight.priority}</span>
                          </div>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {insight.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {insight.confidence}% confidence
                        </Badge>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{insight.title}</h3>
                      <p className="text-gray-600 mb-3">{insight.summary}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBookmark(insight.id)}
                      className={`ml-4 ${isBookmarked(insight.id) ? 'text-blue-600' : 'text-gray-400'}`}
                    >
                      {isBookmarked(insight.id) ? (
                        <Bookmark className="h-5 w-5 fill-current" />
                      ) : (
                        <BookmarkPlus className="h-5 w-5" />
                      )}
                    </Button>
                  </div>

                  {/* Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                    {/* Key Findings */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <Target className="h-4 w-4 mr-2 text-blue-600" />
                        Key Findings
                      </h4>
                      <ul className="space-y-1">
                        {insight.key_findings?.map((finding, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="text-blue-500 mr-2 mt-1">•</span>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                        Recommendations
                      </h4>
                      <ul className="space-y-1">
                        {insight.recommendations?.map((recommendation, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start">
                            <span className="text-green-500 mr-2 mt-1">•</span>
                            {recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Projected Impact */}
                  {insight.projected_impact && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-1">Projected Impact</h4>
                      <p className="text-sm text-blue-800">{insight.projected_impact}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {insight.tags && insight.tags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                        <Tag className="h-4 w-4 mr-2 text-gray-600" />
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {insight.tags.map((tag, index) => (
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
                      {formatTimeAgo(insight.created_at)}
                      {insight.source && (
                        <>
                          <span className="mx-2">•</span>
                          Source: {insight.source}
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button size="sm">
                        <Target className="h-4 w-4 mr-2" />
                        Create Action Plan
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

export default AIInsights;