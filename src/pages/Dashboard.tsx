import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  FileText, 
  Users, 
  DollarSign, 
  Brain, 
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Zap,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [metrics, setMetrics] = useState({
    totalInsights: 142,
    activeDataSources: 8,
    teamMembers: 3,
    monthlyGrowth: 24.5
  });

  const [recentInsights] = useState([
    {
      id: 1,
      title: "Customer Satisfaction Trend",
      summary: "Customer satisfaction has increased by 15% over the last quarter, with particularly strong performance in support response times.",
      priority: "high",
      category: "Customer Experience",
      createdAt: "2 hours ago",
      confidence: 92
    },
    {
      id: 2,
      title: "Revenue Opportunity Detected",
      summary: "Analysis shows potential 30% revenue increase by expanding premium features to existing customers.",
      priority: "high",
      category: "Revenue",
      createdAt: "4 hours ago",
      confidence: 87
    },
    {
      id: 3,
      title: "Operational Efficiency Improvement",
      summary: "Workflow optimization could reduce processing time by 40% based on current data patterns.",
      priority: "medium",
      category: "Operations",
      createdAt: "1 day ago",
      confidence: 78
    }
  ]);

  const [aiSuggestions] = useState([
    "Review customer feedback from last week for sentiment trends",
    "Analyze Q4 sales data for seasonal patterns",
    "Compare team productivity metrics with industry benchmarks"
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your business.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/upload">
              <Plus className="h-4 w-4 mr-2" />
              Add Data Source
            </Link>
          </Button>
          <Button variant="hero" asChild>
            <Link to="/insights">
              <Brain className="h-4 w-4 mr-2" />
              Generate Insights
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
            <Brain className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInsights}</div>
            <p className="text-xs text-muted-foreground">
              +12 from last week
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeDataSources}</div>
            <p className="text-xs text-muted-foreground">
              3 processed today
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.teamMembers}</div>
            <p className="text-xs text-muted-foreground">
              Pro plan limit: 5
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-medium transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics.monthlyGrowth}%</div>
            <p className="text-xs text-muted-foreground">
              vs last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Insights */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent AI Insights</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/insights">
                  View All
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentInsights.map((insight) => (
                <div key={insight.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={insight.priority === "high" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {insight.priority} priority
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {insight.category}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{insight.createdAt}</span>
                  </div>
                  <h4 className="font-semibold mb-2">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{insight.summary}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Zap className="h-3 w-3 mr-1" />
                      {insight.confidence}% confidence
                    </div>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestions & Quick Actions */}
        <div className="space-y-6">
          {/* AI Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Brain className="h-5 w-5 mr-2 text-primary" />
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiSuggestions.map((suggestion, index) => (
                <div key={index} className="p-3 bg-primary-light rounded-lg">
                  <p className="text-sm">{suggestion}</p>
                  <Button variant="ghost" size="sm" className="mt-2 h-8 px-3">
                    Analyze Now
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/upload">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload New Data
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/reports">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                <Link to="/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">AI Processing</span>
                <Badge variant="default" className="bg-success">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Data Sync</span>
                <Badge variant="default" className="bg-success">
                  Live
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Reports</span>
                <Badge variant="default" className="bg-success">
                  Available
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;