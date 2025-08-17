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
  Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function AIInsightsRealTime() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("high");

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
      .channel('insights-realtime')
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
          setInsights(prev => [payload.new, ...prev]);
          toast({
            title: "New Insight Generated!",
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
            insight.id === payload.new.id ? payload.new : insight
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

  // Filter insights based on search and filters
  const filteredInsights = insights.filter(insight => {
    const matchesSearch = search === "" || 
      insight.title.toLowerCase().includes(search.toLowerCase()) ||
      insight.projected_impact?.toLowerCase().includes(search.toLowerCase());
    
    const matchesPriority = filterPriority === "all" || insight.priority === filterPriority;
    const matchesCategory = filterCategory === "all" || insight.category === filterCategory;
    
    return matchesSearch && matchesPriority && matchesCategory;
  });

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-500 bg-green-50 border-green-200';
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200';
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

  // Get category badge color
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'business_opportunity':
        return <Badge variant="default" className="bg-green-100 text-green-800">Business Opportunity</Badge>;
      case 'risk_alert':
        return <Badge variant="default" className="bg-red-100 text-red-800">Risk Alert</Badge>;
      case 'trend_analysis':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Trend Analysis</Badge>;
      case 'operational_insight':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Operational</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  // Calculate statistics
  const stats = {
    totalInsights: insights.length,
    highPriorityCount: insights.filter(i => i.priority === 'high').length,
    avgConfidence: insights.length > 0 
      ? insights.reduce((acc, i) => acc + (i.confidence || 0), 0) / insights.length 
      : 0,
    bookmarkedCount: 0 // Placeholder for future bookmark feature
  };

  const categories = ["all", "business_opportunity", "risk_alert", "trend_analysis", "operational_insight"];
  const priorities = ["all", "high", "medium", "low"];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Insights</h1>
            <p className="text-lg text-gray-600">
              Discover actionable insights from your uploaded data
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <Button variant="outline" asChild>
              <Link to="/upload">
                <Plus className="h-4 w-4 mr-2" />
                Upload Data
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Insights</p>
                  <p className="text-2xl font-bold">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalInsights}
                  </p>
                </div>
                <Brain className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.highPriorityCount}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Confidence</p>
                  <p className="text-2xl font-bold">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${(stats.avgConfidence * 100).toFixed(0)}%`}
                  </p>
                </div>
                <Target className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bookmarked</p>
                  <p className="text-2xl font-bold">
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.bookmarkedCount}
                  </p>
                </div>
                <Bookmark className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search insights, tags, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
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
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              {priorities.map(priority => (
                <option key={priority} value={priority}>
                  {priority === "all" ? "All Priorities" : `${priority.charAt(0).toUpperCase()}${priority.slice(1)} Priority`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority Tabs */}
        <div className="flex space-x-4 mb-6">
          {["high", "medium", "low"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Priority
            </button>
          ))}
        </div>

        {/* Insights List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading insights...</span>
          </div>
        ) : filteredInsights.filter(i => i.priority === activeTab).length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="text-center py-12">
              <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No {activeTab} priority insights yet</h3>
              <p className="text-gray-600 mb-4">
                {search || filterPriority !== "all" || filterCategory !== "all"
                  ? "Try adjusting your search or filters."
                  : "Upload some data to generate AI insights!"}
              </p>
              <Button variant="outline" asChild>
                <Link to="/upload">Upload Data</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredInsights
              .filter(i => i.priority === activeTab)
              .map((insight) => (
                <Card key={insight.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold mb-2">{insight.title}</h2>
                        <div className="flex items-center space-x-2 mb-3">
                          <div className={`p-2 rounded-full ${getPriorityColor(insight.priority)}`}>
                            {getPriorityIcon(insight.priority)}
                          </div>
                          {getCategoryBadge(insight.category)}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-4">
                      Confidence: {(insight.confidence * 100).toFixed(0)}%
                    </p>

                    {insight.findings && insight.findings.length > 0 && (
                      <div className="mb-4">
                        <h3 className="font-medium text-sm mb-2 flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2 text-blue-600" />
                          Key Findings
                        </h3>
                        <ul className="list-disc ml-5 text-sm space-y-1">
                          {insight.findings.map((finding: string, i: number) => (
                            <li key={i} className="text-gray-600">{finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {insight.recommendations && insight.recommendations.length > 0 && (
                      <div className="mb-4">
                        <h3 className="font-medium text-sm mb-2 flex items-center">
                          <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                          Recommendations
                        </h3>
                        <ul className="list-disc ml-5 text-sm space-y-1">
                          {insight.recommendations.map((rec: string, i: number) => (
                            <li key={i} className="text-gray-600">{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {insight.projected_impact && (
                      <div className="mt-4 pt-4 border-t">
                        <h3 className="font-medium text-sm mb-2 flex items-center">
                          <Target className="h-4 w-4 mr-2 text-purple-600" />
                          Projected Impact
                        </h3>
                        <p className="text-sm italic text-gray-600">
                          {insight.projected_impact}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-xs text-gray-500">
                        {new Date(insight.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Share className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Bookmark className="h-3 w-3" />
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
          <Card className="shadow-sm">
            <CardContent className="text-center py-12">
              <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No insights yet</h3>
              <p className="text-gray-600 mb-4">
                Upload some data to get started with AI insights.
              </p>
              <Button variant="outline" asChild>
                <Link to="/upload">Upload Data</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}