import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { 
  FileText, 
  Clock, 
  TrendingUp, 
  Lightbulb, 
  Target,
  Download,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Eye,
  BarChart3,
  MessageSquare,
  SortAsc,
  SortDesc,
  FileDown,
  Loader2,
  ChevronDown,
  ChevronUp
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
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Insight {
  id: string;
  user_id: string;
  title: string;
  details: string;
  feedback_count: number;
  created_at: string;
}

interface AnalyticsData {
  totalInsights: number;
  averageScore: number;
  positiveSentiment: number;
  topThemes: Array<{ theme: string; count: number }>;
  sentimentBreakdown: Array<{ name: string; value: number; color: string }>;
  insightsOverTime: Array<{ date: string; count: number }>;
  scoreDistribution: Array<{ range: string; count: number }>;
}

export default function DynamicReports() {
  const { user } = useAuth();
  
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);

  // Load insights from Supabase
  const loadInsights = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      let query = supabase
        .from('insights')
        .select('*')
        .eq('user_id', user.id);

      // Apply date filter
      if (dateRange !== 'all') {
        const now = new Date();
        const daysAgo = dateRange === '7d' ? 7 : 30;
        const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,details.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      query = query.order('created_at', { ascending: sortOrder === 'oldest' });

      const { data, error } = await query;

      if (error) {
        console.error('Error loading insights:', error);
        toast.error('Failed to load insights');
        return;
      }

      setInsights(data || []);
    } catch (error) {
      console.error('Error in loadInsights:', error);
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, searchTerm, sortOrder]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  // Calculate analytics data
  const analyticsData = useMemo((): AnalyticsData => {
    if (insights.length === 0) {
      return {
        totalInsights: 0,
        averageScore: 0,
        positiveSentiment: 0,
        topThemes: [],
        sentimentBreakdown: [],
        insightsOverTime: [],
        scoreDistribution: []
      };
    }

    // Parse insights details to extract metrics
    const parsedInsights = insights.map(insight => {
      const details = insight.details || '';
      
      // Extract score (format: "Performance Score: XX/100")
      const scoreMatch = details.match(/Performance Score:\s*(\d+)\/100/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
      
      // Extract sentiment (format: "Sentiment: positive")
      const sentimentMatch = details.match(/Sentiment:\s*(\w+)/i);
      const sentiment = sentimentMatch ? sentimentMatch[1].toLowerCase() : 'neutral';
      
      // Extract themes (format: "Key Themes:\n• Theme 1\n• Theme 2")
      const themesMatch = details.match(/Key Themes:\n([\s\S]*?)(?:\n\n|$)/);
      const themes: string[] = [];
      if (themesMatch) {
        const themeLines = themesMatch[1].split('\n');
        themeLines.forEach(line => {
          const theme = line.replace(/^[•\-\*]\s*/, '').trim();
          if (theme) themes.push(theme);
        });
      }
      
      return { ...insight, score, sentiment, themes };
    });

    // Calculate total insights
    const totalInsights = insights.length;

    // Calculate average score
    const totalScore = parsedInsights.reduce((sum, i) => sum + i.score, 0);
    const averageScore = Math.round(totalScore / totalInsights);

    // Calculate positive sentiment percentage
    const positiveCount = parsedInsights.filter(i => i.sentiment === 'positive').length;
    const positiveSentiment = Math.round((positiveCount / totalInsights) * 100);

    // Calculate top themes
    const themeCounts: Record<string, number> = {};
    parsedInsights.forEach(insight => {
      insight.themes.forEach(theme => {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      });
    });
    const topThemes = Object.entries(themeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));

    // Calculate sentiment breakdown
    const sentimentCounts = {
      positive: parsedInsights.filter(i => i.sentiment === 'positive').length,
      neutral: parsedInsights.filter(i => i.sentiment === 'neutral').length,
      negative: parsedInsights.filter(i => i.sentiment === 'negative').length
    };
    const sentimentBreakdown = [
      { name: 'Positive', value: sentimentCounts.positive, color: '#10b981' },
      { name: 'Neutral', value: sentimentCounts.neutral, color: '#f59e0b' },
      { name: 'Negative', value: sentimentCounts.negative, color: '#ef4444' }
    ];

    // Calculate insights over time (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const insightsOverTimeMap: Record<string, number> = {};
    
    parsedInsights.forEach(insight => {
      const date = new Date(insight.created_at);
      if (date >= thirtyDaysAgo) {
        const dateStr = date.toISOString().split('T')[0];
        insightsOverTimeMap[dateStr] = (insightsOverTimeMap[dateStr] || 0) + 1;
      }
    });

    const insightsOverTime = Object.entries(insightsOverTimeMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Calculate score distribution
    const scoreRanges = {
      'High (80+)': parsedInsights.filter(i => i.score >= 80).length,
      'Medium (60-79)': parsedInsights.filter(i => i.score >= 60 && i.score < 80).length,
      'Low (<60)': parsedInsights.filter(i => i.score < 60).length
    };
    const scoreDistribution = Object.entries(scoreRanges).map(([range, count]) => ({
      range,
      count
    }));

    return {
      totalInsights,
      averageScore,
      positiveSentiment,
      topThemes,
      sentimentBreakdown,
      insightsOverTime,
      scoreDistribution
    };
  }, [insights]);

  // Export to PDF
  const exportToPDF = () => {
    try {
      toast.info('Generating PDF...', { description: 'Please wait' });

      const pdf = new jsPDF();
      const margin = 20;
      let yPos = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AI Insights Report', margin, yPos);
      yPos += 15;

      // Date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPos);
      yPos += 15;

      // Metrics
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Key Metrics', margin, yPos);
      yPos += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Insights: ${analyticsData.totalInsights}`, margin, yPos);
      yPos += 7;
      pdf.text(`Average Score: ${analyticsData.averageScore}/100`, margin, yPos);
      yPos += 7;
      pdf.text(`Positive Sentiment: ${analyticsData.positiveSentiment}%`, margin, yPos);
      yPos += 15;

      // Insights list
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Recent Insights', margin, yPos);
      yPos += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      insights.slice(0, 10).forEach((insight, idx) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
        pdf.text(`${idx + 1}. ${insight.title}`, margin, yPos);
        yPos += 5;
        pdf.text(`   ${new Date(insight.created_at).toLocaleDateString()}`, margin, yPos);
        yPos += 10;
      });

      pdf.save(`insights-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    try {
      const headers = ['Title', 'Details', 'Feedback Count', 'Created Date'];
      const rows = insights.map(insight => [
        insight.title,
        insight.details.replace(/\n/g, ' ').replace(/"/g, '""'),
        insight.feedback_count || 0,
        new Date(insight.created_at).toLocaleString()
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `insights-${new Date().toISOString().split('T')[0]}.csv`);
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to access your insights.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Insights History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View and export your AI-generated insights from uploaded files
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={loadInsights}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search insights by file name or summary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  <div className="flex items-center space-x-2">
                    <SortDesc className="h-4 w-4" />
                    <span>Newest First</span>
                  </div>
                </SelectItem>
                <SelectItem value="oldest">
                  <div className="flex items-center space-x-2">
                    <SortAsc className="h-4 w-4" />
                    <span>Oldest First</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {insights.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No insights have been generated yet.
            </h3>
            <p className="text-gray-600 mb-4">
              Upload files to generate your first AI insights.
            </p>
            <Button asChild>
              <a href="/insights-simple">Generate Insights</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalInsights}</div>
                <p className="text-xs text-muted-foreground">
                  AI-generated insights
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.averageScore}/100</div>
                <p className="text-xs text-muted-foreground">
                  Performance score
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Positive Sentiment</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analyticsData.positiveSentiment}%</div>
                <p className="text-xs text-muted-foreground">
                  Average positive sentiment
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Themes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Top Themes</span>
                </CardTitle>
                <CardDescription>
                  Most frequently identified themes
                </CardDescription>
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
                        height={80}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <p>No theme data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sentiment Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Sentiment Breakdown</span>
                </CardTitle>
                <CardDescription>
                  Distribution across insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.sentimentBreakdown.some(s => s.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={analyticsData.sentimentBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {analyticsData.sentimentBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <p>No sentiment data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Insights Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Insights Over Time (30 days)</span>
                </CardTitle>
                <CardDescription>
                  Daily insights generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.insightsOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={analyticsData.insightsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        fontSize={12}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <p>No timeline data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Performance Score Distribution</span>
                </CardTitle>
                <CardDescription>
                  Distribution of scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.totalInsights > 0 ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{analyticsData.averageScore}</div>
                      <div className="text-sm text-gray-600">Average Score</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {analyticsData.scoreDistribution.map((item, idx) => (
                        <div key={idx} className={`p-3 rounded-lg ${
                          item.range.startsWith('High') ? 'bg-green-50' :
                          item.range.startsWith('Medium') ? 'bg-yellow-50' :
                          'bg-red-50'
                        }`}>
                          <div className={`text-lg font-semibold ${
                            item.range.startsWith('High') ? 'text-green-600' :
                            item.range.startsWith('Medium') ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {item.count}
                          </div>
                          <div className={`text-xs ${
                            item.range.startsWith('High') ? 'text-green-600' :
                            item.range.startsWith('Medium') ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {item.range}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <p>No performance data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Export Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* History Tab - Insights List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Insights</CardTitle>
              <CardDescription>
                Chronological list of AI-generated insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setExpandedInsightId(
                      expandedInsightId === insight.id ? null : insight.id
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{insight.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(insight.created_at).toLocaleDateString()}</span>
                          </span>
                          {insight.feedback_count > 0 && (
                            <span className="flex items-center space-x-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{insight.feedback_count} feedbacks</span>
                            </span>
                          )}
                        </div>
                        {expandedInsightId === insight.id && (
                          <div className="mt-3 pt-3 border-t">
                            <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                              {insight.details}
                            </pre>
                          </div>
                        )}
                      </div>
                      {expandedInsightId === insight.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
