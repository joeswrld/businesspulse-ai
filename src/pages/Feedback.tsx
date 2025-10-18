import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
  MessageSquare, Star, Filter, Search, Download, RefreshCw, Clock, AlertCircle,
  BarChart3, LineChart, TrendingUp, TrendingDown, Sparkles, Mail, ExternalLink,
  CheckCircle2, AlertTriangle, Copy, Bell, BellOff, Crown, Lock, Loader2,
  ChevronLeft, ChevronRight
} from 'lucide-react';

import {
  AreaChart, Area, PieChart as RechartsPieChart, Cell, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar
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

interface EmailNotificationPreferences {
  enabled: boolean;
  emailAddress: string;
  notifyOnNewFeedback: boolean;
  notifyOnNegativeFeedback: boolean;
  dailyDigest: boolean;
}

export default function Feedback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const realtimeChannelRef = useRef<any>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const subscriptionStatus = useSubscriptionStatus({
    redirectOnExpiry: true,
    allowBillingPage: false
  });

  const hasAccess = subscriptionStatus?.hasAccess ?? false;
  const loadingSubscription = subscriptionStatus?.isLoading ?? true;
  const isTrialExpired = subscriptionStatus?.isTrialExpired ?? false;
  const isSubscriptionExpired = subscriptionStatus?.isSubscriptionExpired ?? false;
  
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [feedbackSettings, setFeedbackSettings] = useState<FeedbackSettings | null>(null);
  const [filters, setFilters] = useState({
    formType: 'all',
    rating: 'all',
    sentiment: 'all',
    status: 'all',
    dateRange: { from: undefined as Date | undefined, to: undefined as Date | undefined },
    searchQuery: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [emailPreferences, setEmailPreferences] = useState<EmailNotificationPreferences>({
    enabled: true,
    emailAddress: user?.email || '',
    notifyOnNewFeedback: true,
    notifyOnNegativeFeedback: true,
    dailyDigest: false
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [processingFeedbackIds, setProcessingFeedbackIds] = useState<Set<string>>(new Set());

  const analyzeSentiment = useCallback((message: string): 'positive' | 'neutral' | 'negative' => {
    const lowerMessage = message.toLowerCase();
    const positiveWords = ['great', 'excellent', 'amazing', 'love', 'awesome', 'fantastic', 'good', 'best', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'disappointed', 'horrible', 'useless'];
    
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }, []);

  // FIXED: Complete rewrite with proper error handling and validation
  const sendEmailNotification = useCallback(async (feedback: Feedback) => {
    try {
      // Check if already processing this feedback
      if (processingFeedbackIds.has(feedback.id)) {
        console.log(`Already processing notification for ${feedback.id}`);
        return;
      }

      // Validate preferences
      if (!emailPreferences.enabled) {
        console.log('Email notifications disabled, skipping');
        return;
      }

      if (!emailPreferences.notifyOnNewFeedback) {
        console.log('notifyOnNewFeedback disabled, skipping');
        return;
      }

      // Validate email
      if (!emailPreferences.emailAddress || !emailPreferences.emailAddress.includes('@')) {
        console.warn('Invalid email address in preferences:', emailPreferences.emailAddress);
        return;
      }

      // Validate feedback
      if (!feedback.id || !feedback.message) {
        console.warn('Invalid feedback structure:', feedback);
        return;
      }

      // Check negative feedback filter
      if (emailPreferences.notifyOnNegativeFeedback) {
        const sentiment = analyzeSentiment(feedback.message);
        const isNegativeFeedback = sentiment === 'negative' || (feedback.rating && feedback.rating <= 2);
        
        if (!isNegativeFeedback) {
          console.log('Not negative feedback, skipping');
          return;
        }
      }

      // Mark as processing
      setProcessingFeedbackIds(prev => new Set(prev).add(feedback.id));

      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        console.error('Failed to get session:', sessionError);
        return;
      }

      // Setup timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch('/api/send-feedback-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            recipientEmail: emailPreferences.emailAddress,
            recipientName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
            feedbackType: feedback.form_type,
            feedbackMessage: feedback.message,
            feedbackRating: feedback.rating || undefined,
            feedbackId: feedback.id,
            timestamp: feedback.created_at,
            userId: user?.id
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Email API error:', response.status, errorData);
          
          if (response.status === 429) {
            console.warn('Rate limited - skipping');
            return;
          }
          
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          console.log('✅ Email sent:', result.messageId);
          toast.success('Notification sent', {
            description: `Alert sent to ${emailPreferences.emailAddress}`
          });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('Email request timeout');
          return;
        }
        
        console.error('Fetch error:', fetchError);
      }
    } catch (error) {
      console.error('Email notification error:', error);
    } finally {
      // Remove from processing
      setProcessingFeedbackIds(prev => {
        const next = new Set(prev);
        next.delete(feedback.id);
        return next;
      });
    }
  }, [emailPreferences, analyzeSentiment, user, processingFeedbackIds]);

  const loadFeedbackData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data: existingSettings, error: settingsError } = await supabase
        .from("feedback_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw new Error('Failed to load feedback settings.');
      }

      let settings: FeedbackSettings | null = null;

      if (!existingSettings) {
        const newProjectId = crypto.randomUUID();
        const baseUrl = window.location.origin;
        
        const { data: createdSettings, error: createError } = await supabase
          .from('feedback_settings')
          .insert({
            user_id: user.id,
            project_id: newProjectId,
            customer_survey_url: `${baseUrl}/csat/${newProjectId}`,
            product_feedback_url: `${baseUrl}/product-feedback/${newProjectId}`,
            widget_code: `<script src="${baseUrl}/widget.js" data-project-id="${newProjectId}"></script>`
          })
          .select()
          .single();

        if (createError) throw new Error('Failed to create feedback settings.');
        settings = createdSettings;
      } else {
        settings = existingSettings;
      }

      if (!settings || !settings.project_id) {
        throw new Error('No project ID found.');
      }

      setFeedbackSettings(settings);

      const { data: feedbacksData, error: feedbacksError } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', settings.project_id)
        .order('created_at', { ascending: false });

      if (feedbacksError) {
        throw new Error(`Failed to load feedback: ${feedbacksError.message}`);
      }

      const enhancedFeedbacks = (feedbacksData || []).map(fb => ({
        ...fb,
        sentiment: analyzeSentiment(fb.message),
        status: fb.metadata?.status || 'new'
      }));

      setFeedbacks(enhancedFeedbacks);

      // Calculate stats
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

    } catch (error) {
      console.error('Error loading feedback data:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      toast.error('Failed to load feedback data', { description: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [user, analyzeSentiment]);

  const saveEmailPreferences = useCallback(async () => {
    if (!user) return;

    setSavingPreferences(true);
    try {
      localStorage.setItem(`email_prefs_${user.id}`, JSON.stringify(emailPreferences));
      
      const { error } = await supabase.auth.updateUser({
        data: { email_notifications: emailPreferences }
      });

      if (error) throw error;

      toast.success('Preferences saved');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSavingPreferences(false);
    }
  }, [user, emailPreferences]);

  const exportToCSV = useCallback(() => {
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
  }, [filteredFeedbacks]);

  // Load initial data
  useEffect(() => {
    if (user && hasAccess) {
      loadFeedbackData();
    }
  }, [user, hasAccess]);

  // FIXED: Realtime subscription with proper cleanup
  useEffect(() => {
    if (!user || !feedbackSettings || !hasAccess) {
      // Clean up if conditions not met
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }

    let subscription: any = null;

    try {
      subscription = supabase
        .channel(`feedback-changes-${feedbackSettings.project_id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'feedback',
          filter: `project_id=eq.${feedbackSettings.project_id}`
        }, async (payload) => {
          console.log('New feedback received:', payload);
          
          try {
            const newFeedback = payload.new as Feedback;
            
            if (!newFeedback.id || !newFeedback.message) {
              console.warn('Invalid feedback:', newFeedback);
              return;
            }

            // Send notification
            await sendEmailNotification(newFeedback);
            
            // Show toast
            toast.success('New feedback received!', {
              description: newFeedback.message.substring(0, 80)
            });

            // Reload after short delay to avoid race condition
            if (notificationTimeoutRef.current) {
              clearTimeout(notificationTimeoutRef.current);
            }
            notificationTimeoutRef.current = setTimeout(() => {
              loadFeedbackData();
            }, 500);
          } catch (error) {
            console.error('Error processing feedback:', error);
          }
        })
        .subscribe((status) => {
          console.log('Realtime status:', status);
        });

      realtimeChannelRef.current = subscription;
    } catch (error) {
      console.error('Realtime setup failed:', error);
      toast.error('Real-time updates failed');
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
        realtimeChannelRef.current = null;
      }
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [user, feedbackSettings, hasAccess, sendEmailNotification, loadFeedbackData]);

  // FIXED: Better preference loading
  useEffect(() => {
    if (user?.id) {
      const savedPrefs = localStorage.getItem(`email_prefs_${user.id}`);
      
      if (savedPrefs) {
        try {
          const parsed = JSON.parse(savedPrefs);
          setEmailPreferences({
            enabled: parsed.enabled ?? true,
            emailAddress: parsed.emailAddress || user.email || '',
            notifyOnNewFeedback: parsed.notifyOnNewFeedback ?? true,
            notifyOnNegativeFeedback: parsed.notifyOnNegativeFeedback ?? true,
            dailyDigest: parsed.dailyDigest ?? false
          });
        } catch (error) {
          console.error('Parse error:', error);
          setEmailPreferences(prev => ({
            ...prev,
            emailAddress: user.email || ''
          }));
        }
      } else {
        setEmailPreferences(prev => ({
          ...prev,
          emailAddress: user.email || ''
        }));
      }
    }
  }, [user?.id, user?.email]);

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

    return filtered;
  }, [feedbacks, filters]);

  const totalPages = useMemo(() => Math.ceil(filteredFeedbacks.length / itemsPerPage), [filteredFeedbacks.length, itemsPerPage]);
  
  const paginatedFeedbacks = useMemo(() => filteredFeedbacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ), [filteredFeedbacks, currentPage, itemsPerPage]);

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

  const ratingChartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.ratingDistribution).map(([rating, count]) => ({
      rating: `${rating} Star${rating !== '1' ? 's' : ''}`,
      count
    }));
  }, [stats]);

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

  // Conditional renders
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

  if (loadingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-red-950 p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-red-200 dark:border-red-800">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Feedback Access Locked</CardTitle>
            <p className="text-muted-foreground">
              {isTrialExpired 
                ? 'Your trial has expired. Upgrade to access feedback.'
                : isSubscriptionExpired
                ? 'Your subscription has expired. Renew to continue.'
                : 'Active subscription required to access feedback.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate('/billing')}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              size="lg"
            >
              <Crown className="h-5 w-5 mr-2" />
              {isSubscriptionExpired ? 'Renew Subscription' : 'Upgrade Now'}
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full"
            >
              Back to Dashboard
            </Button>
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
          <h1 className="text-3xl font-bold">Feedback Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered real-time insights • {filteredFeedbacks.length} total entries
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={exportToCSV} disabled={!hasAccess || filteredFeedbacks.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadFeedbackData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Email Notification Status Banner */}
      {emailPreferences.enabled && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Email notifications are <strong>enabled</strong> • Sending to {emailPreferences.emailAddress}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('notifications')}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              >
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              <CardTitle className="text-sm font-medium">Email Alerts</CardTitle>
              {emailPreferences.enabled ? (
                <Bell className="h-4 w-4 text-blue-500" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-400" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {emailPreferences.enabled ? 'Active' : 'Disabled'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {emailPreferences.enabled ? 'Real-time notifications' : 'Configure in settings'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="feedback">All Feedback</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle>Recent Feedback</CardTitle>
              <CardDescription>Latest customer feedback entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.recentFeedback.slice(0, 5).map((feedback) => (
                  <div key={feedback.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
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
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{feedback.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(feedback.created_at), 'MMM dd, yyyy • HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filter Feedback</CardTitle>
              <CardDescription>Refine results using filters below</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search feedback..."
                      value={filters.searchQuery}
                      onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Form Type</Label>
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
                  <Label>Rating</Label>
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
                  <Label>Sentiment</Label>
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Feedback Entries</CardTitle>
              <CardDescription>View and manage all feedback ({filteredFeedbacks.length} entries)</CardDescription>
            </CardHeader>
            <CardContent>
              {paginatedFeedbacks.length > 0 ? (
                <div className="space-y-4">
                  {paginatedFeedbacks.map((feedback) => (
                    <div 
                      key={feedback.id} 
                      className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => setSelectedFeedback(selectedFeedback?.id === feedback.id ? null : feedback)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <Badge variant="outline">
                            {feedback.form_type.replace('_', ' ')}
                          </Badge>
                          {feedback.sentiment && <SentimentBadge sentiment={feedback.sentiment} />}
                          {feedback.rating && (
                            <div className="flex items-center">
                              {Array.from({ length: feedback.rating }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(feedback.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        {feedback.message}
                      </p>
                      
                      {feedback.metadata?.email && (
                        <div className="flex items-center text-xs text-gray-500 mt-2">
                          <Mail className="h-3 w-3 mr-1" />
                          {feedback.metadata.email}
                        </div>
                      )}
                      
                      {selectedFeedback?.id === feedback.id && feedback.metadata && (
                        <div className="mt-3 pt-3 border-t space-y-2 text-xs">
                          {feedback.metadata.page_url && (
                            <div className="flex items-center">
                              <ExternalLink className="h-3 w-3 mr-2 text-gray-400" />
                              <a href={feedback.metadata.page_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {feedback.metadata.page_url}
                              </a>
                            </div>
                          )}
                          {feedback.metadata.browser && (
                            <div className="text-gray-500">
                              Browser: {feedback.metadata.browser}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-gray-600">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredFeedbacks.length)} of {filteredFeedbacks.length} entries
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No feedback found</h3>
                  <p className="text-gray-600">Try adjusting your filters or check back later</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
                <CardDescription>Breakdown of customer ratings</CardDescription>
              </CardHeader>
              <CardContent>
                {ratingChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={ratingChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="rating" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <Star className="h-12 w-12 mx-auto mb-2" />
                      <p>No rating data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form Type Distribution</CardTitle>
                <CardDescription>Breakdown by feedback type</CardDescription>
              </CardHeader>
              <CardContent>
                {stats && (stats.customerSatisfactionCount > 0 || stats.productFeedbackCount > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: 'Customer Satisfaction', value: stats.customerSatisfactionCount, color: '#3b82f6' },
                          { name: 'Product Feedback', value: stats.productFeedbackCount, color: '#10b981' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>No form type data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
              <CardDescription>AI-powered analysis of your feedback</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Most Common Rating</h4>
                    <Star className="h-4 w-4 text-yellow-500" />
                  </div>
                  <p className="text-2xl font-bold">
                    {stats && Object.entries(stats.ratingDistribution).reduce((a, b) => 
                      stats.ratingDistribution[parseInt(a[0])] > stats.ratingDistribution[parseInt(b[0])] ? a : b
                    )[0]} Stars
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Dominant Sentiment</h4>
                    <Sparkles className="h-4 w-4 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold capitalize">
                    {stats && Object.entries(stats.sentimentBreakdown).reduce((a, b) => 
                      a[1] > b[1] ? a : b
                    )[0]}
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Response Rate</h4>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">
                    {stats ? ((stats.totalFeedback / Math.max(stats.totalFeedback, 1)) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notification Settings
              </CardTitle>
              <CardDescription>
                Configure when and how you receive email alerts for new feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive real-time email alerts when new feedback arrives
                  </p>
                </div>
                <Switch
                  checked={emailPreferences.enabled}
                  onCheckedChange={(checked) => 
                    setEmailPreferences(prev => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-email">Notification Email Address</Label>
                <Input
                  id="notification-email"
                  type="email"
                  placeholder="your@email.com"
                  value={emailPreferences.emailAddress}
                  onChange={(e) => 
                    setEmailPreferences(prev => ({ ...prev, emailAddress: e.target.value }))
                  }
                  disabled={!emailPreferences.enabled}
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Notification Triggers</h4>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>All New Feedback</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified immediately when any feedback is submitted
                    </p>
                  </div>
                  <Switch
                    checked={emailPreferences.notifyOnNewFeedback}
                    onCheckedChange={(checked) => 
                      setEmailPreferences(prev => ({ ...prev, notifyOnNewFeedback: checked }))
                    }
                    disabled={!emailPreferences.enabled}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label>Negative Feedback Only</Label>
                    <p className="text-xs text-muted-foreground">
                      Only notify for low ratings (1-2 stars) or negative sentiment
                    </p>
                  </div>
                  <Switch
                    checked={emailPreferences.notifyOnNegativeFeedback}
                    onCheckedChange={(checked) => 
                      setEmailPreferences(prev => ({ ...prev, notifyOnNegativeFeedback: checked }))
                    }
                    disabled={!emailPreferences.enabled || !emailPreferences.notifyOnNewFeedback}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const saved = localStorage.getItem(`email_prefs_${user.id}`);
                    if (saved) {
                      setEmailPreferences(JSON.parse(saved));
                    }
                  }}
                  disabled={savingPreferences}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveEmailPreferences}
                  disabled={savingPreferences}
                >
                  {savingPreferences ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Test Email Notification</CardTitle>
              <CardDescription>
                Send a test email to verify your configuration is working
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!emailPreferences.enabled) {
                    toast.error('Enable email notifications first');
                    return;
                  }
                  
                  const testFeedback: Feedback = {
                    id: 'test-' + Date.now(),
                    project_id: feedbackSettings?.project_id || '',
                    user_id: user.id,
                    form_type: 'customer_satisfaction',
                    message: 'This is a test feedback notification. If you receive this email, your notifications are working correctly!',
                    rating: 5,
                    metadata: {},
                    created_at: new Date().toISOString(),
                    status: 'new',
                    sentiment: 'positive'
                  };
                  
                  await sendEmailNotification(testFeedback);
                }}
                disabled={!emailPreferences.enabled}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Test Email
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}