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
import { useRealtimeInsights, useRealtimeDataSources, useRealtimeAnalytics } from "@/hooks/useRealtime";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: insights, loading: insightsLoading } = useRealtimeInsights();
  const { data: dataSources, loading: sourcesLoading } = useRealtimeDataSources();
  const { data: analyticsEvents } = useRealtimeAnalytics();
  
  const [metrics, setMetrics] = useState({
    totalInsights: 0,
    activeDataSources: 0,
    teamMembers: 1,
    monthlyGrowth: 0
  });

  // Track page view
  useEffect(() => {
    if (user) {
      const trackPageView = async () => {
        await supabase.from('analytics_events').insert({
          user_id: user.id,
          event_type: 'page_view',
          event_data: { page: 'dashboard' }
        });
      };
      trackPageView();
    }
  }, [user]);

  // Update metrics in real-time
  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      totalInsights: insights.length,
      activeDataSources: dataSources.filter(source => source.status === 'completed').length,
      monthlyGrowth: insights.length > 0 ? 
        ((insights.filter(i => new Date(i.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length / insights.length) * 100) : 0
    }));
  }, [insights, dataSources]);

  const recentInsights = insights.slice(0, 3).map(insight => ({
    id: insight.id,
    title: insight.title,
    summary: insight.summary || 'AI-generated insight ready for review',
    priority: insight.priority || 'medium',
    category: insight.industry_category || 'General',
    createdAt: new Date(insight.created_at).toLocaleString(),
    confidence: Math.round((insight.confidence_score || 0.8) * 100)
  }));

  const [aiSuggestions] = useState([
    "Upload sales data to identify revenue trends",
    "Analyze customer feedback for sentiment patterns",
    "Review team productivity metrics for this quarter"
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your real-time business intelligence.
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
              {insightsLoading ? 'Loading...' : `${insights.filter(i => new Date(i.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} this week`}
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
              {sourcesLoading ? 'Loading...' : `${dataSources.filter(s => s.status === 'processing').length} processing`}
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
            <div className="text-2xl font-bold">+{metrics.monthlyGrowth.toFixed(1)}%</div>
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
              {insightsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recentInsights.length > 0 ? (
                recentInsights.map((insight) => (
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
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No insights yet. Upload some data to get started!</p>
                </div>
              )}
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 h-8 px-3"
                    onClick={() => toast({
                      title: "Action Started",
                      description: "AI is processing your request..."
                    })}
                  >
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