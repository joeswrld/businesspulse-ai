import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
  MessageSquare,
  Star,
  Filter,
  Search,
  Download,
  RefreshCw,
  Calendar as CalendarIcon,
  ThumbsUp,
  Clock,
  AlertCircle,
  BarChart3,
  LineChart,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Mail,
  ExternalLink,
  MoreVertical,
  Archive,
  Flag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy
} from 'lucide-react';

import {
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

// Types
interface Feedback {
  id: string;
  project_id: string;
  user_id: string | null;
  form_type: string;
  message: string;
  rating: number | null;
  metadata: any;
  created_at: string;
  status?: 'new' | 'reviewed' | 'resolved' | 'archived';
  sentiment?: 'positive' | 'neutral' | 'negative';
  ai_summary?: string;
  suggested_reply?: string;
}

interface FeedbackSettings {
  id: string;
  user_id: string;
  project_id: string;
  customer_survey_url: string | null;
  product_feedback_url: string | null;
  widget_code: string | null;
  created_at: string;
  updated_at: string;
}

interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  customerSatisfactionCount: number;
  productFeedbackCount: number;
  ratingDistribution: { [key: number]: number };
  recentFeedback: Feedback[];
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  responseRate: number;
  trendPercentage: number;
}

interface FilterState {
  formType: string;
  rating: string;
  sentiment: string;
  status: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
  searchQuery: string;
}

export default function Feedback() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [feedbackSettings, setFeedbackSettings] = useState<FeedbackSettings | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    formType: 'all',
    rating: 'all',
    sentiment: 'all',
    status: 'all',
    dateRange: { from: undefined, to: undefined },
    searchQuery: ''
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Sentiment analysis helper (simple keyword-based for demo)
  const analyzeSentiment = (message: string): 'positive' | 'neutral' | 'negative' => {
    const lowerMessage = message.toLowerCase();
    const positiveWords = ['great', 'excellent', 'amazing', 'love', 'awesome', 'fantastic', 'good', 'best', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'disappointed', 'horrible', 'useless'];
    
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  };

  // Generate AI summary (placeholder for Gemini API integration)
  const generateAISummary = async (feedback: Feedback): Promise<string> => {
    // TODO: Replace with actual Gemini API call
    setAiProcessing(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const sentiment = analyzeSentiment(feedback.message);
    const summaries = {
      positive: `Customer expressed satisfaction with ${feedback.form_type.replace('_', ' ')}. Key points: positive experience, recommends service.`,
      neutral: `Customer provided ${feedback.form_type.replace('_', ' ')} feedback. Mixed feedback with both positive and negative aspects.`,
      negative: `Customer reported issues with ${feedback.form_type.replace('_', ' ')}. Immediate attention recommended.`
    };
    
    setAiProcessing(false);
    return summaries[sentiment];
  };

  // Generate suggested reply (placeholder for Gemini API integration)
  const generateSuggestedReply = async (feedback: Feedback): Promise<string> => {
    // TODO: Replace with actual Gemini API call
    const sentiment = analyzeSentiment(feedback.message);
    const rating = feedback.rating || 3;
    
    if (sentiment === 'positive' && rating >= 4) {
      return `Thank you so much for your positive feedback! We're thrilled to hear you had a great experience. Your satisfaction is our top priority, and we look forward to serving you again soon.`;
    } else if (sentiment === 'negative' || rating <= 2) {
      return `We sincerely apologize for the experience you described. Your feedback is invaluable to us, and we'd like to make this right. Our team will reach out to you within 24 hours to resolve this issue. Thank you for bringing this to our attention.`;
    } else {
      return `Thank you for taking the time to share your feedback. We appreciate your insights and will use them to improve our service. If you have any additional concerns, please don't hesitate to reach out.`;
    }
  };

  // Load feedback data with enhanced processing
  // Replace the loadFeedbackData function in src/pages/Feedback.tsx with this complete implementation

const loadFeedbackData = useCallback(async () => {
  if (!user) return;

  try {
    setLoading(true);
    setError(null);

    console.log('🔄 Loading feedback data for user:', user.id);

    // Step 1: Get or create feedback settings
    const { data: existingSettings, error: settingsError } = await supabase
      .from("feedback_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) {
      console.error('❌ Error fetching feedback settings:', settingsError);
      throw new Error('Failed to load feedback settings.');
    }

    let settings: FeedbackSettings | null = null;

    if (!existingSettings) {
      console.log('📝 No feedback settings found, creating new ones...');
      
      const newProjectId = crypto.randomUUID();
      const baseUrl = window.location.origin;
      
      const newSettings = {
        user_id: user.id,
        project_id: newProjectId,
        customer_survey_url: `${baseUrl}/csat/${newProjectId}`,
        product_feedback_url: `${baseUrl}/product-feedback/${newProjectId}`,
        widget_code: `<script src="${baseUrl}/widget.js" data-project-id="${newProjectId}"></script>`,
        widget_title: 'Share Your Feedback',
        widget_color: '#3B82F6',
        greeting_text: 'We value your feedback!',
        customer_satisfaction_enabled: true,
        product_feedback_enabled: true
      };

      const { data: createdSettings, error: createError } = await supabase
        .from('feedback_settings')
        .insert(newSettings)
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating feedback settings:', createError);
        throw new Error('Failed to create feedback settings.');
      }

      settings = createdSettings;
      console.log('✅ Created new feedback settings:', settings);
    } else {
      settings = existingSettings;
      console.log('✅ Found existing feedback settings:', settings);
    }

    if (!settings || !settings.project_id) {
      throw new Error('No project ID found.');
    }

    setFeedbackSettings(settings);

    // Step 2: Load feedback using project_id from feedback_settings
    console.log('📥 Loading feedback for project_id:', settings.project_id);
    
    const { data: feedbacksData, error: feedbacksError } = await supabase
      .from('feedback')
      .select('*')
      .eq('project_id', settings.project_id)
      .order('created_at', { ascending: false });

    if (feedbacksError) {
      console.error('❌ Error loading feedback:', feedbacksError);
      throw new Error(`Failed to load feedback: ${feedbacksError.message}`);
    }

    console.log(`✅ Loaded ${feedbacksData?.length || 0} feedback entries`);

    // Step 3: Enhance feedback with sentiment analysis
    const enhancedFeedbacks = (feedbacksData || []).map(fb => ({
      ...fb,
      sentiment: analyzeSentiment(fb.message),
      status: fb.metadata?.status || 'new'
    }));

    setFeedbacks(enhancedFeedbacks);

    // Step 4: Calculate comprehensive statistics
    const totalFeedback = enhancedFeedbacks.length;
    const customerSatisfactionCount = enhancedFeedbacks.filter(f => f.form_type === 'customer_satisfaction').length;
    const productFeedbackCount = enhancedFeedbacks.filter(f => f.form_type === 'product_feedback').length;
    
    const ratingsArray = enhancedFeedbacks.filter(f => f.rating !== null).map(f => f.rating!);
    const averageRating = ratingsArray.length > 0 ? 
      ratingsArray.reduce((sum, rating) => sum + rating, 0) / ratingsArray.length : 0;
    
    const ratingDistribution: { [key: number]: number } = {
      1: enhancedFeedbacks.filter(f => f.rating === 1).length,
      2: enhancedFeedbacks.filter(f => f.rating === 2).length,
      3: enhancedFeedbacks.filter(f => f.rating === 3).length,
      4: enhancedFeedbacks.filter(f => f.rating === 4).length,
      5: enhancedFeedbacks.filter(f => f.rating === 5).length
    };

    const sentimentBreakdown = {
      positive: enhancedFeedbacks.filter(f => f.sentiment === 'positive').length,
      neutral: enhancedFeedbacks.filter(f => f.sentiment === 'neutral').length,
      negative: enhancedFeedbacks.filter(f => f.sentiment === 'negative').length
    };

    // Calculate trend (comparing last 7 days vs previous 7 days)
    const now = new Date();
    const last7Days = enhancedFeedbacks.filter(f => {
      const date = new Date(f.created_at);
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7;
    }).length;

    const previous7Days = enhancedFeedbacks.filter(f => {
      const date = new Date(f.created_at);
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 7 && daysDiff <= 14;
    }).length;

    const trendPercentage = previous7Days > 0 
      ? ((last7Days - previous7Days) / previous7Days) * 100 
      : last7Days > 0 ? 100 : 0;

    setStats({
      totalFeedback,
      averageRating,
      customerSatisfactionCount,
      productFeedbackCount,
      ratingDistribution,
      recentFeedback: enhancedFeedbacks.slice(0, 5),
      sentimentBreakdown,
      responseRate: 0,
      trendPercentage
    });

    console.log('📊 Stats calculated:', {
      totalFeedback,
      averageRating: averageRating.toFixed(2),
      sentiment: sentimentBreakdown
    });

  } catch (error) {
    console.error('❌ Error loading feedback data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    setError(errorMessage);
    toast.error('Failed to load feedback data', { description: errorMessage });
  } finally {
    setLoading(false);
  }
}, [user]);
  // Load data on mount
  useEffect(() => {
    if (user) {
      loadFeedbackData();
    }
  }, [loadFeedbackData, user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user || !feedbackSettings) return;

    const channel = supabase
      .channel('feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
          filter: `project_id=eq.${feedbackSettings.project_id}`
        },
        (payload) => {
          console.log('Real-time feedback update:', payload);
          toast.success('New feedback received!', {
            description: 'Dashboard data has been updated.'
          });
          loadFeedbackData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, feedbackSettings, loadFeedbackData]);

  // Filter feedbacks
  const filteredFeedbacks = useMemo(() => {
    let filtered = feedbacks;

    if (filters.formType !== 'all') {
      filtered = filtered.filter(f => f.form_type === filters.formType);
    }

    if (filters.rating !== 'all') {
      const ratingValue = parseInt(filters.rating);
      filtered = filtered.filter(f => f.rating === ratingValue);
    }

    if (filters.sentiment !== 'all') {
      filtered = filtered.filter(f => f.sentiment === filters.sentiment);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(f => f.status === filters.status);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.message.toLowerCase().includes(query) ||
        (f.metadata?.email && f.metadata.email.toLowerCase().includes(query))
      );
    }

    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter(f => {
        const feedbackDate = new Date(f.created_at);
        const fromDate = filters.dateRange.from || new Date(0);
        const toDate = filters.dateRange.to || new Date();
        return feedbackDate >= fromDate && feedbackDate <= toDate;
      });
    }

    return filtered;
  }, [feedbacks, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage);
  const paginatedFeedbacks = filteredFeedbacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Chart data
  const volumeChartData = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const filtered = feedbacks.filter(fb => {
      const date = new Date(fb.created_at);
      return date >= thirtyDaysAgo && date <= now;
    });

    const volumeData: Record<string, number> = {};
    filtered.forEach(fb => {
      const date = new Date(fb.created_at).toISOString().split('T')[0];
      volumeData[date] = (volumeData[date] || 0) + 1;
    });

    return Object.entries(volumeData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [feedbacks]);

  const sentimentChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Positive', value: stats.sentimentBreakdown.positive, color: '#10b981' },
      { name: 'Neutral', value: stats.sentimentBreakdown.neutral, color: '#f59e0b' },
      { name: 'Negative', value: stats.sentimentBreakdown.negative, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [stats]);

  // Export functionality
  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Form Type', 'Message', 'Rating', 'Sentiment', 'Status', 'Email', 'Page URL'].join(','),
      ...filteredFeedbacks.map(f => [
        new Date(f.created_at).toLocaleDateString(),
        f.form_type,
        `"${f.message.replace(/"/g, '""')}"`,
        f.rating || '',
        f.sentiment || '',
        f.status || 'new',
        f.metadata?.email || '',
        f.metadata?.page_url || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notex-feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Export successful', {
      description: `${filteredFeedbacks.length} feedback entries exported to CSV`
    });
  };

  // Handle AI processing for selected feedback
  const handleAIProcess = async (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    try {
      const [summary, reply] = await Promise.all([
        generateAISummary(feedback),
        generateSuggestedReply(feedback)
      ]);
      
      setSelectedFeedback({
        ...feedback,
        ai_summary: summary,
        suggested_reply: reply
      });
      
      toast.success('AI analysis complete', {
        description: 'Summary and suggested reply generated'
      });
    } catch (error) {
      toast.error('AI processing failed', {
        description: 'Please try again'
      });
    }
  };

  // Sentiment badge component
  const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
    const colors = {
      positive: 'bg-green-100 text-green-800',
      neutral: 'bg-yellow-100 text-yellow-800',
      negative: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={colors[sentiment as keyof typeof colors]}>
        {sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😞' : '😐'} {sentiment}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to access your feedback dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Loading Feedback...</h2>
            <p className="text-gray-600">Fetching real-time data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Feedback</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadFeedbackData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
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
          <h1 className="text-3xl font-bold text-gray-900">Feedback Dashboard</h1>
          <p className="text-gray-600 mt-2">
            AI-powered real-time insights • {filteredFeedbacks.length} total entries
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportToCSV} disabled={filteredFeedbacks.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadFeedbackData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFeedback}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {stats.trendPercentage >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-600">+{stats.trendPercentage.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-600">{stats.trendPercentage.toFixed(1)}%</span>
                  </>
                )}
                <span className="ml-1">vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageRating > 0 ? (
                  <span className="flex items-center">
                    {stats.averageRating.toFixed(1)}
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 ml-1" />
                  </span>
                ) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {Object.values(stats.ratingDistribution).reduce((a, b) => a + b, 0)} ratings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.sentimentBreakdown.positive > 0 ? (
                  <span className="text-green-600">
                    {((stats.sentimentBreakdown.positive / stats.totalFeedback) * 100).toFixed(0)}%
                  </span>
                ) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.sentimentBreakdown.positive} positive • {stats.sentimentBreakdown.negative} negative
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <Mail className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground mt-1">
                Track response metrics (coming soon)
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="feedback">All Feedback</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LineChart className="h-5 w-5" />
                  <span>Feedback Volume (30 Days)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {volumeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={volumeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => format(new Date(value), "MMM dd")}
                        fontSize={12}
                      />
                      <YAxis fontSize={12} />
                      <Tooltip
                        labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
                        formatter={(value: any) => [value, 'Feedback']}
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
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>No data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>Sentiment Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sentimentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={sentimentChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {sentimentChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <Star className="h-12 w-12 mx-auto mb-2" />
                      <p>No data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Feedback</CardTitle>
              <CardDescription>Latest customer feedback entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recentFeedback.slice(0, 5).map((feedback) => (
                  <div key={feedback.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {feedback.form_type.replace('_', ' ')}
                        </Badge>
                        {feedback.sentiment && <SentimentBadge sentiment={feedback.sentiment} />}
                        {feedback.rating && (
                          <Badge variant="secondary" className="text-xs">
                            {feedback.rating}⭐
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{feedback.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(feedback.created_at), 'MMM dd, yyyy • HH:mm')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAIProcess(feedback)}
                      disabled={aiProcessing}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Form Type</label>
                  <Select value={filters.formType} onValueChange={(value) => setFilters(prev => ({ ...prev, formType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="customer_satisfaction">Customer Satisfaction</SelectItem>
                      <SelectItem value="product_feedback">Product Feedback</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rating</label>
                  <Select value={filters.rating} onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ratings</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="1">1 Star</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sentiment</label>
                  <Select value={filters.sentiment} onValueChange={(value) => setFilters(prev => ({ ...prev, sentiment: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sentiments</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search..."
                      value={filters.searchQuery}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Feedback Entries ({filteredFeedbacks.length})</span>
                {(filters.searchQuery || filters.formType !== 'all' || filters.rating !== 'all' || filters.sentiment !== 'all' || filters.status !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({
                      formType: 'all',
                      rating: 'all',
                      sentiment: 'all',
                      status: 'all',
                      dateRange: { from: undefined, to: undefined },
                      searchQuery: ''
                    })}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paginatedFeedbacks.length > 0 ? (
                <div className="space-y-4">
                  {paginatedFeedbacks.map((feedback) => (
                    <div key={feedback.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2 flex-wrap gap-2">
                          <Badge variant="outline">
                            {feedback.form_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                          {feedback.sentiment && <SentimentBadge sentiment={feedback.sentiment} />}
                          {feedback.rating && (
                            <Badge variant="secondary">
                              {feedback.rating} ⭐
                            </Badge>
                          )}
                          <Badge className={
                            feedback.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            feedback.status === 'reviewed' ? 'bg-yellow-100 text-yellow-800' :
                            feedback.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {feedback.status || 'new'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAIProcess(feedback)}
                            disabled={aiProcessing}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3">{feedback.message}</p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(new Date(feedback.created_at), 'MMM dd, yyyy HH:mm')}
                          </span>
                          {feedback.metadata?.email && (
                            <span className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {feedback.metadata.email}
                            </span>
                          )}
                          {feedback.metadata?.page_url && (
                            <span className="flex items-center">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {new URL(feedback.metadata.page_url).hostname}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* AI Insights (if processed) */}
                      {selectedFeedback?.id === feedback.id && selectedFeedback.ai_summary && (
                        <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">AI Insights</span>
                          </div>
                          <p className="text-sm text-purple-800 mb-3">{selectedFeedback.ai_summary}</p>
                          {selectedFeedback.suggested_reply && (
                            <div className="mt-2">
                              <span className="text-xs font-medium text-purple-900">Suggested Reply:</span>
                              <p className="text-sm text-purple-700 mt-1 italic">{selectedFeedback.suggested_reply}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigator.clipboard.writeText(selectedFeedback.suggested_reply || '');
                                    toast.success('Copied to clipboard');
                                  }}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy Reply
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-sm text-gray-500">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredFeedbacks.length)} of {filteredFeedbacks.length}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    No feedback found
                  </h3>
                  <p className="text-gray-600">
                    {filters.searchQuery || filters.formType !== 'all' || filters.rating !== 'all'
                      ? 'Try adjusting your filters.'
                      : 'Start collecting feedback to see insights.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rating Distribution Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Rating Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && Object.values(stats.ratingDistribution).some(count => count > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { rating: '5★', count: stats.ratingDistribution[5], color: '#10b981' },
                        { rating: '4★', count: stats.ratingDistribution[4], color: '#84cc16' },
                        { rating: '3★', count: stats.ratingDistribution[3], color: '#f59e0b' },
                        { rating: '2★', count: stats.ratingDistribution[2], color: '#f97316' },
                        { rating: '1★', count: stats.ratingDistribution[1], color: '#ef4444' }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="rating" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {[
                          { rating: '5★', count: stats.ratingDistribution[5], color: '#10b981' },
                          { rating: '4★', count: stats.ratingDistribution[4], color: '#84cc16' },
                          { rating: '3★', count: stats.ratingDistribution[3], color: '#f59e0b' },
                          { rating: '2★', count: stats.ratingDistribution[2], color: '#f97316' },
                          { rating: '1★', count: stats.ratingDistribution[1], color: '#ef4444' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>No rating data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Form Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Feedback Type Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats && (stats.customerSatisfactionCount > 0 || stats.productFeedbackCount > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: 'Customer Satisfaction', value: stats.customerSatisfactionCount, color: '#3b82f6' },
                          { name: 'Product Feedback', value: stats.productFeedbackCount, color: '#8b5cf6' }
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: 'Customer Satisfaction', value: stats.customerSatisfactionCount, color: '#3b82f6' },
                          { name: 'Product Feedback', value: stats.productFeedbackCount, color: '#8b5cf6' }
                        ].filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2" />
                      <p>No feedback type data</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5" />
                <span>AI-Powered Insights</span>
              </CardTitle>
              <CardDescription>
                Actionable insights derived from your feedback data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats && stats.totalFeedback > 0 ? (
                  <>
                    {stats.averageRating >= 4 && (
                      <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-900">Strong Performance</h4>
                          <p className="text-sm text-green-700">
                            Your average rating of {stats.averageRating.toFixed(1)}★ indicates excellent customer satisfaction.
                          </p>
                        </div>
                      </div>
                    )}

                    {stats.averageRating < 3 && stats.averageRating > 0 && (
                      <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-900">Action Required</h4>
                          <p className="text-sm text-red-700">
                            Your average rating of {stats.averageRating.toFixed(1)}★ suggests areas for improvement. Review negative feedback urgently.
                          </p>
                        </div>
                      </div>
                    )}

                    {stats.sentimentBreakdown.negative > stats.totalFeedback * 0.3 && (
                      <div className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-orange-900">High Negative Sentiment</h4>
                          <p className="text-sm text-orange-700">
                            {((stats.sentimentBreakdown.negative / stats.totalFeedback) * 100).toFixed(0)}% of feedback shows negative sentiment. 
                            Consider reviewing common issues and implementing improvements.
                          </p>
                        </div>
                      </div>
                    )}

                    {stats.trendPercentage > 20 && (
                      <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">Growing Engagement</h4>
                          <p className="text-sm text-blue-700">
                            Feedback volume increased by {stats.trendPercentage.toFixed(0)}% compared to last week. 
                            Your customers are actively engaged!
                          </p>
                        </div>
                      </div>
                    )}

                    {stats.productFeedbackCount > stats.customerSatisfactionCount * 2 && (
                      <div className="flex items-start space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-purple-900">Product-Focused Customers</h4>
                          <p className="text-sm text-purple-700">
                            Your customers are actively providing product feedback. This is valuable data for product development.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Collect more feedback to see AI-powered insights</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
