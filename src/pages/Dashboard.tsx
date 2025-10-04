// src/pages/Dashboard.tsx
// Integrated with subscription access control

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
    BarChart3,
    MessageSquare,
    CheckCircle,
    AlertCircle,
    Clock,
    RefreshCw,
    Crown,
    Calendar as CalendarIcon,
    TrendingUp,
    PieChart,
    LineChart,
    BarChart as BarChartIcon,
    Activity,
    Minus,
    Loader2,
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
}

interface FeedbackSettings {
    id: string;
    user_id: string;
    project_id: string;
    customer_survey_url: string;
    product_feedback_url: string;
    widget_code: string;
    created_at: string;
    updated_at: string;
}

interface DashboardMetrics {
    totalFeedback: number;
    positiveFeedback: number;
    negativeFeedback: number;
    neutralFeedback: number;
    averageRating: number;
    responseRate: number;
}

interface ChartData {
    date: string;
    count: number;
}

interface SentimentData {
    name: string;
    value: number;
    color: string;
}

interface RatingData {
    rating: string;
    count: number;
}

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Subscription status check
    const { hasAccess, isLoading: loadingSubscription, isTrialExpired, isSubscriptionExpired, daysLeft, status } = useSubscriptionStatus({
        redirectOnExpiry: true,
        allowBillingPage: false
    });

    // State management
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [feedbackSettings, setFeedbackSettings] = useState<FeedbackSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined
    });

    // Show loading while checking subscription
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

    // Show paywall if no access (backup to redirect)
    if (!hasAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-red-950 p-4">
                <Card className="w-full max-w-md shadow-2xl border-2 border-red-200 dark:border-red-800">
                    <CardHeader className="text-center space-y-4">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                            <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-2xl">Dashboard Access Locked</CardTitle>
                        <p className="text-muted-foreground">
                            {isTrialExpired 
                                ? 'Your free trial has expired. Upgrade to continue using NoteX.'
                                : isSubscriptionExpired
                                ? 'Your subscription has expired. Renew to restore access.'
                                : 'You need an active subscription to access the dashboard.'}
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
                            onClick={() => navigate('/')}
                            variant="outline"
                            className="w-full"
                        >
                            Go Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Sentiment analysis helper
    const analyzeSentiment = (message: string, rating: number | null): 'positive' | 'neutral' | 'negative' => {
        if (rating !== null) {
            if (rating >= 4) return 'positive';
            if (rating <= 2) return 'negative';
        }

        const lowerMessage = message.toLowerCase();
        const positiveWords = ['great', 'excellent', 'amazing', 'love', 'awesome', 'fantastic', 'good', 'best', 'wonderful'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'poor', 'disappointed', 'horrible', 'useless'];
        
        const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
        const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    };

    // Load dashboard data
    const loadDashboardData = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            const { data: existingSettings, error: settingsError } = await supabase
                .from('feedback_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (settingsError) {
                console.error('Error fetching feedback settings:', settingsError);
                throw new Error('Failed to load feedback settings');
            }

            let settings: FeedbackSettings | null = null;

            if (!existingSettings) {
                const newProjectId = crypto.randomUUID();
                const baseUrl = window.location.origin;
                
                const newSettings = {
                    user_id: user.id,
                    project_id: newProjectId,
                    customer_survey_url: `${baseUrl}/csat/${newProjectId}`,
                    product_feedback_url: `${baseUrl}/product-feedback/${newProjectId}`,
                    widget_code: `<script src="${baseUrl}/widget.js" data-project-id="${newProjectId}"></script>`
                };

                const { data: createdSettings, error: createError } = await supabase
                    .from('feedback_settings')
                    .insert(newSettings)
                    .select()
                    .single();

                if (createError) {
                    console.error('Error creating feedback settings:', createError);
                    throw new Error('Failed to create feedback settings');
                }

                settings = createdSettings;
            } else {
                settings = existingSettings;
            }

            setFeedbackSettings(settings);

            if (settings && settings.project_id) {
                const { data: feedbacksData, error: feedbacksError } = await supabase
                    .from('feedback')
                    .select('*')
                    .eq('project_id', settings.project_id)
                    .order('created_at', { ascending: false });

                if (feedbacksError) {
                    console.error('Error loading feedbacks:', feedbacksError);
                    throw new Error('Failed to load feedback data');
                }

                setFeedbacks(feedbacksData || []);
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            const errorMessage = error instanceof Error ? error.message : 'An error occurred while loading data';
            setError(errorMessage);
            toast.error('Dashboard Error', {
                description: errorMessage
            });
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Load data on component mount
    useEffect(() => {
        if (user && hasAccess) {
            loadDashboardData();
        }
    }, [loadDashboardData, user, hasAccess]);

    // Real-time subscriptions
    useEffect(() => {
        if (!user || !feedbackSettings || !hasAccess) return;

        const feedbackChannel = supabase
            .channel('dashboard-feedback-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'feedback',
                    filter: `project_id=eq.${feedbackSettings.project_id}`
                },
                (payload) => {
                    toast.success('New feedback received!', {
                        description: 'Dashboard data updated'
                    });
                    loadDashboardData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(feedbackChannel);
        };
    }, [user, feedbackSettings, loadDashboardData, hasAccess]);

    // Get date range for filtering
    const getDateRange = (): { start: Date; end: Date } => {
        const now = new Date();
        const end = customDateRange.to || now;
        const start = customDateRange.from || (() => {
            switch (dateRange) {
                case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                default: return new Date(0);
            }
        })();

        return { start, end };
    };

    // Calculate dashboard metrics
    const dashboardMetrics = useMemo((): DashboardMetrics => {
        const { start, end } = getDateRange();

        const filteredFeedbacks = feedbacks.filter(feedback => {
            const feedbackDate = new Date(feedback.created_at);
            return feedbackDate >= start && feedbackDate <= end;
        });

        const sentiments = filteredFeedbacks.map(fb => analyzeSentiment(fb.message, fb.rating));
        const positiveCount = sentiments.filter(s => s === 'positive').length;
        const negativeCount = sentiments.filter(s => s === 'negative').length;
        const neutralCount = sentiments.filter(s => s === 'neutral').length;

        const ratings = filteredFeedbacks.filter(fb => fb.rating !== null).map(fb => fb.rating!);
        const averageRating = ratings.length > 0 
            ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
            : 0;

        return {
            totalFeedback: filteredFeedbacks.length,
            positiveFeedback: positiveCount,
            negativeFeedback: negativeCount,
            neutralFeedback: neutralCount,
            averageRating,
            responseRate: 0
        };
    }, [feedbacks, dateRange, customDateRange]);

    // Calculate chart data
    const chartData = useMemo((): ChartData[] => {
        const { start, end } = getDateRange();

        const filteredFeedbacks = feedbacks.filter(feedback => {
            const feedbackDate = new Date(feedback.created_at);
            return feedbackDate >= start && feedbackDate <= end;
        });

        const volumeData: Record<string, number> = {};
        filteredFeedbacks.forEach(feedback => {
            const date = new Date(feedback.created_at).toISOString().split('T')[0];
            volumeData[date] = (volumeData[date] || 0) + 1;
        });

        return Object.entries(volumeData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));
    }, [feedbacks, dateRange, customDateRange]);

    // Calculate sentiment data
    const sentimentData = useMemo((): SentimentData[] => {
        return [
            { name: 'Positive', value: dashboardMetrics.positiveFeedback, color: '#10b981' },
            { name: 'Neutral', value: dashboardMetrics.neutralFeedback, color: '#f59e0b' },
            { name: 'Negative', value: dashboardMetrics.negativeFeedback, color: '#ef4444' }
        ].filter(item => item.value > 0);
    }, [dashboardMetrics]);

    // Calculate rating distribution
    const ratingData = useMemo((): RatingData[] => {
        const { start, end } = getDateRange();

        const filteredFeedbacks = feedbacks.filter(feedback => {
            const feedbackDate = new Date(feedback.created_at);
            return feedbackDate >= start && feedbackDate <= end && feedback.rating !== null;
        });

        const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        filteredFeedbacks.forEach(fb => {
            if (fb.rating) ratingCounts[fb.rating]++;
        });

        return [
            { rating: '5★', count: ratingCounts[5] },
            { rating: '4★', count: ratingCounts[4] },
            { rating: '3★', count: ratingCounts[3] },
            { rating: '2★', count: ratingCounts[2] },
            { rating: '1★', count: ratingCounts[1] }
        ];
    }, [feedbacks, dateRange, customDateRange]);

    // Get recent feedback
    const recentFeedbacks = useMemo(() => {
        const { start, end } = getDateRange();

        return feedbacks
            .filter(feedback => {
                const feedbackDate = new Date(feedback.created_at);
                return feedbackDate >= start && feedbackDate <= end;
            })
            .slice(0, 10);
    }, [feedbacks, dateRange, customDateRange]);

    // Format date
    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
        } catch {
            return dateString;
        }
    };

    // Get sentiment badge class
    const getSentimentBadgeClass = (sentiment: string) => {
        switch (sentiment) {
            case 'positive':
                return 'bg-green-100 text-green-800';
            case 'negative':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
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
                            <p className="text-gray-600">Please log in to access your dashboard.</p>
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
                        <h2 className="text-xl font-semibold mb-2">Loading Dashboard...</h2>
                        <p className="text-gray-600">Fetching your analytics...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Card className="w-full max-w-md">
                        <CardContent className="p-6">
                            <div className="text-center">
                                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold mb-2">Dashboard Error</h2>
                                <p className="text-gray-600 mb-4">{error}</p>
                                <Button onClick={loadDashboardData}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Try Again
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Show trial warning if trial is active but expiring soon
    const showTrialWarning = status === 'trial' && daysLeft <= 3 && daysLeft > 0;

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Trial Warning Banner */}
            {showTrialWarning && (
                <Alert className="border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
                    <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <AlertDescription className="text-orange-900 dark:text-orange-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <strong>Trial ending soon!</strong> You have {daysLeft} day{daysLeft !== 1 ? 's' : ''} left. Upgrade to keep your data and features.
                            </div>
                            <Button
                                onClick={() => navigate('/billing')}
                                size="sm"
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                Upgrade Now
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                    <p className="mt-2 flex items-center gap-2">
                        Real-time insights • {dashboardMetrics.totalFeedback} total feedback
                        {status === 'trial' && (
                            <Badge className="bg-primary/10 text-primary">
                                Trial: {daysLeft} days left
                            </Badge>
                        )}
                        {status === 'active' && (
                            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                                Active Subscription
                            </Badge>
                        )}
                    </p>
                </div>
                <Button variant="outline" onClick={loadDashboardData} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Date Range Filter */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">Date Range:</span>
                        </div>

                        <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7d">Last 7 Days</SelectItem>
                                <SelectItem value="30d">Last 30 Days</SelectItem>
                                <SelectItem value="90d">Last 90 Days</SelectItem>
                                <SelectItem value="all">All Time</SelectItem>
                            </SelectContent>
                        </Select>

                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-60 justify-start text-left font-normal",
                                        !customDateRange.from && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {customDateRange.from ? (
                                        customDateRange.to ? (
                                            <>
                                                {format(customDateRange.from, "LLL dd, y")} -{" "}
                                                {format(customDateRange.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(customDateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Custom Range</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={customDateRange.from}
                                    selected={customDateRange}
                                    onSelect={(range) => {
                                        setCustomDateRange(range || { from: undefined, to: undefined });
                                        setDatePickerOpen(false);
                                    }}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardMetrics.totalFeedback}</div>
                        <p className="text-xs text-muted-foreground">
                            {dateRange === 'all' ? 'All time' : `Last ${dateRange}`}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Positive</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {dashboardMetrics.totalFeedback > 0
                                ? Math.round((dashboardMetrics.positiveFeedback / dashboardMetrics.totalFeedback) * 100)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {dashboardMetrics.positiveFeedback} feedbacks
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Negative</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {dashboardMetrics.totalFeedback > 0
                                ? Math.round((dashboardMetrics.negativeFeedback / dashboardMetrics.totalFeedback) * 100)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {dashboardMetrics.negativeFeedback} feedbacks
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Neutral</CardTitle>
                        <Minus className="h-4 w-4 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-600">
                            {dashboardMetrics.totalFeedback > 0
                                ? Math.round((dashboardMetrics.neutralFeedback / dashboardMetrics.totalFeedback) * 100)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {dashboardMetrics.neutralFeedback} feedbacks
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {dashboardMetrics.averageRating > 0 
                                ? dashboardMetrics.averageRating.toFixed(1) 
                                : '--'}★
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Customer satisfaction
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Feedback Volume */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <LineChart className="h-5 w-5" />
                            <span>Feedback Volume Over Time</span>
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

                {/* Sentiment Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <PieChart className="h-5 w-5" />
                            <span>Sentiment</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {sentimentData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <RechartsPieChart>
                                    <Pie
                                        data={sentimentData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {sentimentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-gray-400">
                                No data
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Rating Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <BarChartIcon className="h-5 w-5" />
                            <span>Rating Distribution</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {ratingData.some(r => r.count > 0) ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <RechartsBarChart data={ratingData}>
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
                                    <Activity className="h-12 w-12 mx-auto mb-2" />
                                    <p>No rating data</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Feedback */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5" />
                            <span>Recent Feedback</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentFeedbacks.length > 0 ? (
                            <div className="space-y-4 max-h-80 overflow-y-auto">
                                {recentFeedbacks.map((feedback) => {
                                    const sentiment = analyzeSentiment(feedback.message, feedback.rating);
                                    return (
                                        <div key={feedback.id} className="border rounded-lg p-3 hover:bg-gray-50">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <Badge className={getSentimentBadgeClass(sentiment)}>
                                                        {sentiment}
                                                    </Badge>
                                                    {feedback.rating && (
                                                        <Badge variant="secondary">
                                                            {feedback.rating}⭐
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                                    <Clock className="h-3 w-3" />
                                                    <span className="text-xs">{formatDate(feedback.created_at)}</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-700 text-sm line-clamp-2">{feedback.message}</p>
                                            {feedback.metadata?.email && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    From: {feedback.metadata.email}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-xl font-medium text-gray-900 mb-2">
                                    No feedback yet
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Start collecting feedback to see insights.
                                </p>
                                <Button variant="outline" asChild>
                                    <a href="/feedback-settings">Setup Widget</a>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
