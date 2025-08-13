import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Bookmark
} from "lucide-react";
import { Link } from "react-router-dom";

const AIInsights = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);

  const [insights] = useState([
    {
      id: 1,
      title: "Customer Retention Improvement Opportunity",
      summary: "Analysis of customer behavior patterns shows 23% of customers are at risk of churning within the next 30 days. Key indicators include decreased engagement and support ticket frequency.",
      content: {
        keyFindings: [
          "Customer engagement dropped 45% in the last quarter",
          "Support ticket resolution time increased by 2.3 days",
          "Product usage frequency decreased by 31%"
        ],
        recommendations: [
          "Implement proactive customer outreach program",
          "Reduce support response time by 50%",
          "Launch re-engagement email campaign"
        ],
        projectedImpact: "Potential 15% increase in customer retention rate"
      },
      priority: "high",
      category: "Customer Experience",
      confidence: 94,
      createdAt: "2 hours ago",
      dataSource: "Customer Support Data",
      tags: ["retention", "churn", "customer-success"],
      isBookmarked: false,
      industrySpecific: true
    },
    {
      id: 2,
      title: "Revenue Growth Through Premium Upselling",
      summary: "Current customers show high potential for premium feature adoption based on usage patterns and support requests for advanced functionality.",
      content: {
        keyFindings: [
          "67% of users request features available in premium tier",
          "Average session time increased 40% for engaged users",
          "Premium conversion rate opportunity of 28%"
        ],
        recommendations: [
          "Create targeted upsell campaign for high-usage customers",
          "Offer limited-time premium trial",
          "Implement in-app premium feature showcases"
        ],
        projectedImpact: "Potential $47,000 additional monthly recurring revenue"
      },
      priority: "high",
      category: "Revenue",
      confidence: 89,
      createdAt: "5 hours ago",
      dataSource: "Product Usage Analytics",
      tags: ["revenue", "upsell", "premium"],
      isBookmarked: true,
      industrySpecific: false
    },
    {
      id: 3,
      title: "Operational Efficiency Enhancement",
      summary: "Workflow analysis reveals significant automation opportunities that could reduce manual work by 60% and improve team productivity.",
      content: {
        keyFindings: [
          "Manual data entry consumes 12 hours per week per employee",
          "Repetitive tasks account for 35% of working time",
          "Error rate in manual processes is 8.2%"
        ],
        recommendations: [
          "Implement automated data sync between systems",
          "Create workflow templates for common processes",
          "Deploy intelligent task routing system"
        ],
        projectedImpact: "Save 25 hours per week across team, reduce errors by 75%"
      },
      priority: "medium",
      category: "Operations",
      confidence: 82,
      createdAt: "1 day ago",
      dataSource: "Internal Process Data",
      tags: ["automation", "efficiency", "productivity"],
      isBookmarked: false,
      industrySpecific: true
    },
    {
      id: 4,
      title: "Market Expansion Opportunity",
      summary: "Demographic analysis suggests untapped market segments with high conversion potential based on current customer profile patterns.",
      content: {
        keyFindings: [
          "Similar businesses in adjacent markets show 3x growth potential",
          "Current customer demographics suggest broader appeal",
          "Competitive landscape analysis shows low saturation"
        ],
        recommendations: [
          "Launch targeted marketing campaign in identified regions",
          "Adapt product messaging for new segments",
          "Test pilot program in highest-potential market"
        ],
        projectedImpact: "Potential 40% increase in total addressable market"
      },
      priority: "medium",
      category: "Growth",
      confidence: 76,
      createdAt: "2 days ago",
      dataSource: "Market Research Data",
      tags: ["expansion", "market", "growth"],
      isBookmarked: false,
      industrySpecific: false
    }
  ]);

  const filteredInsights = insights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insight.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insight.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPriority = filterPriority === "all" || insight.priority === filterPriority;
    const matchesCategory = filterCategory === "all" || insight.category === filterCategory;
    
    return matchesSearch && matchesPriority && matchesCategory;
  });

  const generateNewInsights = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
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
          <Button variant="hero">
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
                <p className="text-2xl font-bold">{insights.length}</p>
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
                <p className="text-2xl font-bold">{insights.filter(i => i.priority === "high").length}</p>
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
                <p className="text-2xl font-bold">{Math.round(insights.reduce((acc, i) => acc + i.confidence, 0) / insights.length)}%</p>
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
                <p className="text-2xl font-bold">{insights.filter(i => i.isBookmarked).length}</p>
              </div>
              <Bookmark className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights List */}
      <div className="space-y-6">
        {filteredInsights.map((insight) => (
          <Card key={insight.id} className="hover:shadow-medium transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getPriorityColor(insight.priority)}>
                      {insight.priority} priority
                    </Badge>
                    <Badge variant="outline">{insight.category}</Badge>
                    {insight.industrySpecific && (
                      <Badge variant="secondary">Industry Specific</Badge>
                    )}
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Target className="h-3 w-3 mr-1" />
                      {insight.confidence}% confidence
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{insight.title}</h3>
                  <p className="text-muted-foreground mb-4">{insight.summary}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Bookmark className="h-4 w-4" />
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
                    {insight.content.keyFindings.map((finding, index) => (
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
                    {insight.content.recommendations.map((rec, index) => (
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
                  <p className="text-sm text-muted-foreground mb-4">{insight.content.projectedImpact}</p>
                  
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-2" />
                      {insight.createdAt}
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-3 w-3 mr-2" />
                      {insight.dataSource}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {insight.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button size="sm">
                      Create Action Plan
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInsights.length === 0 && (
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