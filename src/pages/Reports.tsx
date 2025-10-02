import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useSubscription } from '@/hooks/useSubscription';
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
  CalendarDays,
  SortAsc,
  SortDesc,
  FileDown,
  FileText as FileTextIcon,
  Users,
  Hash,
  Loader2,
  Rocket,
  CheckCircle,
  AlertCircle,
  Minus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Lock
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
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Types
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

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
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

export default function Reports() {
  const { user } = useAuth();
  const { plan, isActive, isTrialExpired, daysLeft } = useSubscription();
  
  // State management
  const [insights, setInsights] = useState<InsightResult[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState<InsightResult | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Load insights data with pagination
  const loadInsightsData = useCallback(async (page: number = 1) => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Calculate offset for pagination
      const offset = (page - 1) * pagination.itemsPerPage;
      
      // Build query with filters
      let query = supabase
        .from('insights_results')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Apply date range filter
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

      // Apply search filter
      if (searchTerm) {
        query = query.or(`file_name.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`);
      }

      // Apply sorting and pagination
      query = query
        .order('created_at', { ascending: sortOrder === 'oldest' })
        .range(offset, offset + pagination.itemsPerPage - 1);

      const { data: insightsData, error: insightsError, count } = await query;

      if (insightsError) {
        console.error('Error loading insights:', insightsError);
        toast.error('Failed to load insights');
        return;
      }

      setInsights(insightsData || []);
      
      // Update pagination info
      const totalPages = Math.ceil((count || 0) / pagination.itemsPerPage);
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalPages,
        totalItems: count || 0,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }));

    } catch (error) {
      console.error('Error in loadInsightsData:', error);
      toast.error('Failed to load insights data');
    } finally {
      setLoading(false);
    }
  }, [user, sortOrder, dateRange, searchTerm, pagination.itemsPerPage]);

  // Calculate analytics data
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

    // Calculate average performance score
    const totalScore = insights.reduce((sum, insight) => sum + insight.performance.score, 0);
    const averageScore = Math.round(totalScore / insights.length);

    // Calculate sentiment breakdown
    const sentimentBreakdown = insights.reduce(
      (acc, insight) => ({
        positive: acc.positive + insight.sentiment.positive,
        negative: acc.negative + insight.sentiment.negative,
        neutral: acc.neutral + insight.sentiment.neutral,
      }),
      { positive: 0, negative: 0, neutral: 0 }
    );

    // Calculate insights over time (last 30 days)
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

    // Calculate top themes
    const themeCounts: Record<string, number> = {};
    insights.forEach(insight => {
      insight.key_themes.forEach(theme => {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      });
    });

    const topThemes = Object.entries(themeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));

    return {
      totalInsights: insights.length,
      averageScore,
      sentimentBreakdown,
      insightsOverTime: insightsOverTimeArray,
      topThemes,
    };
  }, [insights]);

  // Update analytics data when data changes
  useEffect(() => {
    setAnalyticsData(calculateAnalytics);
  }, [calculateAnalytics]);

  // Load insights on component mount and when dependencies change
  useEffect(() => {
    loadInsightsData(1);
  }, [loadInsightsData]);

  // Set up real-time subscription for insights
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('insights-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'insights_results',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch insights when changes occur
          loadInsightsData(pagination.currentPage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadInsightsData, pagination.currentPage]);

  // Pagination functions
  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadInsightsData(page);
    }
  };

  const goToNextPage = () => {
    if (pagination.hasNextPage) {
      goToPage(pagination.currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (pagination.hasPreviousPage) {
      goToPage(pagination.currentPage - 1);
    }
  };

  // Check if user has access to view insights
  const hasAccessToInsights = () => {
    // During free trial or with active Business Plan → show full report history
    if (plan === 'business' && isActive) return true;
    if (plan === 'trial' && !isTrialExpired) return true;
    
    // If trial is expired and no subscription is active → block viewing of new insights
    return false;
  };

  // Check if user can generate new insights
  const canGenerateNewInsights = () => {
    return hasAccessToInsights();
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get insights preview (first 150 chars)
  const getInsightsPreview = (summary: string) => {
    return summary ? summary.substring(0, 150) + '...' : 'No summary available';
  };

  // Calculate word count
  const getWordCount = (text: string) => {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  };

  // Export to PDF
  const exportToPDF = async (insight: InsightResult) => {
    setExportingPDF(true);
    try {
      toast.info('Generating PDF...', {
        description: 'Please wait while we create your report.'
      });

      // Create a temporary div for PDF generation
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '800px';
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.padding = '40px';
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      pdfContainer.style.color = '#333';
      document.body.appendChild(pdfContainer);

      // Generate PDF content
      pdfContainer.innerHTML = `
        <div style="margin-bottom: 30px;">
          <h1 style="color: #1f2937; font-size: 28px; margin-bottom: 10px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px;">
            ${insight.file_name}
          </h1>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
            Generated on ${formatDate(insight.created_at)} • 
            File ID: ${insight.file_id}
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 15px;">
            Summary
          </h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            ${insight.summary}
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #10b981; padding-left: 15px;">
            Key Themes
          </h2>
          <ul style="font-size: 14px; line-height: 1.6; color: #374151; padding-left: 20px;">
            ${insight.key_themes.map(theme => 
              `<li style="margin-bottom: 8px;">${theme}</li>`
            ).join('')}
          </ul>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #f59e0b; padding-left: 15px;">
            Suggested Actions
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            ${insight.suggested_actions.map((action, index) => `
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background-color: #f9fafb;">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <div style="width: 24px; height: 24px; background-color: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">
                    ${index + 1}
                  </div>
                  <span style="font-weight: 600; color: #1f2937;">Action ${index + 1}</span>
                </div>
                <p style="color: #374151; line-height: 1.5;">${action}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #8b5cf6; padding-left: 15px;">
            Performance Metrics
          </h2>
          <div style="margin-bottom: 20px;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 600; color: #1f2937; margin-right: 15px;">Overall Score:</span>
              <div style="width: 100px; height: 20px; background-color: #e5e7eb; border-radius: 10px; overflow: hidden;">
                <div style="width: ${insight.performance.score}%; height: 100%; background-color: #10b981;"></div>
              </div>
              <span style="margin-left: 10px; font-weight: 600; color: #1f2937;">${insight.performance.score}/100</span>
            </div>
          </div>
          <ul style="font-size: 14px; line-height: 1.6; color: #374151; padding-left: 20px;">
            ${insight.performance.metrics.map(metric => 
              `<li style="margin-bottom: 8px;">${metric}</li>`
            ).join('')}
          </ul>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #ec4899; padding-left: 15px;">
            Sentiment Analysis
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
            <div style="text-align: center; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
              <div style="font-size: 24px; font-weight: bold; color: #16a34a; margin-bottom: 5px;">${insight.sentiment.positive}%</div>
              <div style="color: #16a34a; font-weight: 500;">Positive</div>
            </div>
            <div style="text-align: center; padding: 20px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fde68a;">
              <div style="font-size: 24px; font-weight: bold; color: #ca8a04; margin-bottom: 5px;">${insight.sentiment.neutral}%</div>
              <div style="color: #ca8a04; font-weight: 500;">Neutral</div>
            </div>
            <div style="text-align: center; padding: 20px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
              <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 5px;">${insight.sentiment.negative}%</div>
              <div style="color: #dc2626; font-weight: 500;">Negative</div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <span style="background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 16px; font-size: 14px;">
              Overall: ${insight.sentiment.overall}
            </span>
          </div>
        </div>
      `;

      // Generate PDF
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      pdf.save(`insights-report-${insight.id}-${new Date(insight.created_at).toISOString().split('T')[0]}.pdf`);

      // Cleanup
      document.body.removeChild(pdfContainer);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  // Export to CSV
  const exportToCSV = async (insight: InsightResult) => {
    setExportingCSV(true);
    try {
      const csvContent = [
        ['Field', 'Value'],
        ['File Name', insight.file_name],
        ['File ID', insight.file_id],
        ['Generated Date', formatDate(insight.created_at)],
        ['Summary', insight.summary],
        ['Key Themes', insight.key_themes.join('; ')],
        ['Suggested Actions', insight.suggested_actions.join('; ')],
        ['Trends', insight.trends.join('; ')],
        ['Performance Score', insight.performance.score.toString()],
        ['Performance Metrics', insight.performance.metrics.join('; ')],
        ['Sentiment - Positive', insight.sentiment.positive.toString()],
        ['Sentiment - Neutral', insight.sentiment.neutral.toString()],
        ['Sentiment - Negative', insight.sentiment.negative.toString()],
        ['Sentiment - Overall', insight.sentiment.overall],
      ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `insights-report-${insight.id}-${new Date(insight.created_at).toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  // View full insight
  const viewFullInsight = (insight: InsightResult) => {
    setSelectedInsight(insight);
    setShowViewModal(true);
  };

  // Get sentiment badge variant
  const getSentimentBadgeVariant = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'default';
      case 'negative':
        return 'destructive';
      default:
        return 'secondary';
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
              <p className="text-gray-600">Please log in to access your insights history.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Access Control Banner */}
      {!hasAccessToInsights() && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-800">Trial Expired</h3>
                <p className="text-orange-700 text-sm">
                  You must upgrade to generate new insights. Existing history remains accessible.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Insights History</h1>
          <p className="text-gray-600 mt-2">
            View and export your AI-generated insights from uploaded files
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => loadInsightsData(pagination.currentPage)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search */}
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

            {/* Date Range Filter */}
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
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

      {/* Analytics Overview */}
      {analyticsData && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="rounded-xl shadow-lg">
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

            <Card className="rounded-xl shadow-lg">
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

            <Card className="rounded-xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Positive Sentiment</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analyticsData.sentimentBreakdown.positive}%</div>
                <p className="text-xs text-muted-foreground">
                  Average positive sentiment
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Themes</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.topThemes.length}</div>
                <p className="text-xs text-muted-foreground">
                  Unique themes identified
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Themes */}
            <Card className="rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Top Themes</span>
                </CardTitle>
                <CardDescription>
                  Most frequently identified themes across insights
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
                      <Tooltip formatter={(value: any) => [value, 'Occurrences']} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <Target className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>No theme data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sentiment Analysis */}
            <Card className="rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Sentiment Breakdown</span>
                </CardTitle>
                <CardDescription>
                  Average sentiment distribution across insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.sentimentBreakdown.positive > 0 || analyticsData.sentimentBreakdown.negative > 0 || analyticsData.sentimentBreakdown.neutral > 0 ? (
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
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>No sentiment data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insights Over Time */}
            <Card className="rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Insights Over Time (30 days)</span>
                </CardTitle>
                <CardDescription>
                  Daily insights generation over the last 30 days
                </CardDescription>
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
                        formatter={(value: any) => [value, 'Insights Count']}
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
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>No insights data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Score Distribution */}
            <Card className="rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Performance Score Distribution</span>
                </CardTitle>
                <CardDescription>
                  Distribution of performance scores across insights
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
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-semibold text-green-600">
                          {insights.filter(i => i.performance.score >= 80).length}
                        </div>
                        <div className="text-xs text-green-600">High (80+)</div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="text-lg font-semibold text-yellow-600">
                          {insights.filter(i => i.performance.score >= 60 && i.performance.score < 80).length}
                        </div>
                        <div className="text-xs text-yellow-600">Medium (60-79)</div>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-semibold text-red-600">
                          {insights.filter(i => i.performance.score < 60).length}
                        </div>
                          <div className="text-xs text-red-600">Low (&lt;60)</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>No performance data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Insights Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Loading insights...</span>
        </div>
      ) : insights.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchTerm || dateRange !== 'all' ? 'No insights found' : 'No insights have been generated yet.'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || dateRange !== 'all' 
                ? 'Try adjusting your search or filters.'
                : 'Upload files to generate your first AI insights.'
              }
            </p>
            {!searchTerm && dateRange === 'all' && canGenerateNewInsights() && (
              <Button asChild>
                <a href="/insights-simple">Generate Insights</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {insights.map((insight) => (
              <Card key={insight.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {formatDate(insight.created_at)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {insight.file_name}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* File Name */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2 truncate" title={insight.file_name}>
                      {insight.file_name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {getInsightsPreview(insight.summary)}
                    </p>
                  </div>

                  {/* Performance Score */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Performance Score</h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${insight.performance.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {insight.performance.score}/100
                      </span>
                    </div>
                  </div>

                  {/* Sentiment */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Overall Sentiment</h3>
                    <Badge variant={getSentimentBadgeVariant(insight.sentiment.overall)}>
                      {insight.sentiment.overall}
                    </Badge>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewFullInsight(insight)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToPDF(insight)}
                        disabled={exportingPDF}
                        className="w-full"
                      >
                        {exportingPDF ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileTextIcon className="h-4 w-4" />
                        )}
                        PDF
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToCSV(insight)}
                        disabled={exportingCSV}
                        className="w-full"
                      >
                        {exportingCSV ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                        CSV
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                    {pagination.totalItems} insights
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={!pagination.hasPreviousPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, pagination.currentPage - 2) + i;
                        if (pageNum > pagination.totalPages) return null;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* View Full Insight Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Full Insight - {selectedInsight && formatDate(selectedInsight.created_at)}</span>
            </DialogTitle>
            <DialogDescription>
              Complete analysis of {selectedInsight?.file_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInsight && (
            <div className="space-y-6">
              {/* Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  <span>Summary</span>
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {selectedInsight.summary}
                </p>
              </div>

              {/* Key Themes */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span>Key Themes</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedInsight.key_themes.map((theme, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-700">{theme}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Actions */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Suggested Actions</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedInsight.suggested_actions.map((action, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trends */}
              {selectedInsight.trends.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <span>Trends</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedInsight.trends.map((trend, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span className="text-gray-700">{trend}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  <span>Performance Metrics</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Overall Score</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${selectedInsight.performance.score}%` }}
                        />
                      </div>
                      <span className="font-semibold">{selectedInsight.performance.score}/100</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedInsight.performance.metrics.map((metric, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{metric}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sentiment */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-pink-600" />
                  <span>Sentiment Analysis</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Overall Sentiment</span>
                    <Badge 
                      variant={getSentimentBadgeVariant(selectedInsight.sentiment.overall)}
                      className="text-sm"
                    >
                      {selectedInsight.sentiment.overall}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedInsight.sentiment.positive}%
                      </div>
                      <div className="text-sm text-gray-600">Positive</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {selectedInsight.sentiment.neutral}%
                      </div>
                      <div className="text-sm text-gray-600">Neutral</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {selectedInsight.sentiment.negative}%
                      </div>
                      <div className="text-sm text-gray-600">Negative</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span>Analytics</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {getWordCount(selectedInsight.summary)}
                    </div>
                    <div className="text-sm text-gray-600">Word Count</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedInsight.key_themes.length}
                    </div>
                    <div className="text-sm text-gray-600">Key Themes</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedInsight.suggested_actions.length}
                    </div>
                    <div className="text-sm text-gray-600">Suggested Actions</div>
                  </div>
                </div>
              </div>

              {/* Export Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Insight ID: {selectedInsight.id} • File ID: {selectedInsight.file_id}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => exportToPDF(selectedInsight)}
                    disabled={exportingPDF}
                  >
                    {exportingPDF ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileTextIcon className="h-4 w-4 mr-2" />
                    )}
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(selectedInsight)}
                    disabled={exportingCSV}
                  >
                    {exportingCSV ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4 mr-2" />
                    )}
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
