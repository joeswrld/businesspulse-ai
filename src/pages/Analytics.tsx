import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  DollarSign,
  Brain,
  FileText,
  Loader2,
  RefreshCw,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Sparkles,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface GeminiAnalytics {
  overall_sentiment: 'positive' | 'negative' | 'neutral';
  top_themes: string[];
  recommended_actions: string[];
  kpis: {
    total_insights: number;
    reports_generated: number;
    growth_rate: string;
    team_members: number;
    active_ai_jobs: number;
    data_sources_count: number;
  };
  trends: {
    sentiment_trend: 'improving' | 'declining' | 'stable';
    activity_trend: 'increasing' | 'decreasing' | 'stable';
    priority_distribution: Record<string, number>;
  };
  insights_summary: string;
  business_recommendations: string[];
}

interface SentimentData {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

interface ThemeData {
  theme: string;
  count: number;
  percentage: number;
}

interface ReportData {
  week: string;
  completed: number;
  inProgress: number;
}

const Analytics: React.FC = () => {
  const { user } = useAuth();
  
  // State for real-time data
  const [insights, setInsights] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [aiJobs, setAiJobs] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // State for analytics
  const [geminiAnalytics, setGeminiAnalytics] = useState<GeminiAnalytics | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [themeData, setThemeData] = useState<ThemeData[]>([]);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [insightsRes, reportsRes, dataSourcesRes, aiJobsRes, teamMembersRes] = await Promise.all([
        supabase.from('ai_insights').select('*').eq('user_id', user.id),
        supabase.from('reports').select('*').eq('user_id', user.id),
        supabase.from('data_sources').select('*').eq('user_id', user.id),
        supabase.from('ai_jobs').select('*').eq('user_id', user.id),
        supabase.from('team_members').select('*').eq('user_id', user.id)
      ]);

      setInsights(insightsRes.data || []);
      setReports(reportsRes.data || []);
      setDataSources(dataSourcesRes.data || []);
      setAiJobs(aiJobsRes.data || []);
      setTeamMembers(teamMembersRes.data || []);

      // Process chart data
      processChartData(
        insightsRes.data || [],
        reportsRes.data || [],
        timeRange
      );

    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange]);

  // Process data for charts
  const processChartData = useCallback((insightsData: any[], reportsData: any[], range: string) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    
    // Process sentiment data
    const sentiment: SentimentData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayInsights = insightsData.filter(insight => 
        insight.created_at.startsWith(dateStr)
      );
      
      const positive = dayInsights.filter(insight => 
        insight.priority === 'High' || insight.confidence_score > 0.8
      ).length;
      const negative = dayInsights.filter(insight => 
        insight.priority === 'Low' || insight.confidence_score < 0.5
      ).length;
      const neutral = dayInsights.length - positive - negative;
      
      sentiment.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        positive,
        negative,
        neutral
      });
    }
    setSentimentData(sentiment);

    // Process theme data
    const themeCounts: Record<string, number> = {};
    insightsData.forEach(insight => {
      const category = insight.insight_type || 'General';
      themeCounts[category] = (themeCounts[category] || 0) + 1;
    });
    
    const themes = Object.entries(themeCounts)
      .map(([theme, count]) => ({
        theme,
        count,
        percentage: (count / insightsData.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    
    setThemeData(themes);

    // Process report data
    const reportCounts: Record<string, { completed: number; inProgress: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!reportCounts[weekKey]) {
        reportCounts[weekKey] = { completed: 0, inProgress: 0 };
      }
    }
    
    reportsData.forEach(report => {
      const reportDate = new Date(report.created_at);
      const weekStart = new Date(reportDate);
      weekStart.setDate(reportDate.getDate() - reportDate.getDay());
      const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (reportCounts[weekKey]) {
        if (report.status === 'completed') {
          reportCounts[weekKey].completed++;
        } else {
          reportCounts[weekKey].inProgress++;
        }
      }
    });
    
    const reports = Object.entries(reportCounts)
      .map(([week, counts]) => ({
        week,
        completed: counts.completed,
        inProgress: counts.inProgress
      }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());
    
    setReportData(reports);
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channels = [
      supabase
        .channel('insights-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'ai_insights',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setInsights(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setInsights(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            ));
          } else if (payload.eventType === 'DELETE') {
            setInsights(prev => prev.filter(item => item.id !== payload.old.id));
          }
          processChartData(insights, reports, timeRange);
        })
        .subscribe(),

      supabase
        .channel('reports-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setReports(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReports(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            ));
          } else if (payload.eventType === 'DELETE') {
            setReports(prev => prev.filter(item => item.id !== payload.old.id));
          }
          processChartData(insights, reports, timeRange);
        })
        .subscribe(),

      supabase
        .channel('data-sources-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'data_sources',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setDataSources(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDataSources(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            ));
          } else if (payload.eventType === 'DELETE') {
            setDataSources(prev => prev.filter(item => item.id !== payload.old.id));
          }
        })
        .subscribe(),

      supabase
        .channel('ai-jobs-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'ai_jobs',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setAiJobs(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAiJobs(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            ));
          } else if (payload.eventType === 'DELETE') {
            setAiJobs(prev => prev.filter(item => item.id !== payload.old.id));
          }
        })
        .subscribe(),

      supabase
        .channel('team-members-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setTeamMembers(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTeamMembers(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            ));
          } else if (payload.eventType === 'DELETE') {
            setTeamMembers(prev => prev.filter(item => item.id !== payload.old.id));
          }
        })
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, insights, reports, timeRange, processChartData]);

  // Fetch initial data on mount
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Generate AI Analytics
  const generateAIAnalytics = async () => {
    if (!user) return;
    
    setGeneratingAI(true);
    try {
      const response = await fetch('/functions/v1/geminiAnalytics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          insights,
          reports,
          data_sources: dataSources,
          ai_jobs: aiJobs,
          team_members: teamMembers
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI analytics');
      }

      const result = await response.json();
      if (result.success) {
        setGeminiAnalytics(result.result);
      }
    } catch (error) {
      console.error('Error generating AI analytics:', error);
    } finally {
      setGeneratingAI(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await fetchInitialData();
    setRefreshing(false);
  };

  // Calculate KPIs
  const totalInsights = insights.length;
  const totalReports = reports.length;
  const activeAIJobs = aiJobs.filter(job => job.status === 'processing').length;
  const teamSize = teamMembers.length;
  const dataSourcesCount = dataSources.length;
  
  // Calculate growth rate (mock calculation for now)
  const growthRate = totalInsights > 10 ? "15%" : totalInsights > 5 ? "8%" : "0%";

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Business Analytics</h1>
          <p className="text-muted-foreground">Real-time insights and AI-powered business intelligence</p>
        </div>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Insights
            </CardTitle>
            <Brain className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalInsights}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500">+{growthRate}</span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reports Generated
            </CardTitle>
            <FileText className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalReports}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Activity className="h-3 w-3 mr-1 text-blue-500" />
              <span className="text-blue-500">Active</span>
              <span className="ml-1">documentation</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active AI Jobs
            </CardTitle>
            <Zap className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeAIJobs}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1 text-orange-500" />
              <span className="text-orange-500">Processing</span>
              <span className="ml-1">in background</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Members
            </CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{teamSize}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Target className="h-3 w-3 mr-1 text-purple-500" />
              <span className="text-purple-500">Collaboration</span>
              <span className="ml-1">enabled</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sentiment Trends Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
              Sentiment Trends
            </CardTitle>
            <CardDescription>Sentiment analysis over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sentimentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} name="Positive" />
                  <Line type="monotone" dataKey="neutral" stroke="#6b7280" strokeWidth={2} name="Neutral" />
                  <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} name="Negative" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Key Themes Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-500" />
              Key Themes
            </CardTitle>
            <CardDescription>Most frequent insight categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={themeData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="theme" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Reports Completed Area Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AreaChart className="h-5 w-5 mr-2 text-purple-500" />
              Reports Progress
            </CardTitle>
            <CardDescription>Weekly report completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="completed" stackId="1" stroke="#10b981" fill="#10b981" name="Completed" />
                  <Area type="monotone" dataKey="inProgress" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="In Progress" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gemini AI Analytics Section */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
            AI-Powered Business Intelligence
          </CardTitle>
          <CardDescription>
            Generate comprehensive analytics insights using Gemini AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={generateAIAnalytics}
              disabled={generatingAI}
              className="w-full md:w-auto"
            >
              {generatingAI ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating AI Analytics...
                </>
              ) : (
                <>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Generate AI Analytics
                </>
              )}
            </Button>

            {geminiAnalytics && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Sentiment and Trends */}
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                      <h4 className="font-medium text-blue-900 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Overall Sentiment
                      </h4>
                      <Badge 
                        variant={geminiAnalytics.overall_sentiment === 'positive' ? 'default' : 
                                geminiAnalytics.overall_sentiment === 'negative' ? 'destructive' : 'secondary'}
                        className="mt-2"
                      >
                        {geminiAnalytics.overall_sentiment.charAt(0).toUpperCase() + geminiAnalytics.overall_sentiment.slice(1)}
                      </Badge>
                      <p className="text-blue-700 text-sm mt-2">
                        {geminiAnalytics.insights_summary}
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                      <h4 className="font-medium text-green-900 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Activity Trend
                      </h4>
                      <Badge 
                        variant={geminiAnalytics.trends.activity_trend === 'increasing' ? 'default' : 
                                geminiAnalytics.trends.activity_trend === 'decreasing' ? 'destructive' : 'secondary'}
                        className="mt-2"
                      >
                        {geminiAnalytics.trends.activity_trend.charAt(0).toUpperCase() + geminiAnalytics.trends.activity_trend.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {/* Top Themes and Actions */}
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                      <h4 className="font-medium text-purple-900 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Top Themes
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {geminiAnalytics.top_themes.map((theme, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                      <h4 className="font-medium text-orange-900 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Recommended Actions
                      </h4>
                      <ul className="text-orange-700 text-sm mt-2 space-y-1">
                        {geminiAnalytics.recommended_actions.map((action, index) => (
                          <li key={index} className="flex items-start">
                            <ArrowUpRight className="h-3 w-3 mr-2 mt-0.5 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* KPI Snapshot */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">KPI Snapshot</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{geminiAnalytics.kpis.total_insights}</div>
                      <div className="text-xs text-gray-600">Total Insights</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{geminiAnalytics.kpis.reports_generated}</div>
                      <div className="text-xs text-gray-600">Reports</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{geminiAnalytics.kpis.growth_rate}</div>
                      <div className="text-xs text-gray-600">Growth Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{geminiAnalytics.kpis.team_members}</div>
                      <div className="text-xs text-gray-600">Team Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{geminiAnalytics.kpis.active_ai_jobs}</div>
                      <div className="text-xs text-gray-600">Active AI Jobs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{geminiAnalytics.kpis.data_sources_count}</div>
                      <div className="text-xs text-gray-600">Data Sources</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Priority Distribution - Only show when AI analytics are available */}
      {geminiAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2 text-indigo-500" />
              Priority Distribution
            </CardTitle>
            <CardDescription>Insights categorized by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(geminiAnalytics.trends.priority_distribution).map(([priority, count]) => ({
                      name: priority,
                      value: count
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {Object.entries(geminiAnalytics.trends.priority_distribution).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;