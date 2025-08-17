import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Brain, 
  TrendingUp, 
  AlertCircle, 
  Search,
  Star,
  Clock,
  Target,
  BarChart3,
  FileText,
  Share,
  Bookmark,
  Plus,
  Loader2,
  CheckCircle,
  Filter,
  Calendar,
  Eye,
  Download,
  RefreshCw,
  Zap,
  Lightbulb,
  TrendingDown,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Insight {
  id: string;
  title: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  findings: string[];
  recommendations: string[];
  projected_impact: string;
  created_at: string;
  source_id?: string;
  user_id: string;
}

export default function AIInsights() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("high");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch insights on component mount
  useEffect(() => {
    if (user) {
      fetchInsights();
    }
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('ai-insights-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_insights',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New insight received:', payload);
          setInsights(prev => [payload.new as Insight, ...prev]);
          toast({
            title: "New Insight Generated! 🎉",
            description: payload.new.title,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_insights',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setInsights(prev => prev.map(insight => 
            insight.id === payload.new.id ? payload.new as Insight : insight
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching insights:', error);
        toast({
          title: "Error",
          description: "Failed to load insights",
          variant: "destructive"
        });
      } else {
        setInsights(data || []);
      }
    } catch (error) {
      console.error('Error in fetchInsights:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshInsights = async () => {
    setRefreshing(true);
    await fetchInsights();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Insights updated successfully",
    });
  };

  // Filter insights based on search and filters
  const filteredInsights = insights.filter(insight => {
    const matchesSearch = search === "" || 
      insight.title.toLowerCase().includes(search.toLowerCase()) ||
      insight.projected_impact?.toLowerCase().includes(search.toLowerCase()) ||
      insight.findings?.some(finding => 
        finding.toLowerCase().includes(search.toLowerCase())
      );
    
    const matchesPriority = filterPriority === "all" || insight.priority === filterPriority;
    const matchesCategory = filterCategory === "all" || insight.category === filterCategory;
    
    return matchesSearch && matchesPriority && matchesCategory;
  });

  // Get priority color and styling
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  // Get category badge with color
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'business_opportunity':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Business Opportunity</Badge>;
      case 'risk_alert':
        return <Badge variant="default" className="bg-red-100 text-red-800 border-red-200">Risk Alert</Badge>;
      case 'trend_analysis':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Trend Analysis</Badge>;
      case 'operational_insight':
        return <Badge variant="default" className="bg-purple-100 text-purple-800 border-purple-200">Operational</Badge>;
      default:
        return <Badge variant="outline">{category?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Badge>;
    }
  };

  // Calculate statistics
  const stats = {
    totalInsights: insights.length,
    highPriorityCount: insights.filter(i => i.priority === 'high').length,
    mediumPriorityCount: insights.filter(i => i.priority === 'medium').length,
    lowPriorityCount: insights.filter(i => i.priority === 'low').length,
    avgConfidence: insights.length > 0 
      ? insights.reduce((acc, i) => acc + (i.confidence || 0), 0) / insights.length 
      : 0,
    recentInsights: insights.filter(i => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(i.created_at) > oneWeekAgo;
    }).length
  };

  const categories = ["all", "business_opportunity", "risk_alert", "trend_analysis", "operational_insight"];
  const priorities = ["all", "high", "medium", "low"];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
              <Brain className="h-10 w-10 mr-3 text-blue-600" />
              AI Insights
            </h1>
            <p className="text-lg text-gray-600">
              Discover actionable insights from your uploaded data
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <Button 
              variant="outline" 
              onClick={refreshInsights}
              disabled={refreshing}
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="default" asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/upload">
                <Plus className="h-4 w-4 mr-2" />
                Upload Data
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Insights</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.totalInsights}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Brain className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Priority</p>
                  <p className="text-3xl font-bold text-red-600">
                    {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.highPriorityCount}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                  <p className="text-3xl font-bold text-green-600">
                    {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : `${(stats.avgConfidence * 100).toFixed(0)}%`}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Target className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : stats.recentInsights}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Activity className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="shadow-lg border-0 bg-white mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search insights, findings, or recommendations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === "all" ? "All Categories" : category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>
                      {priority === "all" ? "All Priorities" : `${priority.charAt(0).toUpperCase()}${priority.slice(1)} Priority`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          {["high", "medium", "low"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-lg transform scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-50 shadow-md hover:shadow-lg"
              }`}
            >
              <div className="flex items-center space-x-2">
                {getPriorityIcon(tab)}
                <span>{tab.charAt(0).toUpperCase() + tab.slice(1)} Priority</span>
                <Badge variant="secondary" className="ml-2">
                  {filteredInsights.filter(i => i.priority === tab).length}
                </Badge>
              </div>
            </button>
          ))}
        </div>

        {/* Insights List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-lg text-gray-600">Loading your AI insights...</p>
            </div>
          </div>
        ) : filteredInsights.filter(i => i.priority === activeTab).length === 0 ? (
          <Card className="shadow-lg border-0 bg-white">
            <CardContent className="text-center py-16">
              <Brain className="h-16 w-16 mx-auto text-gray-400 mb-6" />
              <h3 className="text-xl font-semibold mb-2">No {activeTab} priority insights yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {search || filterPriority !== "all" || filterCategory !== "all"
                  ? "Try adjusting your search or filters to see more insights."
                  : "Upload some data to generate your first AI insights!"}
              </p>
              <Button variant="outline" asChild className="mr-3">
                <Link to="/upload">Upload Data</Link>
              </Button>
              <Button variant="ghost" onClick={() => {
                setSearch("");
                setFilterPriority("all");
                setFilterCategory("all");
              }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInsights
              .filter(i => i.priority === activeTab)
              .map((insight) => (
                <Card key={insight.id} className="shadow-lg border-0 bg-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold mb-3 text-gray-900">{insight.title}</h2>
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`p-2 rounded-full border ${getPriorityColor(insight.priority)}`}>
                            {getPriorityIcon(insight.priority)}
                          </div>
                          {getCategoryBadge(insight.category)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">
                          <Target className="h-4 w-4 inline mr-1" />
                          {(insight.confidence * 100).toFixed(0)}% confidence
                        </span>
                        <span className="text-sm text-gray-500">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {formatDate(insight.created_at)}
                        </span>
                      </div>
                    </div>

                    {insight.findings && insight.findings.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-sm mb-3 flex items-center text-blue-600">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Key Findings
                        </h3>
                        <ul className="space-y-2">
                          {insight.findings.map((finding: string, i: number) => (
                            <li key={i} className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {insight.recommendations && insight.recommendations.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-sm mb-3 flex items-center text-green-600">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Recommendations
                        </h3>
                        <ul className="space-y-2">
                          {insight.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {insight.projected_impact && (
                      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                        <h3 className="font-semibold text-sm mb-2 flex items-center text-purple-600">
                          <Zap className="h-4 w-4 mr-2" />
                          Projected Impact
                        </h3>
                        <p className="text-sm text-gray-700 italic">
                          {insight.projected_impact}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                          <Share className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                          <Bookmark className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && insights.length === 0 && (
          <Card className="shadow-lg border-0 bg-white">
            <CardContent className="text-center py-16">
              <Brain className="h-16 w-16 mx-auto text-gray-400 mb-6" />
              <h3 className="text-xl font-semibold mb-2">No insights yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Upload some data to get started with AI insights. Our AI will analyze your data and provide actionable recommendations.
              </p>
              <Button variant="default" asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to="/upload">Upload Data</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}