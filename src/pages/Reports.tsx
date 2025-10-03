import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useSubscription } from '@/hooks/useSubscription';
import { 
  FileText, 
  TrendingUp, 
  Lightbulb, 
  Target,
  Download,
  Search,
  RefreshCw,
  Eye,
  BarChart3,
  MessageSquare,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingDown,
  Award,
  FileDown,
  Sparkles
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Types remain the same
interface InsightResult {
  id: string;
  user_id: string;
  file_id: string;
  file_name: string;
  summary: string;
  key_themes: string[];
  suggested_actions: string[];
  trends: string[];
  performance: {
    metrics: string[];
    score: number;
  };
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
    overall: 'positive' | 'negative' | 'neutral';
  };
  created_at: string;
  updated_at: string;
}

interface AnalyticsData {
  totalInsights: number;
  averageScore: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  insightsOverTime: Array<{ date: string; count: number }>;
  topThemes: Array<{ theme: string; count: number }>;
}

export default function EnhancedReports() {
  const { user } = useAuth();
  const { plan, isActive, isTrialExpired } = useSubscription();
  
  const [insights, setInsights] = useState<InsightResult[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState<InsightResult | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);

  // Dummy benchmark data
  const GLOBAL_BENCHMARKS = {
    averageScore: 68,
    positiveRate: 55,
    negativeRate: 25,
    neutralRate: 20
  };

  const loadInsightsData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('insights_results')
        .select('*')
        .eq('user_id', user.id);

      if (dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateRange) {
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      if (searchTerm) {
        query = query.or(`file_name.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`);
      }

      query = query.order('created_at', { ascending: false });

      const { data: insightsData, error: insightsError } = await query;

      if (insightsError) {
        console.error('Error loading insights:', insightsError);
        toast.error('Failed to load insights');
        return;
      }

      setInsights(insightsData || []);

    } catch (error) {
      console.error('Error in loadInsightsData:', error);
      toast.error('Failed to load insights data');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, searchTerm]);

  const calculateAnalytics = useMemo((): AnalyticsData => {
    if (insights.length === 0) {
      return {
        totalInsights: 0,
        averageScore: 0,
        sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
        insightsOverTime: [],
        topThemes: [],
      };
    }

    const totalScore = insights.reduce((sum, insight) => sum + insight.performance.score, 0);
    const averageScore = Math.round(totalScore / insights.length);

    const sentimentBreakdown = insights.reduce(
      (acc, insight) => ({
        positive: acc.positive + insight.sentiment.positive,
        negative: acc.negative + insight.sentiment.negative,
        neutral: acc.neutral + insight.sentiment.neutral,
      }),
      { positive: 0, negative: 0, neutral: 0 }
    );

    const avgSentiment = {
      positive: Math.round(sentimentBreakdown.positive / insights.length),
      negative: Math.round(sentimentBreakdown.negative / insights.length),
      neutral: Math.round(sentimentBreakdown.neutral / insights.length)
    };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const insightsOverTime: Record<string, number> = {};
    
    insights.forEach(insight => {
      const insightDate = new Date(insight.created_at);
      if (insightDate >= thirtyDaysAgo) {
        const date = insightDate.toISOString().split('T')[0];
        insightsOverTime[date] = (insightsOverTime[date] || 0) + 1;
      }
    });

    const insightsOverTimeArray = Object.entries(insightsOverTime)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    const themeCounts: Record<string, number> = {};
    insights.forEach(insight => {
      insight.key_themes.forEach(theme => {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      });
    });

    const topThemes = Object.entries(themeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([theme, count]) => ({ theme, count }));

    return {
      totalInsights: insights.length,
      averageScore,
      sentimentBreakdown: avgSentiment,
      insightsOverTime: insightsOverTimeArray,
      topThemes,
    };
  }, [insights]);

  useEffect(() => {
    setAnalyticsData(calculateAnalytics);
  }, [calculateAnalytics]);

  useEffect(() => {
    loadInsightsData();
  }, [loadInsightsData]);

  // Filter insights
  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      if (sentimentFilter !== 'all' && insight.sentiment.overall !== sentimentFilter) {
        return false;
      }
      if (themeFilter !== 'all' && !insight.key_themes.includes(themeFilter)) {
        return false;
      }
      return true;
    });
  }, [insights, sentimentFilter, themeFilter]);

  // Calculate benchmark comparison
  const benchmarkComparison = useMemo(() => {
    if (!analyticsData) return null;

    const scorePercentile = analyticsData.averageScore > GLOBAL_BENCHMARKS.averageScore 
      ? Math.round(50 + ((analyticsData.averageScore - GLOBAL_BENCHMARKS.averageScore) / (100 - GLOBAL_BENCHMARKS.averageScore)) * 50)
      : Math.round((analyticsData.averageScore / GLOBAL_BENCHMARKS.averageScore) * 50);

    return {
      scorePercentile,
      scoreDiff: analyticsData.averageScore - GLOBAL_BENCHMARKS.averageScore,
      positiveDiff: analyticsData.sentimentBreakdown.positive - GLOBAL_BENCHMARKS.positiveRate
    };
  }, [analyticsData]);

  const exportToPDF = async (insight: InsightResult) => {
    try {
      toast.info('Generating PDF...', { description: 'Please wait while we create your report.' });

      const pdf = new jsPDF();
      const margin = 20;
      let yPos = 20;

      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(insight.file_name, margin, yPos);
      yPos += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date(insight.created_at).toLocaleDateString()}`, margin, yPos);
      yPos += 15;

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary', margin, yPos);
      yPos += 7;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const summaryLines = pdf.splitTextToSize(insight.summary, 170);
      pdf.text(summaryLines, margin, yPos);
      yPos += summaryLines.length * 5 + 10;

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Key Themes', margin, yPos);
      yPos += 7;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      insight.key_themes.forEach((theme, idx) => {
        pdf.text(`${idx + 1}. ${theme}`, margin + 5, yPos);
        yPos += 5;
      });

      pdf.save(`insight-${insight.id}.pdf`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const exportToCSV = async (insight: InsightResult) => {
    try {
      const csvContent = [
        ['Field', 'Value'],
        ['File Name', insight.file_name],
        ['Generated Date', new Date(insight.created_at).toLocaleString()],
        ['Summary', insight.summary],
        ['Key Themes', insight.key_themes.join('; ')],
        ['Performance Score', insight.performance.score.toString()],
        ['Sentiment', insight.sentiment.overall],
      ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `insight-${insight.id}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  // Empty state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (insights.length === 0 && !searchTerm && dateRange === 'all') {
    return (
      <div className="container mx-auto p-6">
        <Card className="text-center py-16">
          <CardContent>
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold mb-3">No Insights Generated Yet</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Upload your first file to generate AI-powered insights and unlock powerful analytics
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg">
                  <a href="/insights-simple">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate First Insight
                  </a>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <a href="/upload">
                    <FileText className="h-4 w-4 mr-2" />
                    Upload File
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Insights Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Analyze and export your AI-generated insights
          </p>
        </div>
        <Button variant="outline" onClick={() => loadInsightsData()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">
            History
            {insights.length > 0 && (
              <Badge variant="secondary" className="ml-2">{insights.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics with Benchmarks */}
          {analyticsData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData.totalInsights}</div>
                    <p className="text-xs text-muted-foreground">AI-generated reports</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData.averageScore}/100</div>
                    {benchmarkComparison && (
                      <div className="flex items-center text-xs mt-1">
                        {benchmarkComparison.scoreDiff >= 0 ? (
                          <>
                            <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                            <span className="text-green-600">
                              {benchmarkComparison.scoreDiff} above average
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                            <span className="text-red-600">
                              {Math.abs(benchmarkComparison.scoreDiff)} below average
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Positive Sentiment</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {analyticsData.sentimentBreakdown.positive}%
                    </div>
                    {benchmarkComparison && (
                      <p className="text-xs text-muted-foreground">
                        {benchmarkComparison.positiveDiff >= 0 ? '+' : ''}
                        {benchmarkComparison.positiveDiff}% vs benchmark
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Your Ranking</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      Top {100 - (benchmarkComparison?.scorePercentile || 50)}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Better than {benchmarkComparison?.scorePercentile || 50}% of businesses
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Themes - Clickable */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Top Themes</span>
                    </CardTitle>
                    <CardDescription>Click a theme to filter insights</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.topThemes.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={analyticsData.topThemes}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="theme" 
                            fontSize={12}
                            angle={-45}
                            textAnchor="end"
                            height={100}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip />
                          <Bar 
                            dataKey="count" 
                            fill="#3b82f6" 
                            radius={[4, 4, 0, 0]}
                            onClick={(data) => {
                              setThemeFilter(data.theme);
                              setActiveTab('history');
                              toast.success(`Filtering by theme: ${data.theme}`);
                            }}
                            cursor="pointer"
                          />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <p className="text-gray-500">No theme data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sentiment - Clickable */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5" />
                      <span>Sentiment Breakdown</span>
                    </CardTitle>
                    <CardDescription>Click a segment to filter by sentiment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Positive', value: analyticsData.sentimentBreakdown.positive, color: '#10b981' },
                            { name: 'Neutral', value: analyticsData.sentimentBreakdown.neutral, color: '#f59e0b' },
                            { name: 'Negative', value: analyticsData.sentimentBreakdown.negative, color: '#ef4444' }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          onClick={(data) => {
                            setSentimentFilter(data.name.toLowerCase() as any);
                            setActiveTab('history');
                            toast.success(`Filtering by ${data.name.toLowerCase()} sentiment`);
                          }}
                          cursor="pointer"
                        >
                          {[
                            { name: 'Positive', value: analyticsData.sentimentBreakdown.positive, color: '#10b981' },
                            { name: 'Neutral', value: analyticsData.sentimentBreakdown.neutral, color: '#f59e0b' },
                            { name: 'Negative', value: analyticsData.sentimentBreakdown.negative, color: '#ef4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Insights Over Time */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5" />
                      <span>Insights Over Time (30 days)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analyticsData.insightsOverTime.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={analyticsData.insightsOverTime}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            fontSize={12}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          />
                          <YAxis fontSize={12} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#3b82f6" 
                            fill="#3b82f6" 
                            fillOpacity={0.3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <p className="text-gray-500">No timeline data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search insights..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sentimentFilter} onValueChange={(value: any) => setSentimentFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sentiment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiments</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={themeFilter} onValueChange={setThemeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Themes</SelectItem>
                    {analyticsData?.topThemes.map(({ theme }) => (
                      <SelectItem key={theme} value={theme}>{theme}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {(sentimentFilter !== 'all' || themeFilter !== 'all') && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {sentimentFilter !== 'all' && (
                    <Badge variant="secondary" className="capitalize">
                      {sentimentFilter}
                      <button onClick={() => setSentimentFilter('all')} className="ml-1">×</button>
                    </Badge>
                  )}
                  {themeFilter !== 'all' && (
                    <Badge variant="secondary">
                      {themeFilter}
                      <button onClick={() => setThemeFilter('all')} className="ml-1">×</button>
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights List */}
          <div className="space-y-4">
            {filteredInsights.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Filter className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No insights match your filters</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSentimentFilter('all');
                      setThemeFilter('all');
                      setSearchTerm('');
                      setDateRange('all');
                    }}
                  >
                    Clear All Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredInsights.map((insight) => (
                <Card key={insight.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="cursor-pointer" onClick={() => setExpandedInsightId(
                    expandedInsightId === insight.id ? null : insight.id
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{insight.file_name}</CardTitle>
                          <Badge variant={
                            insight.sentiment.overall === 'positive' ? 'default' :
                            insight.sentiment.overall === 'negative' ? 'destructive' :
                            'secondary'
                          } className="capitalize">
                            {insight.sentiment.overall}
                          </Badge>
                        </div>
                        <CardDescription className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-3 w-3" />
                            Score: {insight.performance.score}/100
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {insight.key_themes.length} themes
                          </span>
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="sm">
                        {expandedInsightId === insight.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  {expandedInsightId === insight.id && (
                    <CardContent className="pt-0 space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Summary</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{insight.summary}</p>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Key Themes</h4>
                        <div className="flex flex-wrap gap-2">
                          {insight.key_themes.map((theme, idx) => (
                            <Badge key={idx} variant="outline">{theme}</Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Suggested Actions</h4>
                        <ul className="space-y-1 text-sm">
                          {insight.suggested_actions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Sentiment Breakdown</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                            <div className="text-2xl font-bold text-green-600">{insight.sentiment.positive}%</div>
                            <div className="text-xs text-gray-600">Positive</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="text-2xl font-bold text-gray-600">{insight.sentiment.neutral}%</div>
                            <div className="text-xs text-gray-600">Neutral</div>
                          </div>
                          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded">
                            <div className="text-2xl font-bold text-red-600">{insight.sentiment.negative}%</div>
                            <div className="text-xs text-gray-600">Negative</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t">
                        <Button variant="outline" size="sm" onClick={() => exportToPDF(insight)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportToCSV(insight)}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedInsight(insight);
                          setShowViewModal(true);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Full View
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Full View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedInsight?.file_name}</DialogTitle>
            <DialogDescription>
              Generated on {selectedInsight && new Date(selectedInsight.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInsight && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Summary</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {selectedInsight.summary}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Key Themes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedInsight.key_themes.map((theme, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                      {theme}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Suggested Actions</h3>
                <div className="space-y-2">
                  {selectedInsight.suggested_actions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Performance</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Overall Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${selectedInsight.performance.score}%` }}
                        />
                      </div>
                      <span className="font-semibold">{selectedInsight.performance.score}/100</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedInsight.performance.metrics.map((metric, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        {metric}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => exportToPDF(selectedInsight)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => exportToCSV(selectedInsight)}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
