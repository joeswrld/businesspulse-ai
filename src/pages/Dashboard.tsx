import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
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
  Plus,
  Activity,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';

interface DashboardStats {
  totalInsights: number;
  dataSources: number;
  teamMembers: number;
  growthRate: number;
  processingJobs: number;
  syncStatus: 'healthy' | 'warning' | 'error';
  reportsStatus: 'available' | 'processing' | 'unavailable';
  thisWeekInsights: number;
  thisMonthInsights: number;
  positiveSentiment: number;
  negativeSentiment: number;
  neutralSentiment: number;
}

interface AIInsight {
  id: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  key_themes: string[];
  suggested_actions: string[];
  created_at: string;
  source_file?: string;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
  file_size?: number;
}

interface AIJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  input_length: number;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  last_active: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Real-time state
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [aiJobs, setAiJobs] = useState<AIJob[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalInsights: 0,
    dataSources: 0,
    teamMembers: 0,
    growthRate: 0,
    processingJobs: 0,
    syncStatus: 'healthy',
    reportsStatus: 'available',
    thisWeekInsights: 0,
    thisMonthInsights: 0,
    positiveSentiment: 0,
    negativeSentiment: 0,
    neutralSentiment: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [growthRateUpdating, setGrowthRateUpdating] = useState(false);

  // Calculate derived stats with real-time growth rate
  const calculateStats = (insights: AIInsight[], dataSources: DataSource[], aiJobs: AIJob[], teamMembers: TeamMember[]) => {
    const now = new Date();
    
    // Calculate current month (from 1st of current month to now)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = now;
    
    // Calculate previous month (full previous month)
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    
    // Calculate current week (from start of week to now)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Filter insights by time periods
    const thisWeekInsights = insights.filter(i => {
      const insightDate = new Date(i.created_at);
      return insightDate >= weekStart && insightDate <= currentMonthEnd;
    }).length;

    const thisMonthInsights = insights.filter(i => {
      const insightDate = new Date(i.created_at);
      return insightDate >= currentMonthStart && insightDate <= currentMonthEnd;
    }).length;

    const lastMonthInsights = insights.filter(i => {
      const insightDate = new Date(i.created_at);
      return insightDate >= previousMonthStart && insightDate <= previousMonthEnd;
    }).length;

    // Calculate real-time growth rate
    let growthRate = 0;
    if (lastMonthInsights > 0) {
      growthRate = Math.round(((thisMonthInsights - lastMonthInsights) / lastMonthInsights) * 100);
    } else if (thisMonthInsights > 0) {
      // If no insights last month but we have some this month, it's 100% growth
      growthRate = 100;
    }

    // Calculate sentiment breakdown
    const positiveSentiment = insights.filter(i => i.sentiment === 'positive').length;
    const negativeSentiment = insights.filter(i => i.sentiment === 'negative').length;
    const neutralSentiment = insights.filter(i => i.sentiment === 'neutral').length;

    // Calculate processing jobs
    const processingJobs = aiJobs.filter(j => j.status === 'processing').length;

    return {
      totalInsights: insights.length,
      dataSources: dataSources.length,
      teamMembers: teamMembers.length,
      growthRate,
      processingJobs,
      syncStatus: 'healthy' as const,
      reportsStatus: 'available' as const,
      thisWeekInsights,
      thisMonthInsights,
      positiveSentiment,
      negativeSentiment,
      neutralSentiment
    };
  };

  // Fetch initial data
  const fetchInitialData = async () => {
    if (!user) return;

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

      // Fetch insights from localStorage (since we're using localStorage for insights)
      const savedInsights = localStorage.getItem('insightsHistory');
      if (savedInsights) {
        const parsedInsights = JSON.parse(savedInsights);
        setInsights(parsedInsights);
      }

      // Mock data for demonstration (replace with real Supabase queries)
      const mockDataSources: DataSource[] = [
        { id: '1', name: 'Customer Feedback CSV', type: 'csv', status: 'connected', created_at: new Date().toISOString(), file_size: 1024000 },
        { id: '2', name: 'Support Tickets PDF', type: 'pdf', status: 'connected', created_at: new Date().toISOString(), file_size: 2048000 }
      ];
      setDataSources(mockDataSources);

      const mockAIJobs: AIJob[] = [
        { id: '1', status: 'completed', created_at: new Date().toISOString(), completed_at: new Date().toISOString(), input_length: 1500 },
        { id: '2', status: 'processing', created_at: new Date().toISOString(), input_length: 2300 }
      ];
      setAiJobs(mockAIJobs);

      const mockTeamMembers: TeamMember[] = [
        { id: '1', name: 'codexpress200', email: 'codexpress200@example.com', role: 'Admin', status: 'active', last_active: new Date().toISOString() }
      ];
      setTeamMembers(mockTeamMembers);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    fetchInitialData();

    // Set up real-time subscriptions for insights (localStorage-based)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'insightsHistory' && e.newValue) {
        const newInsights = JSON.parse(e.newValue);
        setInsights(newInsights);
        toast.success('New insight generated!', {
          description: 'Your dashboard has been updated with the latest analysis.'
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Mock real-time updates for demonstration with realistic growth patterns
    const interval = setInterval(() => {
      // Simulate new insights being added with varying sentiment
      if (Math.random() > 0.92) { // 8% chance every interval for more frequent updates
        const sentiments: ('positive' | 'negative' | 'neutral')[] = ['positive', 'negative', 'neutral'];
        const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
        
        const insightTemplates = [
          {
            summary: 'Customer feedback shows positive sentiment about the new dashboard interface.',
            themes: ['dashboard', 'user interface', 'usability'],
            actions: ['Continue UI improvements', 'Monitor user adoption']
          },
          {
            summary: 'Users report issues with mobile app performance and loading times.',
            themes: ['mobile app', 'performance', 'loading speed'],
            actions: ['Optimize mobile performance', 'Investigate loading issues']
          },
          {
            summary: 'Mixed feedback on pricing structure with requests for more flexible options.',
            themes: ['pricing', 'subscription', 'flexibility'],
            actions: ['Review pricing strategy', 'Consider flexible plans']
          },
          {
            summary: 'Excellent feedback on customer support response times and helpfulness.',
            themes: ['customer support', 'response time', 'helpfulness'],
            actions: ['Maintain support quality', 'Document best practices']
          },
          {
            summary: 'Feature requests for dark mode and additional customization options.',
            themes: ['dark mode', 'customization', 'feature requests'],
            actions: ['Prioritize dark mode', 'Plan customization features']
          }
        ];
        
        const randomTemplate = insightTemplates[Math.floor(Math.random() * insightTemplates.length)];
        
        const newInsight: AIInsight = {
          id: Date.now().toString(),
          summary: randomTemplate.summary,
          sentiment: randomSentiment,
          key_themes: randomTemplate.themes,
          suggested_actions: randomTemplate.actions,
          created_at: new Date().toISOString()
        };
        
        setInsights(prev => [newInsight, ...prev]);
        
        // Show growth rate update animation
        setGrowthRateUpdating(true);
        setTimeout(() => setGrowthRateUpdating(false), 2000);
        
        // Show growth rate update notification
        const newStats = calculateStats([newInsight, ...insights], dataSources, aiJobs, teamMembers);
        toast.success('Growth Rate Updated! 📈', {
          description: `New insight added. Growth rate: ${newStats.growthRate > 0 ? '+' : ''}${newStats.growthRate}% vs last month.`
        });
      }
    }, 8000); // Check every 8 seconds for more frequent updates

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [user]);

  // Update stats when data changes
  useEffect(() => {
    const newStats = calculateStats(insights, dataSources, aiJobs, teamMembers);
    setStats(newStats);
  }, [insights, dataSources, aiJobs, teamMembers]);

  const handleUploadData = () => {
    toast.info('Upload feature coming soon!', {
      description: 'This will integrate with your file upload system.'
    });
  };

  const handleAnalyzeNow = () => {
    toast.info('Analysis feature coming soon!', {
      description: 'This will trigger AI analysis on your data.'
    });
  };

  const handleGenerateReport = () => {
    toast.info('Report generation coming soon!', {
      description: 'This will create comprehensive reports from your insights.'
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {userProfile?.full_name || user?.email || 'codexpress200'}! 👋
        </h1>
        <p className="text-gray-600">Your real-time business intelligence dashboard</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center gap-1 text-green-600">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Live Updates Active</span>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
            <Lightbulb className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInsights}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.thisWeekInsights} this week
            </p>
          </CardContent>
        </Card>

        <Card className={growthRateUpdating ? 'ring-2 ring-green-500 ring-opacity-50 transition-all duration-300' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <div className="flex items-center gap-2">
              <TrendingUp className={`h-4 w-4 ${growthRateUpdating ? 'text-green-500 animate-bounce' : 'text-green-600'}`} />
              <div className={`w-2 h-2 bg-green-500 rounded-full ${growthRateUpdating ? 'animate-ping' : 'animate-pulse'}`}></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-1 ${growthRateUpdating ? 'scale-105 transition-transform duration-300' : ''}`}>
              {stats.growthRate > 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              {Math.abs(stats.growthRate)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs last month • {growthRateUpdating ? 'Updating...' : 'Updates in real-time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            <Database className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dataSources}</div>
            <p className="text-xs text-muted-foreground">
              Connected sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Processing</CardTitle>
            <Zap className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingJobs}</div>
            <p className="text-xs text-muted-foreground">
              Active jobs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sentiment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Positive Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.positiveSentiment}</div>
            <Progress value={stats.totalInsights > 0 ? (stats.positiveSentiment / stats.totalInsights) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Negative Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.negativeSentiment}</div>
            <Progress value={stats.totalInsights > 0 ? (stats.negativeSentiment / stats.totalInsights) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              Neutral Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.neutralSentiment}</div>
            <Progress value={stats.totalInsights > 0 ? (stats.neutralSentiment / stats.totalInsights) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Button onClick={handleUploadData} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Data
        </Button>
        <Button onClick={handleAnalyzeNow} variant="outline" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          Analyze Now
        </Button>
        <Button onClick={handleGenerateReport} variant="outline" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Recent Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Recent AI Insights
            </CardTitle>
            <CardDescription>
              Latest insights generated from your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insights.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {insights.slice(0, 5).map((insight) => (
                  <div key={insight.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getSentimentColor(insight.sentiment)}>
                        {insight.sentiment}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(insight.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{insight.summary}</p>
                    {insight.key_themes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {insight.key_themes.slice(0, 3).map((theme, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {theme}
                          </span>
                        ))}
                      </div>
                    )}
                    {insight.source_file && (
                      <div className="text-xs text-gray-500">
                        📎 {insight.source_file}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No insights yet</p>
                <p className="text-sm">Upload some data to get started!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Jobs Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              AI Processing Jobs
            </CardTitle>
            <CardDescription>
              Real-time status of analysis jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {aiJobs.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {aiJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {job.status === 'processing' && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                        {job.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {job.status === 'failed' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(job.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Input length: {job.input_length} characters
                    </div>
                    {job.completed_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        Completed: {new Date(job.completed_at).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No active jobs</p>
                <p className="text-sm">Jobs will appear here when processing</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Sources */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Connected Data Sources
          </CardTitle>
          <CardDescription>
            Files and data sources ready for analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataSources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataSources.map((source) => (
                <div key={source.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{source.name}</span>
                    </div>
                    <Badge className="text-green-600 bg-green-100">
                      {source.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Type: {source.type.toUpperCase()}
                  </div>
                  {source.file_size && (
                    <div className="text-sm text-gray-600">
                      Size: {(source.file_size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Added: {new Date(source.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No data sources connected</p>
              <p className="text-sm">Upload files to start analyzing</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;