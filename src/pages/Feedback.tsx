// src/pages/Feedback.tsx
// ✅ FIXED: All hooks called unconditionally at the top

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  CheckCircle2, AlertTriangle, Copy, Bell, BellOff, Crown, Lock, Loader2
} from 'lucide-react';

import {
  AreaChart, Area, PieChart as RechartsPieChart, Cell, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
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
  // ✅ ALL HOOKS MUST BE CALLED FIRST - UNCONDITIONALLY
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const subscriptionStatus = useSubscriptionStatus({
    redirectOnExpiry: true,
    allowBillingPage: false
  });

  // ✅ Safe defaults
  const hasAccess = subscriptionStatus?.hasAccess ?? false;
  const loadingSubscription = subscriptionStatus?.isLoading ?? true;
  const isTrialExpired = subscriptionStatus?.isTrialExpired ?? false;
  const isSubscriptionExpired = subscriptionStatus?.isSubscriptionExpired ?? false;
  const daysLeft = subscriptionStatus?.daysLeft ?? 0;
  const status = subscriptionStatus?.status ?? 'inactive';
  
  // ✅ ALL STATE HOOKS TOGETHER
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
  const [aiProcessing, setAiProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [emailPreferences, setEmailPreferences] = useState<EmailNotificationPreferences>({
    enabled: true,
    emailAddress: user?.email || '',
    notifyOnNewFeedback: true,
    notifyOnNegativeFeedback: true,
    dailyDigest: false
  });
  const [savingPreferences, setSavingPreferences] = useState(false);

  // ✅ ALL CALLBACKS
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

  const sendEmailNotification = useCallback(async (feedback: Feedback) => {
    if (!emailPreferences.enabled || !emailPreferences.notifyOnNewFeedback) {
      console.log('Email notifications disabled, skipping...');
      return;
    }

    if (emailPreferences.notifyOnNegativeFeedback) {
      const sentiment = analyzeSentiment(feedback.message);
      if (sentiment !== 'negative' && (!feedback.rating || feedback.rating > 2)) {
        console.log('Not a negative feedback, skipping notification...');
        return;
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session for email notification');
        return;
      }

      const response = await fetch('/api/send-feedback-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          recipientEmail: emailPreferences.emailAddress,
          recipientName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
          feedbackType: feedback.form_type,
          feedbackMessage: feedback.message,
          feedbackRating: feedback.rating,
          feedbackId: feedback.id,
          timestamp: feedback.created_at,
          userId: user?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      console.log('✅ Email notification sent:', result);
      
      toast.success('Email notification sent', {
        description: 'You\'ve been notified about the new feedback',
        duration: 3000
      });

    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }, [emailPreferences, analyzeSentiment, user]);

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

      toast.success('Preferences saved', {
        description: 'Your email notification settings have been updated.'
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences', {
        description: 'Please try again.'
      });
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
  }, [feedbacks, filters]);

  // ✅ ALL useEffect HOOKS
  useEffect(() => {
    if (user && hasAccess) {
      loadFeedbackData();
    }
  }, [loadFeedbackData, user, hasAccess]);

  useEffect(() => {
    if (!user || !feedbackSettings || !hasAccess) return;

    console.log('🔔 Setting up real-time feedback listener...');

    const channel = supabase
      .channel(`feedback-changes-${feedbackSettings.project_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'feedback',
        filter: `project_id=eq.${feedbackSettings.project_id}`
      }, async (payload) => {
        console.log('🎉 New feedback received:', payload);
        const newFeedback = payload.new as Feedback;
        await sendEmailNotification(newFeedback);
        toast.success('New feedback received!', {
          description: 'Dashboard data has been updated.',
          icon: <Mail className="h-4 w-4" />
        });
        loadFeedbackData();
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('🔕 Cleaning up feedback listener...');
      supabase.removeChannel(channel);
    };
  }, [user, feedbackSettings, sendEmailNotification, loadFeedbackData, hasAccess]);

  useEffect(() => {
    if (user) {
      const savedPrefs = localStorage.getItem(`email_prefs_${user.id}`);
      if (savedPrefs) {
        try {
          const parsed = JSON.parse(savedPrefs);
          setEmailPreferences({
            ...parsed,
            emailAddress: parsed.emailAddress || user.email || ''
          });
        } catch (error) {
          console.error('Failed to parse email preferences:', error);
        }
      } else {
        setEmailPreferences(prev => ({
          ...prev,
          emailAddress: user.email || ''
        }));
      }
    }
  }, [user]);

  // ✅ ALL useMemo HOOKS
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

  // Component helper
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

  // ✅ NOW SAFE TO DO CONDITIONAL RENDERS
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
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold mb-4">Feedback Dashboard</h1>
        <p className="text-muted-foreground">
          Your feedback page is loading successfully! ✅
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {filteredFeedbacks.length} feedback entries • {stats?.totalFeedback || 0} total
        </p>
      </div>
    </div>
  );
}