import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { 
  Brain, 
  TrendingUp, 
  AlertCircle, 
  Download, 
  Filter,
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
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useRealtimeInsights } from "@/hooks/useRealtime";

const AIInsights = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("high");
  const [filteredInsights, setFilteredInsights] = useState<any[]>([]);
  
  const { toast } = useToast();
  const { data: insights, loading } = useRealtimeInsights();

  // Filter insights based on search and filters
  useEffect(() => {
    if (!insights) return;

    const filtered = insights.filter(insight => {
      const matchesSearch = searchTerm === "" || 
        insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insight.projected_impact?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = filterPriority === "all" || insight.priority === filterPriority;
      const matchesCategory = filterCategory === "all" || insight.category === filterCategory;
      
      return matchesSearch && matchesPriority && matchesCategory;
    });

    setFilteredInsights(filtered);
  }, [insights, searchTerm, filterPriority, filterCategory]);

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

  const categories = ["all", "business_opportunity", "risk_alert", "trend_analysis", "operational_insight"];
  const priorities = ["all", "high", "medium", "low"];
  
  // Calculate statistics
  const stats = insights ? {
    totalInsights: insights.length,
    highPriorityCount: insights.filter(i => i.priority === 'High').length,
    avgConfidence: insights.reduce((acc, i) => acc + (i.confidence_score || 0), 0) / insights.length || 0,
    bookmarkedCount: 0
  } : {
    totalInsights: 0,
    highPriorityCount: 0,
    avgConfidence: 0,
    bookmarkedCount: 0
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground">Discover actionable insights from your data</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" asChild>
            <Link to="/upload">
              <Plus className="h-4 w-4 mr-2" />
              Upload Data
            </Link>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search insights..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
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
            className="px-3 py-2 border border-border rounded-lg bg-background text-sm"
          >
            {priorities.map(priority => (
              <option key={priority} value={priority}>
                {priority === "all" ? "All Priorities" : `${priority.charAt(0).toUpperCase()}${priority.slice(1)} Priority`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Insights</p>
                <p className="text-2xl font-bold">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.totalInsights}
                </p>
              </div>
              <Brain className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.highPriorityCount}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${(stats.avgConfidence * 100).toFixed(0)}%`}
                </p>
              </div>
              <Target className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bookmarked</p>
                <p className="text-2xl font-bold">
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.bookmarkedCount}
                </p>
              </div>
              <Bookmark className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading insights...</span>
        </div>
      ) : filteredInsights.filter(i => i.priority === activeTab.charAt(0).toUpperCase() + activeTab.slice(1)).length === 0 ? (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No {activeTab} priority insights yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInsights
            .filter(i => i.priority === activeTab.charAt(0).toUpperCase() + activeTab.slice(1))
            .map((insight) => (
              <Card key={insight.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg font-semibold">{insight.title}</h2>
                    <div className={`p-2 rounded-full ${getPriorityColor(insight.priority)}`}>
                      {getPriorityIcon(insight.priority)}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-3">
                    Confidence: {(insight.confidence_score * 100).toFixed(0)}% | {insight.summary}
                  </p>

                  {insight.findings && insight.findings.length > 0 && (
                    <div className="mb-3">
                      <h3 className="font-medium text-sm mb-2">Key Findings</h3>
                      <ul className="list-disc ml-5 text-sm space-y-1">
                        {insight.findings.map((finding: string, i: number) => (
                          <li key={i} className="text-gray-600">{finding}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insight.recommendations && insight.recommendations.length > 0 && (
                    <div className="mb-3">
                      <h3 className="font-medium text-sm mb-2">Recommendations</h3>
                      <ul className="list-disc ml-5 text-sm space-y-1">
                        {insight.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="text-gray-600">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insight.projected_impact && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm italic text-gray-600">
                        {insight.projected_impact}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <span className="text-xs text-gray-500">
                      {new Date(insight.created_at).toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {insight.insight_type || insight.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {!loading && filteredInsights.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No insights found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterPriority !== "all" || filterCategory !== "all"
                ? "Try adjusting your search or filters."
                : "Upload some data to get started with AI insights."}
            </p>
            <Button variant="outline" asChild>
              <Link to="/upload">Upload Data</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIInsights;