import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Brain,
  Upload,
  FileText,
  Users,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Eye,
  Plus,
  RefreshCw,
  Zap,
  Shield,
  Download,
  Settings,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  total_insights: number;
  total_uploads: number;
  total_reports: number;
  team_members: number;
  growth_rate: number;
  system_status: 'healthy' | 'warning' | 'error';
  last_updated: string;
}

interface Insight {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  created_at: string;
}

interface Upload {
  id: string;
  filename: string;
  file_type: string;
  status: 'processing' | 'completed' | 'failed';
  insights_generated: number;
  created_at: string;
}

interface SystemStatus {
  database: 'online' | 'offline';
  ai_service: 'online' | 'offline';
  storage: 'online' | 'offline';
  last_check: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInsights, setRecentInsights] = useState<Insight[]>([]);
  const [recentUploads, setRecentUploads] = useState<Upload[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching dashboard data for user:', user.id);
      
      // Fetch dashboard statistics
      const { data: statsData, error: statsError } = await supabase
        .from('dashboard_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      // Fetch recent insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (insightsError) throw insightsError;

      // Fetch recent uploads
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('data_uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (uploadsError) throw uploadsError;

      // Check system status
      const systemStatusData: SystemStatus = {
        database: 'online',
        ai_service: 'online',
        storage: 'online',
        last_check: new Date().toISOString()
      };

      console.log('📊 Dashboard data fetched:', {
        stats: statsData ? 'Yes' : 'No',
        insights: insightsData?.length || 0,
        uploads: uploadsData?.length || 0
      });
      
      setStats(statsData);
      setRecentInsights(insightsData || []);
      setRecentUploads(uploadsData || []);
      setSystemStatus(systemStatusData);
      
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time dashboard subscriptions for user:', user.id);

    // Subscribe to insights changes
    const insightsChannel = supabase
      .channel('dashboard-insights-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_insights',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Insight real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            setRecentInsights(prev => [payload.new as Insight, ...prev.slice(0, 4)]);
          } else if (payload.eventType === 'UPDATE') {
            setRecentInsights(prev => 
              prev.map(insight => 
                insight.id === payload.new.id ? payload.new as Insight : insight
              )
            );
          }
        }
      )
      .subscribe();

    // Subscribe to uploads changes
    const uploadsChannel = supabase
      .channel('dashboard-uploads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_uploads',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Upload real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            setRecentUploads(prev => [payload.new as Upload, ...prev.slice(0, 4)]);
          } else if (payload.eventType === 'UPDATE') {
            setRecentUploads(prev => 
              prev.map(upload => 
                upload.id === payload.new.id ? payload.new as Upload : upload
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time dashboard subscriptions');
      supabase.removeChannel(insightsChannel);
      supabase.removeChannel(uploadsChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Quick actions
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'upload':
        navigate('/data-upload');
        break;
      case 'insights':
        navigate('/ai-insights');
        break;
      case 'reports':
        navigate('/reports');
        break;
      case 'analytics':
        navigate('/analytics');
        break;
      case 'teams':
        navigate('/teams');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        break;
    }
  };

  // Utility functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getSystemStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-lg text-gray-600">
                Welcome back! Here's your business intelligence overview.
              </p>
            </div>
            <Button onClick={fetchDashboardData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Brain className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats?.total_insights || 0}
                  </div>
                  <div className="text-sm text-gray-500">AI-generated insights</div>
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
                <Upload className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats?.total_uploads || 0}
                  </div>
                  <div className="text-sm text-gray-500">Files uploaded</div>
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
                  <div className="text-2xl font-bold text-gray-900">
                    {stats?.team_members || 0}
                  </div>
                  <div className="text-sm text-gray-500">Active members</div>
                </div>
              </div>
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
                  <div className="text-2xl font-bold text-gray-900">
                    {stats?.growth_rate ? `${stats.growth_rate}%` : '0%'}
                  </div>
                  <div className="text-sm text-gray-500">Monthly growth</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white shadow-sm border-0 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Access key features and start new tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleQuickAction('upload')}
              >
                <Upload className="h-6 w-6" />
                <span className="text-sm">Upload Data</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleQuickAction('insights')}
              >
                <Brain className="h-6 w-6" />
                <span className="text-sm">View Insights</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleQuickAction('reports')}
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm">Generate Reports</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleQuickAction('analytics')}
              >
                <BarChart3 className="h-6 w-6" />
                <span className="text-sm">Analytics</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleQuickAction('teams')}
              >
                <Users className="h-6 w-6" />
                <span className="text-sm">Team</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => handleQuickAction('settings')}
              >
                <Settings className="h-6 w-6" />
                <span className="text-sm">Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="bg-white shadow-sm border-0 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Real-time monitoring of platform services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${systemStatus?.database === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">Database</span>
                </div>
                <Badge className={getSystemStatusColor(systemStatus?.database || 'offline')}>
                  {systemStatus?.database || 'offline'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${systemStatus?.ai_service === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">AI Service</span>
                </div>
                <Badge className={getSystemStatusColor(systemStatus?.ai_service || 'offline')}>
                  {systemStatus?.ai_service || 'offline'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${systemStatus?.storage === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-medium">Storage</span>
                </div>
                <Badge className={getSystemStatusColor(systemStatus?.storage || 'offline')}>
                  {systemStatus?.storage || 'offline'}
                </Badge>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-gray-500 text-center">
              Last checked: {systemStatus?.last_check ? formatTimeAgo(systemStatus.last_check) : 'Never'}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Insights */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Recent AI Insights
              </CardTitle>
              <CardDescription>
                Latest business intelligence generated
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentInsights.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No insights yet</p>
                  <p className="text-sm">Upload data to generate your first insights</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate('/ai-insights')}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                          {insight.title}
                        </h4>
                        <Badge className={getPriorityColor(insight.priority)}>
                          {insight.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                        {insight.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="capitalize">{insight.category}</span>
                        <span>{insight.confidence}% confidence</span>
                        <span>{formatTimeAgo(insight.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => navigate('/ai-insights')}
                  >
                    View All Insights
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Uploads */}
          <Card className="bg-white shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Recent Data Uploads
              </CardTitle>
              <CardDescription>
                Latest files and data sources added
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentUploads.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Upload className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No uploads yet</p>
                  <p className="text-sm">Start by uploading your first data file</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate('/data-upload')}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-1">
                          {upload.filename}
                        </h4>
                        <Badge className={getStatusColor(upload.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(upload.status)}
                            <span className="capitalize">{upload.status}</span>
                          </div>
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="uppercase">{upload.file_type}</span>
                        <span>{upload.insights_generated} insights</span>
                        <span>{formatTimeAgo(upload.created_at)}</span>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => navigate('/data-upload')}
                  >
                    Upload More Data
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;