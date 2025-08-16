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
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { AIService, AIInsight } from "@/lib/ai-service";
import { useRealtimeInsights } from "@/hooks/useRealtime";

const AIInsights = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [filteredInsights, setFilteredInsights] = useState<AIInsight[]>([]);
  
  const { toast } = useToast();
  const { data: insights, loading } = useRealtimeInsights();
  // Filter insights based on search and filters
  useEffect(() => {
    if (!insights) return;

    const filtered = insights.filter(insight => {
      const matchesSearch = searchTerm === "" || 
        insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insight.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insight.content.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesPriority = filterPriority === "all" || insight.priority === filterPriority;
      const matchesCategory = filterCategory === "all" || insight.industry_category === filterCategory;
      
      return matchesSearch && matchesPriority && matchesCategory;
    });

    setFilteredInsights(filtered);
  }, [insights, searchTerm, filterPriority, filterCategory]);

  const generateNewInsights = async () => {
    setIsGenerating(true);
    try {
      const result = await AIService.generateInsights();
      
      if (result.success) {
        toast({
          title: "Success!",
          description: `Generated ${result.count} new insights from your data.`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate insights",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBookmark = async (insightId: string, currentState: boolean) => {
    const success = await AIService.toggleBookmark(insightId, !currentState);
    if (success) {
      toast({
        title: currentState ? "Bookmark removed" : "Insight bookmarked",
        description: currentState ? "Removed from bookmarks" : "Added to bookmarks",
      });
    }
  };

  const handleCreateActionPlan = async (insight: AIInsight) => {
    const success = await AIService.createActionPlan(insight.id, insight);
    if (success) {
      toast({
        title: "Action Plan Created",
        description: "A new goal has been created based on this insight.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to create action plan",
        variant: "destructive",
      });
    }
  };

  const exportInsights = () => {
    const csv = AIService.exportToCSV(filteredInsights);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `insights-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast({
      title: "Export Complete",
      description: "Insights have been exported to CSV",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const categories = ["all", "Revenue", "Customer Experience", "Operations", "Growth", "Marketing"];
  const priorities = ["all", "high", "medium", "low"];
  
  // Calculate statistics
  const stats = insights ? AIService.getInsightsStats(insights) : {
    totalInsights: 0,
    highPriorityCount: 0,
    avgConfidence: 0,
    bookmarkedCount: 0
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground">
            Real-time business intelligence powered by advanced AI analysis.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={generateNewInsights} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Brain className="h-4 w-4 mr-2 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate New Insights
              </>
            )}
          </Button>
          <Button variant="hero" onClick={exportInsights}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search insights, tags, or keywords..."
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
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
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
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats.avgConfidence}%`}
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

      {/* Insights List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading insights...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredInsights.map((insight) => {
            const isBookmarked = typeof insight.content === 'object' && 
              'bookmarked' in insight.content && 
              Boolean(insight.content.bookmarked);
            
            return (
              <Card key={insight.id} className="hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getPriorityColor(insight.priority || 'medium')}>
                          {insight.priority || 'medium'} priority
                        </Badge>
                        <Badge variant="outline">{insight.industry_category || 'General'}</Badge>
                        {insight.is_actionable && (
                          <Badge variant="secondary">Actionable</Badge>
                        )}
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Target className="h-3 w-3 mr-1" />
                          {insight.confidence_score || 0}% confidence
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{insight.title}</h3>
                      <p className="text-muted-foreground mb-4">{insight.summary}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleBookmark(insight.id, isBookmarked)}
                      >
                        <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Key Findings */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2 text-primary" />
                        Key Findings
                      </h4>
                      <ul className="space-y-2">
                        {insight.content.key_findings?.map((finding, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start">
                            <span className="w-1 h-1 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2 text-success" />
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {insight.content.recommendations?.map((rec, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start">
                            <span className="w-1 h-1 bg-success rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Impact & Metadata */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2 text-warning" />
                        Projected Impact
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">{insight.content.projected_impact}</p>
                      
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-2" />
                          {new Date(insight.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <FileText className="h-3 w-3 mr-2" />
                          AI Generated
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {insight.content.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                        <Button size="sm" onClick={() => handleCreateActionPlan(insight)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Action Plan
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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