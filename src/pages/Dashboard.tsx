import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Database, 
  Users, 
  TrendingUp, 
  Upload, 
  FileText, 
  BarChart, 
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus
} from 'lucide-react';
import { useRealtimeInsights, useRealtimeDataSources } from '@/hooks/useRealtime';

interface DashboardStats {
  totalInsights: number;
  dataSources: number;
  teamMembers: number;
  growthRate: number;
  processingJobs: number;
  syncStatus: 'healthy' | 'warning' | 'error';
  reportsStatus: 'available' | 'processing' | 'unavailable';
}

interface AIInsight {
  id: string;
  title: string;
  summary: string | null;
  insight_type: string;
  created_at: string;
  priority: string | null;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: insights, loading: insightsLoading } = useRealtimeInsights();
  const { data: dataSources, loading: dataSourcesLoading } = useRealtimeDataSources();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalInsights: 0,
    dataSources: 0,
    teamMembers: 0,
    growthRate: 0,
    processingJobs: 0,
    syncStatus: 'healthy',
    reportsStatus: 'available'
  });
  
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user profile and calculate stats
  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
        }

        // Calculate growth rate (current month vs last month)
        const now = new Date();
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const { data: currentMonthInsights } = await supabase
          .from('ai_insights')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', currentMonth.toISOString());

        const { data: lastMonthInsights } = await supabase
          .from('ai_insights')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', lastMonth.toISOString())
          .lt('created_at', currentMonth.toISOString());

        const currentCount = currentMonthInsights?.length || 0;
        const lastCount = lastMonthInsights?.length || 0;
        const growthRate = lastCount > 0 ? ((currentCount - lastCount) / lastCount) * 100 : 0;

        // Get team members count (if table exists)
        let teamMembersCount = 0;
        try {
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('id')
            .eq('user_id', user.id);
          teamMembersCount = teamMembers?.length || 0;
        } catch (error) {
          console.log('Team members table not available yet');
        }

        // Get processing jobs count from data_sources
        let processingJobsCount = 0;
        const processingDataSources = dataSources?.filter(ds => ds.status === 'processing');
        processingJobsCount = processingDataSources?.length || 0;

        // Get sync status based on data sources status
        let syncStatus: 'healthy' | 'warning' | 'error' = 'healthy';
        const errorSources = dataSources?.filter(ds => ds.status === 'error');
        const processingSources = dataSources?.filter(ds => ds.status === 'processing');
        
        if (errorSources && errorSources.length > 0) {
          syncStatus = 'error';
        } else if (processingSources && processingSources.length > 0) {
          syncStatus = 'warning';
        }

        // Get reports status
        let reportsStatus: 'available' | 'processing' | 'unavailable' = 'available';
        try {
          const { data: reports } = await supabase
            .from('reports')
            .select('status')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (reports && reports.length > 0) {
            reportsStatus = reports[0].status === 'available' ? 'available' :
                           reports[0].status === 'processing' ? 'processing' : 'unavailable';
          }
        } catch (error) {
          console.log('Reports table not available yet');
        }

        setStats({
          totalInsights: insights?.length || 0,
          dataSources: dataSources?.length || 0,
          teamMembers: teamMembersCount,
          growthRate: Math.round(growthRate * 100) / 100,
          processingJobs: processingJobsCount,
          syncStatus,
          reportsStatus
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, insights, dataSources]);

  // Update stats when real-time data changes
  useEffect(() => {
    if (insights && dataSources) {
      setStats(prev => ({
        ...prev,
        totalInsights: insights.length,
        dataSources: dataSources.length
      }));
    }
  }, [insights, dataSources]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
      case 'unavailable':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const aiSuggestions = [
    {
      title: "Analyze Customer Behavior",
      description: "Upload your customer data to identify patterns and trends",
      action: "Analyze Now",
      icon: <BarChart3 className="h-5 w-5" />
    },
    {
      title: "Generate Sales Report",
      description: "Create comprehensive sales analytics and insights",
      action: "Generate Report",
      icon: <FileText className="h-5 w-5" />
    },
    {
      title: "Optimize Marketing Campaigns",
      description: "Analyze campaign performance and optimize ROI",
      action: "Optimize Now",
      icon: <TrendingUp className="h-5 w-5" />
    }
  ];

  // Get user display name
  const getUserDisplayName = () => {
    if (userProfile?.first_name && userProfile?.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    } else if (userProfile?.first_name) {
      return userProfile.first_name;
    } else if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  // Get user plan
  const getUserPlan = () => {
    return userProfile?.plan || 'free';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {getUserDisplayName()}!
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Here's your real-time business intelligence
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Lightbulb className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.totalInsights}</div>
                  <div className="text-sm text-gray-500">This week</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Data Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Database className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.dataSources}</div>
                  <div className="text-sm text-gray-500">Connected</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.teamMembers}</div>
                  <div className="text-sm text-gray-500">
                    {getUserPlan() === 'pro' ? 'of 5 limit' : 'of 2 limit'}
                  </div>
                </div>
              </div>
              {getUserPlan() === 'pro' && stats.teamMembers >= 5 && (
                <Badge variant="destructive" className="mt-2">Limit Reached</Badge>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Growth Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <div className={`text-2xl font-bold ${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate}%
                  </div>
                  <div className="text-sm text-gray-500">vs last month</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent AI Insights */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2 text-blue-600" />
                  Recent AI Insights
                </CardTitle>
                <CardDescription>
                  Latest AI-generated insights from your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insightsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading insights...</p>
                  </div>
                ) : insights && insights.length > 0 ? (
                  <div className="space-y-4">
                    {insights.slice(0, 5).map((insight: AIInsight) => (
                      <div key={insight.id} className="border-l-4 border-blue-200 pl-4 py-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{insight.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{insight.summary || 'AI-generated insight ready for review'}</p>
                            <div className="flex items-center mt-2 space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {insight.insight_type}
                              </Badge>
                              {insight.priority && (
                                <Badge 
                                  variant={insight.priority === 'high' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {insight.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No insights yet</h3>
                    <p className="text-gray-500 mb-4">Upload some data to get started!</p>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Data
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* AI Suggestions */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="text-lg">AI Suggestions</CardTitle>
                <CardDescription>Recommended actions for your data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiSuggestions.map((suggestion, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 text-blue-600">
                        {suggestion.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900">{suggestion.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{suggestion.description}</p>
                        <Button size="sm" className="mt-3" variant="outline">
                          {suggestion.action}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New Data
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BarChart className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="text-lg">System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon('healthy')}
                    <span className="text-sm font-medium">AI Processing</span>
                  </div>
                  <Badge className={getStatusColor('healthy')}>
                    {stats.processingJobs > 0 ? `${stats.processingJobs} jobs` : 'Idle'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(stats.syncStatus)}
                    <span className="text-sm font-medium">Data Sync</span>
                  </div>
                  <Badge className={getStatusColor(stats.syncStatus)}>
                    {stats.syncStatus === 'healthy' ? 'Healthy' : 
                     stats.syncStatus === 'warning' ? 'Warning' : 'Error'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(stats.reportsStatus)}
                    <span className="text-sm font-medium">Reports</span>
                  </div>
                  <Badge className={getStatusColor(stats.reportsStatus)}>
                    {stats.reportsStatus === 'available' ? 'Available' : 
                     stats.reportsStatus === 'processing' ? 'Processing' : 'Unavailable'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;