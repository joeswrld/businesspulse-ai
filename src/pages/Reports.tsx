import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
  Minus
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
interface Report {
  id: string;
  user_id: string;
  title: string;
  feedback_ids: string[];
  insights_text: string;
  created_at: string;
}

interface Feedback {
  id: string;
  message: string;
  email: string | null;
  created_at: string;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
}

interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  status: 'Planned' | 'In Progress' | 'Released';
  feedback_ids: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface AnalyticsData {
  topFeatures: Array<{ title: string; count: number }>;
  sentimentData: Array<{ name: string; value: number; color: string }>;
  feedbackVolume: Array<{ date: string; count: number }>;
  featureStatus: Array<{ status: string; count: number }>;
  totalFeedback: number;
  totalFeatures: number;
  releasedFeatures: number;
  averageFeedbackPerFeature: number;
}

interface AIInsights {
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
}

export default function Reports() {
  const { user } = useAuth();
  
  // State management
  const [reports, setReports] = useState<Report[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [feedbackData, setFeedbackData] = useState<Feedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  // Load all data for comprehensive analytics
  const loadAllData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's project IDs from feedback_settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id);

      if (settingsError) {
        console.error('Error loading feedback settings:', settingsError);
        return;
      }

      const projectIds = settingsData?.map(s => s.project_id) || [];

      // Load all data in parallel
      const [reportsResult, feedbacksResult, featureRequestsResult] = await Promise.all([
        // Load reports
        supabase
          .from('reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: sortOrder === 'oldest' }),
        
        // Load feedbacks
        projectIds.length > 0 
          ? supabase
              .from('feedback')
              .select('*')
              .in('project_id', projectIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        
        // Load feature requests
        supabase
          .from('feature_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (reportsResult.error) {
        console.error('Error loading reports:', reportsResult.error);
        toast.error('Failed to load reports');
        return;
      }

      if (feedbacksResult.error) {
        console.error('Error loading feedbacks:', feedbacksResult.error);
        toast.error('Failed to load feedbacks');
        return;
      }

      if (featureRequestsResult.error) {
        console.error('Error loading feature requests:', featureRequestsResult.error);
        toast.error('Failed to load feature requests');
        return;
      }

      setReports(reportsResult.data || []);
      setFeedbacks(feedbacksResult.data || []);
      setFeatureRequests(featureRequestsResult.data || []);

    } catch (error) {
      console.error('Error in loadAllData:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user, sortOrder]);

  // Legacy function for backward compatibility
  const loadReports = loadAllData;

  // Calculate analytics data
  const calculateAnalytics = useMemo((): AnalyticsData => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Filter data by date range
    const filteredFeedbacks = feedbacks.filter(feedback => {
      const feedbackDate = new Date(feedback.created_at);
      return feedbackDate >= thirtyDaysAgo;
    });

    // Top requested features (by number of linked feedback)
    const featureFeedbackCounts: Record<string, number> = {};
    featureRequests.forEach(feature => {
      featureFeedbackCounts[feature.title] = feature.feedback_ids.length;
    });
    
    const topFeatures = Object.entries(featureFeedbackCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([title, count]) => ({ title, count }));

    // Sentiment analysis
    const sentimentCounts = {
      positive: filteredFeedbacks.filter(f => f.sentiment === 'positive').length,
      negative: filteredFeedbacks.filter(f => f.sentiment === 'negative').length,
      neutral: filteredFeedbacks.filter(f => f.sentiment === 'neutral').length
    };

    const totalSentiment = sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral;
    const sentimentData = [
      { 
        name: 'Positive', 
        value: totalSentiment > 0 ? Math.round((sentimentCounts.positive / totalSentiment) * 100) : 0,
        color: '#10b981'
      },
      { 
        name: 'Neutral', 
        value: totalSentiment > 0 ? Math.round((sentimentCounts.neutral / totalSentiment) * 100) : 0,
        color: '#f59e0b'
      },
      { 
        name: 'Negative', 
        value: totalSentiment > 0 ? Math.round((sentimentCounts.negative / totalSentiment) * 100) : 0,
        color: '#ef4444'
      }
    ];

    // Feedback volume over time (last 30 days)
    const volumeData: Record<string, number> = {};
    filteredFeedbacks.forEach(feedback => {
      const date = new Date(feedback.created_at).toISOString().split('T')[0];
      volumeData[date] = (volumeData[date] || 0) + 1;
    });

    const feedbackVolume = Object.entries(volumeData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Feature status distribution
    const featureStatus = [
      { status: 'Planned', count: featureRequests.filter(f => f.status === 'Planned').length },
      { status: 'In Progress', count: featureRequests.filter(f => f.status === 'In Progress').length },
      { status: 'Released', count: featureRequests.filter(f => f.status === 'Released').length }
    ];

    // Summary metrics
    const totalFeedback = feedbacks.length;
    const totalFeatures = featureRequests.length;
    const releasedFeatures = featureRequests.filter(f => f.status === 'Released').length;
    const averageFeedbackPerFeature = totalFeatures > 0 ? Math.round(totalFeedback / totalFeatures) : 0;

    return {
      topFeatures,
      sentimentData,
      feedbackVolume,
      featureStatus,
      totalFeedback,
      totalFeatures,
      releasedFeatures,
      averageFeedbackPerFeature
    };
  }, [feedbacks, featureRequests]);

  // Update analytics data when data changes
  useEffect(() => {
    setAnalyticsData(calculateAnalytics);
  }, [calculateAnalytics]);

  // Load reports on component mount and when sort order changes
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Set up real-time subscription for reports
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Refetch reports when changes occur
          loadReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadReports]);

  // Load feedback data for a specific report
  const loadFeedbackData = async (feedbackIds: string[]) => {
    if (feedbackIds.length === 0) return [];

    try {
      setLoadingFeedback(true);
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('id, message, email, created_at')
        .in('id', feedbackIds);

      if (feedbackError) {
        console.error('Error loading feedback:', feedbackError);
        return [];
      }

      return feedbackData || [];
    } catch (error) {
      console.error('Error loading feedback:', error);
      return [];
    } finally {
      setLoadingFeedback(false);
    }
  };

  // Filter reports based on search term and date range
  const filteredReports = reports.filter(report => {
    const matchesSearch = searchTerm === '' || 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.insights_text.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (dateRange === 'all') return true;

    const reportDate = new Date(report.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - reportDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (dateRange) {
      case '7d':
        return diffDays <= 7;
      case '30d':
        return diffDays <= 30;
      case '90d':
        return diffDays <= 90;
      default:
        return true;
    }
  });

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
  const getInsightsPreview = (insightsText: string) => {
    try {
      const insights = JSON.parse(insightsText);
      return insights.summary ? insights.summary.substring(0, 150) + '...' : 'No summary available';
    } catch {
      return insightsText.substring(0, 150) + '...';
    }
  };

  // Parse insights text
  const parseInsights = (insightsText: string): AIInsights | null => {
    try {
      return JSON.parse(insightsText);
    } catch {
      return null;
    }
  };

  // Calculate word count
  const getWordCount = (text: string) => {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  };

  // Calculate sentiment breakdown
  const getSentimentBreakdown = (insights: AIInsights) => {
    return {
      positive: insights.sentiment.positive,
      neutral: insights.sentiment.neutral,
      negative: insights.sentiment.negative,
      overall: insights.sentiment.overall
    };
  };

  // Export to PDF
  const exportToPDF = async (report: Report) => {
    setExportingPDF(true);
    try {
      toast.info('Generating PDF...', {
        description: 'Please wait while we create your report.'
      });

      const insights = parseInsights(report.insights_text);
      if (!insights) {
        toast.error('Invalid report data');
        return;
      }

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
            ${report.title}
          </h1>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
            Generated on ${formatDate(report.created_at)} • 
            Based on ${report.feedback_ids.length} feedback entries
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 15px;">
            Summary
          </h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            ${insights.summary}
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #10b981; padding-left: 15px;">
            Key Themes
          </h2>
          <ul style="font-size: 14px; line-height: 1.6; color: #374151; padding-left: 20px;">
            ${insights.key_themes.map(theme => 
              `<li style="margin-bottom: 8px;">${theme}</li>`
            ).join('')}
          </ul>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #f59e0b; padding-left: 15px;">
            Suggested Actions
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            ${insights.suggested_actions.map((action, index) => `
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
                <div style="width: ${insights.performance.score}%; height: 100%; background-color: #10b981;"></div>
              </div>
              <span style="margin-left: 10px; font-weight: 600; color: #1f2937;">${insights.performance.score}/100</span>
            </div>
          </div>
          <ul style="font-size: 14px; line-height: 1.6; color: #374151; padding-left: 20px;">
            ${insights.performance.metrics.map(metric => 
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
              <div style="font-size: 24px; font-weight: bold; color: #16a34a; margin-bottom: 5px;">${insights.sentiment.positive}%</div>
              <div style="color: #16a34a; font-weight: 500;">Positive</div>
            </div>
            <div style="text-align: center; padding: 20px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fde68a;">
              <div style="font-size: 24px; font-weight: bold; color: #ca8a04; margin-bottom: 5px;">${insights.sentiment.neutral}%</div>
              <div style="color: #ca8a04; font-weight: 500;">Neutral</div>
            </div>
            <div style="text-align: center; padding: 20px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
              <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 5px;">${insights.sentiment.negative}%</div>
              <div style="color: #dc2626; font-weight: 500;">Negative</div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <span style="background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 16px; font-size: 14px;">
              Overall: ${insights.sentiment.overall}
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
      pdf.save(`insights-report-${report.id}-${new Date(report.created_at).toISOString().split('T')[0]}.pdf`);

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

  // View full report
  const viewFullReport = async (report: Report) => {
    setSelectedReport(report);
    setShowViewModal(true);
    
    // Load feedback data for this report
    const feedback = await loadFeedbackData(report.feedback_ids);
    setFeedbackData(feedback);
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
              <p className="text-gray-600">Please log in to access your reports.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-2">
            View and export your AI-generated insights reports
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadReports}
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
                  placeholder="Search reports by title or content..."
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
                <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalFeedback}</div>
                <p className="text-xs text-muted-foreground">
                  All time feedback entries
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Feature Requests</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalFeatures}</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.releasedFeatures} released
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Released Features</CardTitle>
                <Rocket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analyticsData.releasedFeatures}</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.totalFeatures > 0 ? Math.round((analyticsData.releasedFeatures / analyticsData.totalFeatures) * 100) : 0}% completion rate
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Feedback/Feature</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.averageFeedbackPerFeature}</div>
                <p className="text-xs text-muted-foreground">
                  Feedback per feature request
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Requested Features */}
            <Card className="rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Top Requested Features</span>
                </CardTitle>
                <CardDescription>
                  Features with the most linked feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.topFeatures.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={analyticsData.topFeatures}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="title" 
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(value: any) => [value, 'Linked Feedback']} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <Target className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>No feature data available</p>
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
                  <span>Feedback Sentiment (30 days)</span>
                </CardTitle>
                <CardDescription>
                  Distribution of feedback sentiment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.sentimentData.some(s => s.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={analyticsData.sentimentData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {analyticsData.sentimentData.map((entry, index) => (
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
            {/* Feedback Volume Over Time */}
            <Card className="rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Feedback Volume (30 days)</span>
                </CardTitle>
                <CardDescription>
                  Daily feedback count over the last 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.feedbackVolume.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData.feedbackVolume}>
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
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>No volume data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature Status Distribution */}
            <Card className="rounded-xl shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Feature Status Distribution</span>
                </CardTitle>
                <CardDescription>
                  Current status of all feature requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData.featureStatus.some(f => f.count > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={analyticsData.featureStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(value: any) => [value, 'Features']} />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>No feature status data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Reports Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Loading reports...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchTerm || dateRange !== 'all' ? 'No reports found' : 'No reports yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || dateRange !== 'all' 
                ? 'Try adjusting your search or filters.'
                : 'Generate your first insights report from the Insights page.'
              }
            </p>
            {!searchTerm && dateRange === 'all' && (
              <Button asChild>
                <a href="/insights-simple">Go to Insights</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const insights = parseInsights(report.insights_text);
            return (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {formatDate(report.created_at)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {report.feedback_ids.length} feedbacks
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Title */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">{report.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {getInsightsPreview(report.insights_text)}
                    </p>
                  </div>

                  {/* Performance Score */}
                  {insights && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Performance Score</h3>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${insights.performance.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {insights.performance.score}/100
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sentiment */}
                  {insights && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Overall Sentiment</h3>
                      <Badge variant={getSentimentBadgeVariant(insights.sentiment.overall)}>
                        {insights.sentiment.overall}
                      </Badge>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewFullReport(report)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Full
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToPDF(report)}
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
                        onClick={() => exportToPDF(report)}
                        disabled={exportingPDF}
                        className="w-full"
                      >
                        {exportingPDF ? (
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
            );
          })}
        </div>
      )}

      {/* View Full Report Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Full Report - {selectedReport && formatDate(selectedReport.created_at)}</span>
            </DialogTitle>
            <DialogDescription>
              Complete analysis based on {selectedReport?.feedback_ids.length} feedback entries
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (() => {
            const insights = parseInsights(selectedReport.insights_text);
            if (!insights) return <div>Invalid report data</div>;

            return (
              <div className="space-y-6">
                {/* Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                    <span>Summary</span>
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {insights.summary}
                  </p>
                </div>

                {/* Key Themes */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <span>Key Themes</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {insights.key_themes.map((theme, index) => (
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
                    {insights.suggested_actions.map((action, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>

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
                            style={{ width: `${insights.performance.score}%` }}
                          />
                        </div>
                        <span className="font-semibold">{insights.performance.score}/100</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {insights.performance.metrics.map((metric, index) => (
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
                        variant={getSentimentBadgeVariant(insights.sentiment.overall)}
                        className="text-sm"
                      >
                        {insights.sentiment.overall}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {insights.sentiment.positive}%
                        </div>
                        <div className="text-sm text-gray-600">Positive</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">
                          {insights.sentiment.neutral}%
                        </div>
                        <div className="text-sm text-gray-600">Neutral</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {insights.sentiment.negative}%
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
                        {getWordCount(insights.summary)}
                      </div>
                      <div className="text-sm text-gray-600">Word Count</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedReport.feedback_ids.length}
                      </div>
                      <div className="text-sm text-gray-600">Feedback Items</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {insights.key_themes.length}
                      </div>
                      <div className="text-sm text-gray-600">Key Themes</div>
                    </div>
                  </div>
                </div>

                {/* Feedback Messages */}
                {feedbackData.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                      <span>Feedback Messages Used</span>
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {feedbackData.map((feedback) => (
                        <div key={feedback.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {feedback.email ? (
                                <Badge variant="secondary" className="flex items-center space-x-1">
                                  <MessageSquare className="h-3 w-3" />
                                  <span>{feedback.email}</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline">Anonymous</Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(feedback.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{feedback.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Report ID: {selectedReport.id}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => exportToPDF(selectedReport)}
                      disabled={exportingPDF}
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
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
