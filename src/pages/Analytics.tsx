import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Brain,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Target,
  ArrowUpRight,
  Users,
  Activity,
  Zap,
  Clock,
  Database,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  DollarSign,
  Building,
  Globe,
  Rocket,
  Shield,
  Award,
  PieChart as PieChartIcon,
  Trash2,
  Download,
  FileDown,
  Calendar,
  Filter,
  Play,
  Pause,
  Square,
  RotateCcw,
  Eye,
  EyeOff,
  Settings,
  BarChart4,
  LineChart,
  Scatter,
  PieChart
} from 'lucide-react';

import {
  BarChart as RechartsBarChart,
  Bar,
  PieChart,
  Cell,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

interface AnalyticsData {
  id: string;
  executive_summary: string;
  key_insights: string[];
  trends: string[];
  performance_metrics: {
    positive: number;
    negative: number;
    neutral: number;
    total_insights: number;
    average_confidence: number;
    data_quality_score: number;
  };
  recommended_actions: string[];
  sentiment_analysis: {
    overall_sentiment: 'positive' | 'negative' | 'neutral';
    sentiment_trend: 'improving' | 'declining' | 'stable';
    key_positive_themes: string[];
    key_negative_themes: string[];
  };
  business_impact: {
    strategic_value: number;
    risk_level: 'low' | 'medium' | 'high';
    opportunities: string[];
    threats: string[];
  };
  real_time_metrics: {
    processing_time: number;
    data_freshness: string;
    accuracy_score: number;
  };
  generated_at: string;
  analysis_type: string;
  time_range: string;
  insights_analyzed: number;
}

interface AnalyticsHistoryItem {
  id: string;
  user_id: string;
  analytics_data: AnalyticsData;
  analysis_type: string;
  time_range: string;
  insights_count: number;
  created_at: string;
}

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const { checkUsage, incrementUsage } = useUsageTracking();
  
  const [currentAnalytics, setCurrentAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsHistory, setAnalyticsHistory] = useState<AnalyticsHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<'comprehensive' | 'sentiment' | 'trends' | 'performance'>('comprehensive');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | 'week' | 'month' | 'quarter'>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'json' | 'csv' | 'pdf' | 'excel'>('json');
  const [exportLoading, setExportLoading] = useState(false);
  
  const realTimeInterval = useRef<NodeJS.Timeout | null>(null);
  const insightsData = useRef<any[]>([]);

  // Load insights data from localStorage (from insights-simple page)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('insightsHistory');
      if (saved) {
        insightsData.current = JSON.parse(saved);
      }
    } catch (err) {
      console.error('Failed to load insights data:', err);
    }
  }, []);

  // Load analytics history
  const loadAnalyticsHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('analytics_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalyticsHistory(data || []);
    } catch (error) {
      console.error('Error loading analytics history:', error);
      toast.error('Failed to load analytics history');
    }
  }, [user]);

  useEffect(() => {
    loadAnalyticsHistory();
  }, [loadAnalyticsHistory]);

  // Real-time analytics generation
  const generateAnalytics = useCallback(async () => {
    if (!user || insightsData.current.length === 0) {
      toast.error('No insights data available for analysis');
      return;
    }

    // Check usage limits
    const canAnalyze = await checkUsage('analytics', 1);
    if (!canAnalyze) {
      toast.error('Analytics limit reached. Please upgrade your plan.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/generateAnalytics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            insights_data: insightsData.current,
            analysis_type: selectedAnalysisType,
            time_range: selectedTimeRange
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const analytics = await response.json();
      
      if (analytics.error) {
        throw new Error(analytics.error);
      }

      setCurrentAnalytics(analytics);
      
      // Increment usage after successful analysis
      await incrementUsage('analytics', 1);
      
      // Reload history
      await loadAnalyticsHistory();

      toast.success('Analytics generated successfully!', {
        description: `Analyzed ${analytics.insights_analyzed} insights with ${analytics.real_time_metrics.accuracy_score}% accuracy`
      });

    } catch (error) {
      console.error('Error generating analytics:', error);
      toast.error('Failed to generate analytics');
    } finally {
      setLoading(false);
    }
  }, [user, selectedAnalysisType, selectedTimeRange, checkUsage, incrementUsage, loadAnalyticsHistory]);

  // Real-time mode
  useEffect(() => {
    if (realTimeMode && autoRefresh) {
      realTimeInterval.current = setInterval(() => {
        generateAnalytics();
      }, 30000); // Refresh every 30 seconds
    } else if (realTimeInterval.current) {
      clearInterval(realTimeInterval.current);
      realTimeInterval.current = null;
    }

    return () => {
      if (realTimeInterval.current) {
        clearInterval(realTimeInterval.current);
      }
    };
  }, [realTimeMode, autoRefresh, generateAnalytics]);

  // Delete analytics
  const deleteAnalytics = async (analyticsId?: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/deleteAnalytics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`,
          },
          body: JSON.stringify({
            analytics_id: analyticsId,
            delete_type: analyticsId ? 'single' : 'all'
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast.success(result.message);
      
      // Reload history
      await loadAnalyticsHistory();
      
      // Clear current analytics if it was deleted
      if (analyticsId && currentAnalytics?.id === analyticsId) {
        setCurrentAnalytics(null);
      }

    } catch (error) {
      console.error('Error deleting analytics:', error);
      toast.error('Failed to delete analytics');
    }
  };

  // Export analytics
  const exportAnalytics = async (analyticsId?: string) => {
    if (!user) return;

    setExportLoading(true);

    try {
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/exportAnalytics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`,
          },
          body: JSON.stringify({
            analytics_id: analyticsId,
            export_type: exportType,
            time_range: selectedTimeRange
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Download the file
      const blob = new Blob([result.content], { type: result.content_type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.file_name;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Analytics exported successfully! (${result.records_count} records)`);
      setExportDialogOpen(false);

    } catch (error) {
      console.error('Error exporting analytics:', error);
      toast.error('Failed to export analytics');
    } finally {
      setExportLoading(false);
    }
  };

  // Chart data preparation
  const prepareChartData = () => {
    if (!currentAnalytics) return [];

    return [
      { name: 'Positive', value: currentAnalytics.performance_metrics.positive, color: '#10b981' },
      { name: 'Negative', value: currentAnalytics.performance_metrics.negative, color: '#ef4444' },
      { name: 'Neutral', value: currentAnalytics.performance_metrics.neutral, color: '#6b7280' },
    ];
  };

  const prepareTrendData = () => {
    if (!analyticsHistory.length) return [];

    return analyticsHistory.slice(0, 10).map(item => ({
      date: new Date(item.created_at).toLocaleDateString(),
      strategic_value: item.analytics_data.business_impact.strategic_value,
      accuracy: item.analytics_data.real_time_metrics.accuracy_score,
      insights_count: item.insights_count
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Real-Time Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered analytics with Gemini integration
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={realTimeMode ? "default" : "outline"}
            size="sm"
            onClick={() => setRealTimeMode(!realTimeMode)}
          >
            {realTimeMode ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
            {realTimeMode ? 'Real-time' : 'Static'}
          </Button>
          {realTimeMode && (
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Auto-refresh
            </Button>
          )}
          <Button onClick={generateAnalytics} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Generate
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Analytics Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Analysis Type</label>
              <Select value={selectedAnalysisType} onValueChange={(value: any) => setSelectedAnalysisType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  <SelectItem value="sentiment">Sentiment</SelectItem>
                  <SelectItem value="trends">Trends</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Time Range</label>
              <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => setShowHistory(!showHistory)}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                {showHistory ? 'Hide' : 'Show'} History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics History */}
      {showHistory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Analytics History</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportDialogOpen(true)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteAnalytics()}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {analyticsHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.analysis_type} Analysis</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()} • {item.insights_count} insights
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentAnalytics(item.analytics_data)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAnalytics(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {analyticsHistory.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No analytics history found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Analytics Display */}
      {currentAnalytics && (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Strategic Value</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentAnalytics.business_impact.strategic_value}/100</div>
                <p className="text-xs text-muted-foreground">
                  <TrendingUp className="inline h-3 w-3 text-green-500" /> High impact
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accuracy Score</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentAnalytics.real_time_metrics.accuracy_score}%</div>
                <p className="text-xs text-muted-foreground">
                  <Clock className="inline h-3 w-3 text-blue-500" /> Real-time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{currentAnalytics.business_impact.risk_level}</div>
                <p className="text-xs text-muted-foreground">
                  <Shield className="inline h-3 w-3 text-orange-500" /> Assessment
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentAnalytics.real_time_metrics.processing_time}s</div>
                <p className="text-xs text-muted-foreground">
                  <Activity className="inline h-3 w-3 text-purple-500" /> Fast
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{currentAnalytics.executive_summary}</p>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Distribution</CardTitle>
                <CardDescription>Breakdown of insights by sentiment</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={prepareChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Strategic Value Trend</CardTitle>
                <CardDescription>Historical strategic value progression</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={prepareTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="strategic_value" stroke="#3b82f6" name="Strategic Value" />
                    <Line type="monotone" dataKey="accuracy" stroke="#10b981" name="Accuracy" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Key Insights and Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentAnalytics.key_insights.map((insight, index) => (
                    <li key={index} className="flex items-start">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommended Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {currentAnalytics.recommended_actions.map((action, index) => (
                    <li key={index} className="flex items-start">
                      <Rocket className="h-4 w-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{action}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Business Impact */}
          <Card>
            <CardHeader>
              <CardTitle>Business Impact Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Opportunities</h4>
                  <ul className="space-y-1">
                    {currentAnalytics.business_impact.opportunities.map((opportunity, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <TrendingUp className="h-3 w-3 text-green-500 mr-2" />
                        {opportunity}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Threats</h4>
                  <ul className="space-y-1">
                    {currentAnalytics.business_impact.threats.map((threat, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <AlertTriangle className="h-3 w-3 text-red-500 mr-2" />
                        {threat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Analytics</DialogTitle>
            <DialogDescription>
              Choose the format and scope for your analytics export.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Export Format</label>
              <Select value={exportType} onValueChange={(value: any) => setExportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => exportAnalytics()} disabled={exportLoading}>
              {exportLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Analytics;
