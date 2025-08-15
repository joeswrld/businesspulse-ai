import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  date: string;
  insights: number;
  dataSources: number;
  reports: number;
  userActivity: number;
}

interface MetricCard {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
}

const Analytics: React.FC = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch analytics data
  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      
      try {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Fetch insights data
        const { data: insightsData } = await supabase
          .from('ai_insights')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString());

        // Fetch data sources data
        const { data: dataSourcesData } = await supabase
          .from('data_sources')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString());

        // Fetch reports data
        const { data: reportsData } = await supabase
          .from('reports')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString());

        // Fetch analytics events
        const { data: eventsData } = await supabase
          .from('analytics_events')
          .select('created_at, event_type')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString());

        // Process data into daily aggregates
        const dailyData: { [key: string]: AnalyticsData } = {};
        
        for (let i = 0; i < days; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          dailyData[dateStr] = {
            date: dateStr,
            insights: 0,
            dataSources: 0,
            reports: 0,
            userActivity: 0
          };
        }

        // Aggregate insights
        insightsData?.forEach(item => {
          const date = item.created_at.split('T')[0];
          if (dailyData[date]) {
            dailyData[date].insights++;
          }
        });

        // Aggregate data sources
        dataSourcesData?.forEach(item => {
          const date = item.created_at.split('T')[0];
          if (dailyData[date]) {
            dailyData[date].dataSources++;
          }
        });

        // Aggregate reports
        reportsData?.forEach(item => {
          const date = item.created_at.split('T')[0];
          if (dailyData[date]) {
            dailyData[date].reports++;
          }
        });

        // Aggregate user activity
        eventsData?.forEach(item => {
          const date = item.created_at.split('T')[0];
          if (dailyData[date]) {
            dailyData[date].userActivity++;
          }
        });

        const chartData = Object.values(dailyData)
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(item => ({
            ...item,
            date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }));

        setAnalyticsData(chartData);

        // Calculate metrics
        const totalInsights = insightsData?.length || 0;
        const totalDataSources = dataSourcesData?.length || 0;
        const totalReports = reportsData?.length || 0;
        const totalActivity = eventsData?.length || 0;

        // Calculate previous period for comparison
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - days);

        const { data: prevInsights } = await supabase
          .from('ai_insights')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString());

        const { data: prevDataSources } = await supabase
          .from('data_sources')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString());

        const { data: prevReports } = await supabase
          .from('reports')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString());

        const { data: prevActivity } = await supabase
          .from('analytics_events')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString());

        const prevInsightsCount = prevInsights?.length || 0;
        const prevDataSourcesCount = prevDataSources?.length || 0;
        const prevReportsCount = prevReports?.length || 0;
        const prevActivityCount = prevActivity?.length || 0;

        const calculateChange = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        setMetrics([
          {
            title: 'Total Insights',
            value: totalInsights.toString(),
            change: calculateChange(totalInsights, prevInsightsCount),
            icon: <Brain className="h-5 w-5" />,
            trend: totalInsights >= prevInsightsCount ? 'up' : 'down'
          },
          {
            title: 'Data Sources',
            value: totalDataSources.toString(),
            change: calculateChange(totalDataSources, prevDataSourcesCount),
            icon: <BarChart3 className="h-5 w-5" />,
            trend: totalDataSources >= prevDataSourcesCount ? 'up' : 'down'
          },
          {
            title: 'Reports Generated',
            value: totalReports.toString(),
            change: calculateChange(totalReports, prevReportsCount),
            icon: <FileText className="h-5 w-5" />,
            trend: totalReports >= prevReportsCount ? 'up' : 'down'
          },
          {
            title: 'User Activity',
            value: totalActivity.toString(),
            change: calculateChange(totalActivity, prevActivityCount),
            icon: <Users className="h-5 w-5" />,
            trend: totalActivity >= prevActivityCount ? 'up' : 'down'
          }
        ]);

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Set up realtime subscription for analytics events
    const channel = supabase
      .channel('analytics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analytics_events',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh data when new analytics events are added
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, timeRange]);

  const refreshData = async () => {
    setRefreshing(true);
    // Force a re-fetch by changing a dependency
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const pieData = analyticsData.reduce((acc, item) => [
    { name: 'Insights', value: acc[0]?.value + item.insights || item.insights },
    { name: 'Data Sources', value: acc[1]?.value + item.dataSources || item.dataSources },
    { name: 'Reports', value: acc[2]?.value + item.reports || item.reports },
    { name: 'Activity', value: acc[3]?.value + item.userActivity || item.userActivity }
  ], [] as any);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground">Real-time insights into your business performance</p>
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

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <div className="text-primary">
                {metric.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metric.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : metric.trend === 'down' ? (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                ) : null}
                <span className={
                  metric.change > 0 ? 'text-green-500' : 
                  metric.change < 0 ? 'text-red-500' : 
                  'text-muted-foreground'
                }>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </span>
                <span className="ml-1">from previous period</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Trends</CardTitle>
            <CardDescription>Daily activity over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="insights" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="dataSources" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="reports" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Distribution</CardTitle>
            <CardDescription>Breakdown of activity types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Daily Activity Breakdown</CardTitle>
            <CardDescription>Detailed view of daily activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="insights" fill="#3b82f6" />
                  <Bar dataKey="dataSources" fill="#10b981" />
                  <Bar dataKey="reports" fill="#f59e0b" />
                  <Bar dataKey="userActivity" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI Insights Summary</CardTitle>
          <CardDescription>Key takeaways from your analytics data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-medium text-blue-900">Peak Activity</h4>
              <p className="text-blue-700 text-sm">
                Your highest activity day was {analyticsData.reduce((max, item) => 
                  (item.insights + item.dataSources + item.reports + item.userActivity) > 
                  (max.insights + max.dataSources + max.reports + max.userActivity) ? item : max, 
                  analyticsData[0] || { date: 'N/A', insights: 0, dataSources: 0, reports: 0, userActivity: 0 }
                ).date || 'N/A'} with the most combined activity.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <h4 className="font-medium text-green-900">Growth Trend</h4>
              <p className="text-green-700 text-sm">
                Your insights generation is trending {
                  metrics[0]?.change > 0 ? 'upward' : 
                  metrics[0]?.change < 0 ? 'downward' : 'stable'
                } compared to the previous period.
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <h4 className="font-medium text-yellow-900">Recommendation</h4>
              <p className="text-yellow-700 text-sm">
                Consider uploading more data sources to generate additional insights and maximize your analytics potential.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;