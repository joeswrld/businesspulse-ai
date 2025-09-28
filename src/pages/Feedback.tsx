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
  LineChart
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
  ResponsiveContainer
} from 'recharts';

// Types - Updated to match your actual database schema
interface Feedback {
  id: string;
  project_id: string;
  user_id: string | null;
  form_type: string;
  message: string;
  rating: number | null;
  metadata: any;
  created_at: string;
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
}

interface FilterState {
  formType: string;
  rating: string;
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
    dateRange: { from: undefined, to: undefined },
    searchQuery: ''
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load feedback data
  const loadFeedbackData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First, get or create feedback settings
      let settings: FeedbackSettings | null = null;
      
      try {
        const { data: existingSettings, error: settingsError } = await supabase
          .from("feedback_settings")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (settingsError) {
          if (settingsError.code === 'PGRST116') {
            // No row found, create one using the RPC function
            console.log('No feedback settings found, creating new ones...');
            
            const { data: newSettings, error: rpcError } = await supabase
              .rpc("get_or_create_feedback_settings", { p_user_id: user.id });

            if (rpcError) {
              console.error('Error creating feedback settings:', rpcError);
              throw rpcError;
            }

            settings = newSettings;
          } else {
            throw settingsError;
          }
        } else {
          settings = existingSettings;
        }
      } catch (settingsError) {
        console.error('Error with feedback_settings table:', settingsError);
        
        // If feedback_settings table doesn't exist, show empty state
        if (settingsError.code === '42P01' || settingsError.message?.includes('relation "feedback_settings" does not exist')) {
          console.log('Feedback settings table does not exist, showing empty state');
          setFeedbacks([]);
          setStats({
            totalFeedback: 0,
            averageRating: 0,
            customerSatisfactionCount: 0,
            productFeedbackCount: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            recentFeedback: []
          });
          return;
        }
        throw settingsError;
      }

      if (!settings) {
        console.log('No feedback settings available, showing empty state');
        setFeedbacks([]);
        setStats({
          totalFeedback: 0,
          averageRating: 0,
          customerSatisfactionCount: 0,
          productFeedbackCount: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          recentFeedback: []
        });
        return;
      }

      setFeedbackSettings(settings);

      // Load feedback using the project_id from feedback_settings
      const { data: feedbacksData, error: feedbacksError } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', settings.project_id)
        .order('created_at', { ascending: false });

      if (feedbacksError) {
        console.error('Error loading feedback:', feedbacksError);
        
        // If feedback table doesn't exist, return empty state
        if (feedbacksError.code === '42P01' || feedbacksError.message?.includes('relation "feedback" does not exist')) {
          console.log('Feedback table does not exist, showing empty state');
          setFeedbacks([]);
          setStats({
            totalFeedback: 0,
            averageRating: 0,
            customerSatisfactionCount: 0,
            productFeedbackCount: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            recentFeedback: []
          });
          return;
        }
        throw feedbacksError;
      }

      const feedbacksList = feedbacksData || [];
      setFeedbacks(feedbacksList);

      // Calculate stats based on actual rating values
      const totalFeedback = feedbacksList.length;
      
      // Count by form_type
      const customerSatisfactionCount = feedbacksList.filter(f => f.form_type === 'customer_satisfaction').length;
      const productFeedbackCount = feedbacksList.filter(f => f.form_type === 'product_feedback').length;
      
      // Calculate average rating from actual rating field
      const ratingsArray = feedbacksList.filter(f => f.rating !== null).map(f => f.rating!);
      const averageRating = ratingsArray.length > 0 ? 
        ratingsArray.reduce((sum, rating) => sum + rating, 0) / ratingsArray.length : 0;
      
      // Count ratings distribution
      const ratingDistribution: { [key: number]: number } = {
        1: feedbacksList.filter(f => f.rating === 1).length,
        2: feedbacksList.filter(f => f.rating === 2).length,
        3: feedbacksList.filter(f => f.rating === 3).length,
        4: feedbacksList.filter(f => f.rating === 4).length,
        5: feedbacksList.filter(f => f.rating === 5).length
      };

      setStats({
        totalFeedback,
        averageRating,
        customerSatisfactionCount,
        productFeedbackCount,
        ratingDistribution,
        recentFeedback: feedbacksList.slice(0, 5)
      });

    } catch (error) {
      console.error('Error loading feedback data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while loading data');
      toast.error('Failed to load feedback data', {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data on component mount
  useEffect(() => {
    if (user) {
      loadFeedbackData();
    }
  }, [loadFeedbackData, user]);

  // Set up real-time subscriptions
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
          console.log('Feedback change received:', payload);
          loadFeedbackData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, feedbackSettings, loadFeedbackData]);

  // Filter feedbacks based on current filters
  const filteredFeedbacks = useMemo(() => {
    let filtered = feedbacks;

    // Filter by form type
    if (filters.formType !== 'all') {
      filtered = filtered.filter(f => f.form_type === filters.formType);
    }

    // Filter by rating
    if (filters.rating !== 'all') {
      const ratingValue = parseInt(filters.rating);
      filtered = filtered.filter(f => f.rating === ratingValue);
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.message.toLowerCase().includes(query) ||
        (f.metadata?.email && f.metadata.email.toLowerCase().includes(query))
      );
    }

    // Filter by date range
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
  const chartData = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const filteredByDate = feedbacks.filter(feedback => {
      const feedbackDate = new Date(feedback.created_at);
      return feedbackDate >= thirtyDaysAgo && feedbackDate <= now;
    });

    // Group by date
    const volumeData: Record<string, number> = {};
    filteredByDate.forEach(feedback => {
      const date = new Date(feedback.created_at).toISOString().split('T')[0];
      volumeData[date] = (volumeData[date] || 0) + 1;
    });

    return Object.entries(volumeData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [feedbacks]);

  // Export functionality
  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Form Type', 'Message', 'Rating', 'Email', 'Page URL'].join(','),
      ...filteredFeedbacks.map(f => [
        new Date(f.created_at).toLocaleDateString(),
        f.form_type,
        `"${f.message.replace(/"/g, '""')}"`,
        f.rating || '',
        f.metadata?.email || '',
        f.metadata?.page_url || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Feedback data exported successfully');
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
            <p className="text-gray-600">Please wait while we fetch your data.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Feedback</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadFeedbackData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Feedback Dashboard</h1>
          <p className="text-primary/70 mt-2">
            Real-time insights into your customer feedback
          </p>
          {feedbackSettings && (
            <p className="text-sm text-gray-500 mt-1">
              Project ID: {feedbackSettings.project_id}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportToCSV} disabled={filteredFeedbacks.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={loadFeedbackData} disabled={loading}>
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
              <p className="text-xs text-muted-foreground">
                All time feedback count
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on user ratings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
              <ThumbsUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.customerSatisfactionCount}</div>
              <p className="text-xs text-muted-foreground">
                Satisfaction surveys
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Product Feedback</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.productFeedbackCount}</div>
              <p className="text-xs text-muted-foreground">
                Product suggestions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Form Type</label>
              <Select value={filters.formType} onValueChange={(value) => setFilters(prev => ({ ...prev, formType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
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
                  <SelectValue placeholder="All ratings" />
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
              <label className="text-sm font-medium">Date Range</label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                          {format(filters.dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(filters.dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filters.dateRange.from}
                    selected={filters.dateRange}
                    onSelect={(range) => {
                      setFilters(prev => ({ ...prev, dateRange: range || { from: undefined, to: undefined } }));
                      setDatePickerOpen(false);
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Volume Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LineChart className="h-5 w-5" />
              <span>Feedback Volume (Last 30 Days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), "MMM dd")}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
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
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p>No data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="h-5 w-5" />
              <span>Rating Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats && Object.values(stats.ratingDistribution).some(count => count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={[
                      { name: '5 Stars', value: stats.ratingDistribution[5], color: '#10b981' },
                      { name: '4 Stars', value: stats.ratingDistribution[4], color: '#84cc16' },
                      { name: '3 Stars', value: stats.ratingDistribution[3], color: '#f59e0b' },
                      { name: '2 Stars', value: stats.ratingDistribution[2], color: '#f97316' },
                      { name: '1 Star', value: stats.ratingDistribution[1], color: '#ef4444' }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: '5 Stars', value: stats.ratingDistribution[5], color: '#10b981' },
                      { name: '4 Stars', value: stats.ratingDistribution[4], color: '#84cc16' },
                      { name: '3 Stars', value: stats.ratingDistribution[3], color: '#f59e0b' },
                      { name: '2 Stars', value: stats.ratingDistribution[2], color: '#f97316' },
                      { name: '1 Star', value: stats.ratingDistribution[1], color: '#ef4444' }
                    ].filter(item => item.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p>No data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Feedback Entries</span>
          </CardTitle>
          <CardDescription>
            {filteredFeedbacks.length} feedback entries found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedFeedbacks.length > 0 ? (
            <div className="space-y-4">
              {paginatedFeedbacks.map((feedback) => (
                <div key={feedback.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {feedback.form_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                      {feedback.rating && (
                        <Badge variant="secondary">
                          {feedback.rating} ⭐
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{format(new Date(feedback.created_at), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm mb-2">{feedback.message}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {feedback.metadata?.email && (
                      <span>From: {feedback.metadata.email}</span>
                    )}
                    {feedback.metadata?.page_url && (
                      <span>Page: {feedback.metadata.page_url}</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredFeedbacks.length)} of {filteredFeedbacks.length} entries
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
              <p className="text-gray-600 mb-4">
                {filters.searchQuery || filters.dateRange.from || filters.dateRange.to || filters.formType !== 'all' || filters.rating !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Start collecting feedback through your widget to see insights and analytics.'
                }
              </p>
              {(filters.searchQuery || filters.dateRange.from || filters.dateRange.to || filters.formType !== 'all' || filters.rating !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({
                    formType: 'all',
                    rating: 'all',
                    dateRange: { from: undefined, to: undefined },
                    searchQuery: ''
                  })}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
