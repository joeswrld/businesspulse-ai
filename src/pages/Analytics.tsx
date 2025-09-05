import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  BarChart3, 
  FileText, 
  Loader2, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Users,
  MessageSquare,
  Target,
  Calendar,
  Filter,
  Search,
  Download,
  FileDown,
  FileText as FileTextIcon,
  Activity,
  PieChart,
  BarChart,
  LineChart,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
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

// Types
interface Feedback {
  id: string;
  project_id: string;
  name: string;
  email: string;
  message: string;
  timestamp: string;
  status: 'new' | 'reviewed' | 'resolved';
}

interface AnalyticsData {
  totalFeedback: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  avgSentimentScore: number;
  topTheme: string;
  statusDistribution: {
    new: number;
    reviewed: number;
    resolved: number;
  };
  feedbackVolume: Array<{
    date: string;
    count: number;
  }>;
  topThemes: Array<{
    theme: string;
    count: number;
  }>;
  sentimentTrend: {
    currentPeriod: number;
    previousPeriod: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export default function Analytics() {
  const { user } = useAuth();
  
  // State management
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  // Load user's feedbacks
  const loadFeedbacks = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's project IDs from feedback_settings
      const { data: projectSettings, error: projectError } = await (supabase as any)
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id);

      if (projectError) {
        console.error('Error loading project settings:', projectError);
        toast.error('Failed to load project settings');
        return;
      }

      if (!projectSettings || projectSettings.length === 0) {
        setFeedbacks([]);
        return;
      }

      const projectIds = projectSettings?.map((setting: any) => setting.project_id).filter(Boolean) || [];

      // Get feedbacks for user's projects
      const { data: feedbacksData, error: feedbacksError } = await (supabase as any)
        .from('feedbacks')
        .select('*')
        .in('project_id', projectIds)
        .order('timestamp', { ascending: false });

      if (feedbacksError) {
        console.error('Error loading feedbacks:', feedbacksError);
        toast.error('Failed to load feedbacks');
        return;
      }

      setFeedbacks((feedbacksData || []) as any);
    } catch (error) {
      console.error('Error in loadFeedbacks:', error);
      toast.error('Failed to load feedbacks');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load feedbacks on component mount
  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  // Analyze sentiment from message content
  const analyzeSentiment = (message: string): 'positive' | 'negative' | 'neutral' => {
    const positiveWords = [
      'great', 'good', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'satisfied',
      'perfect', 'awesome', 'outstanding', 'brilliant', 'superb', 'terrific', 'pleased', 'impressed', 'smooth',
      'fast', 'easy', 'intuitive', 'beautiful', 'clean', 'modern', 'helpful', 'supportive', 'responsive'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'annoyed', 'disappointed',
      'broken', 'slow', 'difficult', 'confusing', 'ugly', 'cluttered', 'buggy', 'crash', 'error', 'fail',
      'useless', 'waste', 'problem', 'issue', 'complaint', 'unhappy', 'dissatisfied', 'poor', 'weak'
    ];

    const messageLower = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  };

  // Extract themes from message content
  const extractThemes = (message: string): string[] => {
    const commonThemes = [
      'user interface', 'ui', 'ux', 'design', 'performance', 'speed', 'loading', 'bug', 'error', 'crash',
      'mobile', 'responsive', 'navigation', 'search', 'filter', 'dashboard', 'report', 'export', 'import',
      'notification', 'email', 'login', 'authentication', 'security', 'privacy', 'data', 'storage',
      'customer support', 'help', 'documentation', 'tutorial', 'onboarding', 'feature', 'functionality',
      'pricing', 'billing', 'subscription', 'upgrade', 'downgrade', 'integration', 'api', 'webhook'
    ];

    const messageLower = message.toLowerCase();
    const foundThemes = commonThemes.filter(theme => messageLower.includes(theme));
    
    // If no common themes found, try to extract from message content
    if (foundThemes.length === 0) {
      const words = messageLower.split(/\s+/).filter(word => word.length > 3);
      const uniqueWords = [...new Set(words)].slice(0, 3);
      return uniqueWords.map(word => word.charAt(0).toUpperCase() + word.slice(1));
    }

    return foundThemes.slice(0, 3);
  };

  // Calculate analytics data
  const analyticsData = useMemo((): AnalyticsData => {
    if (feedbacks.length === 0) {
      return {
        totalFeedback: 0,
        sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
        avgSentimentScore: 0,
        topTheme: 'No data',
        statusDistribution: { new: 0, reviewed: 0, resolved: 0 },
        feedbackVolume: [],
        topThemes: [],
        sentimentTrend: { currentPeriod: 0, previousPeriod: 0, change: 0, trend: 'stable' }
      };
    }

    // Filter feedbacks based on date range
    const now = new Date();
    const filteredFeedbacks = feedbacks.filter(feedback => {
      const feedbackDate = new Date(feedback.timestamp);
      const diffTime = Math.abs(now.getTime() - feedbackDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      switch (dateRange) {
        case '7d': return diffDays <= 7;
        case '30d': return diffDays <= 30;
        case '90d': return diffDays <= 90;
        default: return true;
      }
    });

    // Calculate sentiment distribution
    const sentiments = filteredFeedbacks.map(feedback => analyzeSentiment(feedback.message));
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    const neutralCount = sentiments.filter(s => s === 'neutral').length;
    const total = filteredFeedbacks.length;

    // Calculate average sentiment score (0-100)
    const avgSentimentScore = total > 0 
      ? Math.round(((positiveCount * 100) + (neutralCount * 50) + (negativeCount * 0)) / total)
      : 0;

    // Calculate status distribution
    const statusCounts = filteredFeedbacks.reduce((acc, feedback) => {
      acc[feedback.status] = (acc[feedback.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Extract and count themes
    const allThemes = filteredFeedbacks.flatMap(feedback => extractThemes(feedback.message));
    const themeCounts: Record<string, number> = {};
    allThemes.forEach(theme => {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    });

    const topThemes = Object.entries(themeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));

    // Calculate feedback volume over time
    const volumeData: Record<string, number> = {};
    filteredFeedbacks.forEach(feedback => {
      const date = new Date(feedback.timestamp).toISOString().split('T')[0];
      volumeData[date] = (volumeData[date] || 0) + 1;
    });

    const feedbackVolume = Object.entries(volumeData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Calculate sentiment trend (last 7 days vs previous 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const currentPeriodFeedbacks = filteredFeedbacks.filter(feedback => 
      new Date(feedback.timestamp) >= sevenDaysAgo
    );
    const previousPeriodFeedbacks = filteredFeedbacks.filter(feedback => {
      const feedbackDate = new Date(feedback.timestamp);
      return feedbackDate >= fourteenDaysAgo && feedbackDate < sevenDaysAgo;
    });

    const currentPeriodPositive = currentPeriodFeedbacks.filter(f => 
      analyzeSentiment(f.message) === 'positive'
    ).length;
    const previousPeriodPositive = previousPeriodFeedbacks.filter(f => 
      analyzeSentiment(f.message) === 'positive'
    ).length;

    const currentPeriodTotal = currentPeriodFeedbacks.length;
    const previousPeriodTotal = previousPeriodFeedbacks.length;

    const currentPeriodPercentage = currentPeriodTotal > 0 
      ? (currentPeriodPositive / currentPeriodTotal) * 100 
      : 0;
    const previousPeriodPercentage = previousPeriodTotal > 0 
      ? (previousPeriodPositive / previousPeriodTotal) * 100 
      : 0;

    const change = currentPeriodPercentage - previousPeriodPercentage;
    const trend: 'up' | 'down' | 'stable' = 
      Math.abs(change) < 5 ? 'stable' : change > 0 ? 'up' : 'down';

    return {
      totalFeedback: total,
      sentimentDistribution: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount
      },
      avgSentimentScore,
      topTheme: topThemes[0]?.theme || 'No data',
      statusDistribution: {
        new: statusCounts.new || 0,
        reviewed: statusCounts.reviewed || 0,
        resolved: statusCounts.resolved || 0
      },
      feedbackVolume,
      topThemes,
      sentimentTrend: {
        currentPeriod: Math.round(currentPeriodPercentage),
        previousPeriod: Math.round(previousPeriodPercentage),
        change: Math.round(change),
        trend
      }
    };
  }, [feedbacks, dateRange]);

  // Filter feedbacks based on search and sentiment
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(feedback => {
      const matchesSearch = searchTerm === '' || 
        feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.email?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (sentimentFilter === 'all') return true;

      const sentiment = analyzeSentiment(feedback.message);
      return sentiment === sentimentFilter;
    });
  }, [feedbacks, searchTerm, sentimentFilter]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Export to CSV
  const exportToCSV = async () => {
    setExportingCSV(true);
    try {
      const csvData = [
        ['ID', 'Project ID', 'Name', 'Email', 'Message', 'Timestamp', 'Status', 'Sentiment', 'Themes'],
        ...filteredFeedbacks.map(feedback => [
          feedback.id,
          feedback.project_id || '',
          feedback.name || '',
          feedback.email || '',
          `"${feedback.message.replace(/"/g, '""')}"`,
          feedback.timestamp,
          feedback.status,
          analyzeSentiment(feedback.message),
          extractThemes(feedback.message).join('; ')
        ])
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `feedback-analytics-${new Date().toISOString().split('T')[0]}.csv`);
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

  // Export to PDF
  const exportToPDF = async () => {
    setExportingPDF(true);
    try {
      toast.info('Generating PDF...', {
        description: 'Please wait while we create your dashboard snapshot.'
      });

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

      pdfContainer.innerHTML = `
        <div style="margin-bottom: 30px;">
          <h1 style="color: #1f2937; font-size: 28px; margin-bottom: 10px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px;">
            Feedback Analytics Dashboard
          </h1>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
            Generated on ${new Date().toLocaleDateString()} • Date Range: ${dateRange} • Total Feedback: ${analyticsData.totalFeedback}
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 15px;">
            Key Performance Indicators
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background-color: #f9fafb;">
              <div style="font-weight: 600; color: #1f2937; margin-bottom: 5px;">Total Feedback</div>
              <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${analyticsData.totalFeedback}</div>
            </div>
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background-color: #f9fafb;">
              <div style="font-weight: 600; color: #1f2937; margin-bottom: 5px;">Avg Sentiment Score</div>
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">${analyticsData.avgSentimentScore}/100</div>
            </div>
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background-color: #f9fafb;">
              <div style="font-weight: 600; color: #1f2937; margin-bottom: 5px;">Top Theme</div>
              <div style="font-size: 18px; color: #6b7280;">${analyticsData.topTheme}</div>
            </div>
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background-color: #f9fafb;">
              <div style="font-weight: 600; color: #1f2937; margin-bottom: 5px;">Sentiment Trend</div>
              <div style="font-size: 18px; color: ${analyticsData.sentimentTrend.trend === 'up' ? '#10b981' : analyticsData.sentimentTrend.trend === 'down' ? '#ef4444' : '#6b7280'};">
                ${analyticsData.sentimentTrend.change > 0 ? '+' : ''}${analyticsData.sentimentTrend.change}%
              </div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #10b981; padding-left: 15px;">
            Sentiment Distribution
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
            <div style="text-align: center; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
              <div style="font-size: 24px; font-weight: bold; color: #16a34a; margin-bottom: 5px;">${analyticsData.sentimentDistribution.positive}</div>
              <div style="color: #16a34a; font-weight: 500;">Positive</div>
            </div>
            <div style="text-align: center; padding: 20px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fde68a;">
              <div style="font-size: 24px; font-weight: bold; color: #ca8a04; margin-bottom: 5px;">${analyticsData.sentimentDistribution.neutral}</div>
              <div style="color: #ca8a04; font-weight: 500;">Neutral</div>
            </div>
            <div style="text-align: center; padding: 20px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
              <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 5px;">${analyticsData.sentimentDistribution.negative}</div>
              <div style="color: #dc2626; font-weight: 500;">Negative</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #f59e0b; padding-left: 15px;">
            Top Themes
          </h2>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${analyticsData.topThemes.map(theme => 
              `<span style="background-color: #f3f4f6; color: #374151; padding: 6px 12px; border-radius: 16px; font-size: 12px; border: 1px solid #d1d5db;">
                ${theme.theme} (${theme.count})
              </span>`
            ).join('')}
          </div>
        </div>
      `;

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

      pdf.save(`feedback-analytics-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.removeChild(pdfContainer);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
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

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new':
        return 'secondary';
      case 'reviewed':
        return 'default';
      case 'resolved':
        return 'outline';
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
              <BarChart3 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to access your analytics dashboard.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive insights into your feedback data and user sentiment
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadFeedbacks}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="rounded-xl shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search feedback by message, name, or email..."
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
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            {/* Sentiment Filter */}
            <Select value={sentimentFilter} onValueChange={(value: any) => setSentimentFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Buttons */}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={exportingCSV || filteredFeedbacks.length === 0}
              >
                {exportingCSV ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={exportToPDF}
                disabled={exportingPDF || filteredFeedbacks.length === 0}
              >
                {exportingPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileTextIcon className="h-4 w-4 mr-2" />
                )}
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Feedback */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalFeedback}</div>
            <p className="text-xs text-muted-foreground">
              {dateRange === 'all' ? 'All time' : `Last ${dateRange}`}
            </p>
          </CardContent>
        </Card>

        {/* Positive Sentiment */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive %</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analyticsData.totalFeedback > 0 
                ? Math.round((analyticsData.sentimentDistribution.positive / analyticsData.totalFeedback) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.sentimentDistribution.positive} feedbacks
            </p>
          </CardContent>
        </Card>

        {/* Negative Sentiment */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negative %</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analyticsData.totalFeedback > 0 
                ? Math.round((analyticsData.sentimentDistribution.negative / analyticsData.totalFeedback) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.sentimentDistribution.negative} feedbacks
            </p>
          </CardContent>
        </Card>

        {/* Average Sentiment Score */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sentiment</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analyticsData.avgSentimentScore}/100
            </div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.avgSentimentScore >= 70 ? 'Excellent' : 
               analyticsData.avgSentimentScore >= 50 ? 'Good' : 'Needs Improvement'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Volume Over Time */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LineChart className="h-5 w-5" />
              <span>Feedback Volume Over Time</span>
            </CardTitle>
            <CardDescription>
              Daily feedback count for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData.feedbackVolume.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analyticsData.feedbackVolume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => formatDate(value)}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(value) => formatDate(value)}
                    formatter={(value: any) => [value, 'Feedback Count']}
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
                No volume data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sentiment Distribution */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Sentiment Distribution</span>
            </CardTitle>
            <CardDescription>
              Breakdown of positive, negative, and neutral feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsData.totalFeedback > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={[
                      { name: 'Positive', value: analyticsData.sentimentDistribution.positive, color: '#10b981' },
                      { name: 'Neutral', value: analyticsData.sentimentDistribution.neutral, color: '#f59e0b' },
                      { name: 'Negative', value: analyticsData.sentimentDistribution.negative, color: '#ef4444' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: 'Positive', value: analyticsData.sentimentDistribution.positive, color: '#10b981' },
                      { name: 'Neutral', value: analyticsData.sentimentDistribution.neutral, color: '#f59e0b' },
                      { name: 'Negative', value: analyticsData.sentimentDistribution.negative, color: '#ef4444' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No sentiment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Themes Chart */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart className="h-5 w-5" />
            <span>Top 5 Themes</span>
          </CardTitle>
          <CardDescription>
            Most frequently mentioned themes in feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsData.topThemes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={analyticsData.topThemes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="theme" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: any) => [value, 'Mentions']} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No theme data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trends Section */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Sentiment Trends</span>
          </CardTitle>
          <CardDescription>
            Sentiment change over the last 7 days vs previous 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Period */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analyticsData.sentimentTrend.currentPeriod}%
              </div>
              <p className="text-sm text-gray-600">Current 7 Days</p>
              <p className="text-xs text-gray-500">Positive sentiment</p>
            </div>

            {/* Previous Period */}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {analyticsData.sentimentTrend.previousPeriod}%
              </div>
              <p className="text-sm text-gray-600">Previous 7 Days</p>
              <p className="text-xs text-gray-500">Positive sentiment</p>
            </div>

            {/* Change */}
            <div className="text-center">
              <div className={`text-2xl font-bold flex items-center justify-center space-x-1 ${
                analyticsData.sentimentTrend.trend === 'up' ? 'text-green-600' : 
                analyticsData.sentimentTrend.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {analyticsData.sentimentTrend.trend === 'up' ? (
                  <TrendingUp className="h-6 w-6" />
                ) : analyticsData.sentimentTrend.trend === 'down' ? (
                  <TrendingDown className="h-6 w-6" />
                ) : (
                  <Minus className="h-6 w-6" />
                )}
                <span>{analyticsData.sentimentTrend.change > 0 ? '+' : ''}{analyticsData.sentimentTrend.change}%</span>
              </div>
              <p className="text-sm text-gray-600">Change</p>
              <p className="text-xs text-gray-500 capitalize">
                {analyticsData.sentimentTrend.trend} trend
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      {filteredFeedbacks.length > 0 && (
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Recent Feedback</span>
            </CardTitle>
            <CardDescription>
              Showing {filteredFeedbacks.length} feedback entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredFeedbacks.slice(0, 10).map((feedback) => (
                <div key={feedback.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {feedback.name || 'Anonymous'}
                      </span>
                      <Badge variant={getSentimentBadgeVariant(analyzeSentiment(feedback.message))}>
                        {analyzeSentiment(feedback.message)}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(feedback.status)}>
                        {feedback.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(feedback.timestamp)}</span>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm line-clamp-2">{feedback.message}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {extractThemes(feedback.message).map((theme, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filteredFeedbacks.length === 0 && (
        <Card className="rounded-xl shadow-lg text-center py-12">
          <CardContent>
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchTerm || sentimentFilter !== 'all' ? 'No feedback found' : 'No feedback data yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || sentimentFilter !== 'all' 
                ? 'Try adjusting your search or filters.'
                : 'Collect feedback first to see analytics and insights.'
              }
            </p>
            {!searchTerm && sentimentFilter === 'all' && (
              <Button asChild>
                <a href="/feedback">Go to Feedback</a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
