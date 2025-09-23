import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
    BarChart3,
    Users,
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
    Zap,
    Minus
} from 'lucide-react';

import OnboardingChecklist from '@/components/OnboardingChecklist';
import GuidedTour from '@/components/GuidedTour';
import { useOnboarding } from '@/hooks/useOnboarding';

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
    email: string | null;
    message: string;
    page_url: string | null;
    browser: string | null;
    sentiment: 'positive' | 'negative' | 'neutral' | null;
    timestamp: string;
}

interface Insight {
    id: string;
    user_id: string;
    file_id: string;
    file_name: string;
    summary: string;
    key_themes: string[];
    suggested_actions: string[];
    sentiment: any;
    performance: any;
    trends: string[];
    created_at: string;
}

interface Profile {
    id: string;
    user_id: string | null;
    email: string | null;
    full_name: string | null;
    plan: string | null;
    trial_end: string | null;
    created_at: string;
}

interface DashboardMetrics {
    totalFeedback: number;
    positiveFeedback: number;
    negativeFeedback: number;
    neutralFeedback: number;
    activeUsers: number;
    currentPlan: string;
}

interface ChartData {
    date: string;
    count: number;
}

interface ThemeData {
    theme: string;
    count: number;
}

interface SentimentData {
    name: string;
    value: number;
    color: string;
}

export default function Dashboard() {
    const { user } = useAuth();

    // State management
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined
    });
    const [showTour, setShowTour] = useState(false);
    const { isNewUser } = useOnboarding();

    // Load dashboard data
    const loadDashboardData = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            // Get user's project IDs from feedback_settings
            const { data: settingsData, error: settingsError } = await supabase
                .from('feedback_settings')
                .select('project_id')
                .eq('user_id', user.id);

            if (settingsError) {
                console.error('Error loading feedback settings:', settingsError);
                throw settingsError;
            }

            const projectIds = settingsData?.map(s => s.project_id) || [];

            // Load all data in parallel
            const [feedbacksResult, insightsResult, profileResult] = await Promise.all([
                // Load feedbacks
                projectIds.length > 0
                    ? supabase
                        .from('feedback')
                        .select('*')
                        .in('project_id', projectIds)
                        .order('created_at', { ascending: false })
                    : Promise.resolve({ data: [], error: null }),

                // Load insights
                supabase
                    .from('insights_results')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false }),

                // Load profile
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()
            ]);

            if (feedbacksResult.error) {
                console.error('Error loading feedbacks:', feedbacksResult.error);
                throw feedbacksResult.error;
            }

            if (insightsResult.error) {
                console.error('Error loading insights:', insightsResult.error);
                throw insightsResult.error;
            }

            if (profileResult.error && profileResult.error.code !== 'PGRST116') {
                console.error('Error loading profile:', profileResult.error);
                throw profileResult.error;
            }

            setFeedbacks(feedbacksResult.data || []);
            setInsights(insightsResult.data || []);
            setProfile(profileResult.data || null);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            setError(error instanceof Error ? error.message : 'An error occurred while loading data');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Load data on component mount
    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [loadDashboardData, user]);

    // Set up real-time subscriptions
    useEffect(() => {
        if (!user) return;

        // Subscribe to feedback changes
        const feedbackChannel = supabase
            .channel('dashboard-feedback-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'feedbacks'
                },
                (payload) => {
                    console.log('Feedback change received in dashboard:', payload);
                    loadDashboardData(); // Reload all data when feedback changes
                }
            )
            .subscribe();

        // Subscribe to insights changes
        const insightsChannel = supabase
            .channel('dashboard-insights-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'insights_results',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Insights change received in dashboard:', payload);
                    loadDashboardData(); // Reload all data when insights change
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(feedbackChannel);
            supabase.removeChannel(insightsChannel);
        };
    }, [user, loadDashboardData]);

    // Refresh data when date range changes
    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [dateRange, customDateRange, loadDashboardData, user]);

    // Get sentiment from database or fallback to analysis
    const getSentiment = (feedback: Feedback): 'positive' | 'negative' | 'neutral' => {
        if (feedback.sentiment) {
            return feedback.sentiment;
        }

        // Fallback to client-side analysis if no sentiment in database
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

        const messageLower = feedback.message.toLowerCase();
        const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
        const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;

        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    };

    // Get date range for filtering
    const getDateRange = (): { start: Date; end: Date } => {
        const now = new Date();
        const end = customDateRange.to || now;
        const start = customDateRange.from || (() => {
            switch (dateRange) {
                case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                default: return new Date(0); // All time
            }
        })();

        return { start, end };
    };

    // Calculate dashboard metrics
    const dashboardMetrics = useMemo((): DashboardMetrics => {
        const { start, end } = getDateRange();

        // Filter feedbacks by date range
        const filteredFeedbacks = feedbacks.filter(feedback => {
            const feedbackDate = new Date(feedback.created_at);
            return feedbackDate >= start && feedbackDate <= end;
        });

        // Calculate sentiment counts
        const sentiments = filteredFeedbacks.map(feedback => getSentiment(feedback));
        const positiveCount = sentiments.filter(s => s === 'positive').length;
        const negativeCount = sentiments.filter(s => s === 'negative').length;
        const neutralCount = sentiments.filter(s => s === 'neutral').length;

        // Calculate active users (unique emails)
        const uniqueUsers = new Set(
            filteredFeedbacks
                .map(f => f.email)
                .filter(email => email && email.trim() !== '')
        );

        return {
            totalFeedback: filteredFeedbacks.length,
            positiveFeedback: positiveCount,
            negativeFeedback: negativeCount,
            neutralFeedback: neutralCount,
            activeUsers: uniqueUsers.size,
            currentPlan: profile?.plan || 'Free Trial'
        };
    }, [feedbacks, profile, dateRange, customDateRange]);

    // Calculate chart data
    const chartData = useMemo((): ChartData[] => {
        const { start, end } = getDateRange();

        const filteredFeedbacks = feedbacks.filter(feedback => {
            const feedbackDate = new Date(feedback.created_at);
            return feedbackDate >= start && feedbackDate <= end;
        });

        // Group by date
        const volumeData: Record<string, number> = {};
        filteredFeedbacks.forEach(feedback => {
            const date = new Date(feedback.created_at).toISOString().split('T')[0];
            volumeData[date] = (volumeData[date] || 0) + 1;
        });

        return Object.entries(volumeData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));
    }, [feedbacks, dateRange, customDateRange]);

    // Calculate sentiment data for pie chart
    const sentimentData = useMemo((): SentimentData[] => {
        const { start, end } = getDateRange();

        const filteredFeedbacks = feedbacks.filter(feedback => {
            const feedbackDate = new Date(feedback.created_at);
            return feedbackDate >= start && feedbackDate <= end;
        });

        const sentiments = filteredFeedbacks.map(feedback => getSentiment(feedback));
        const positiveCount = sentiments.filter(s => s === 'positive').length;
        const negativeCount = sentiments.filter(s => s === 'negative').length;
        const neutralCount = sentiments.filter(s => s === 'neutral').length;

        return [
            { name: 'Positive', value: positiveCount, color: '#10b981' },
            { name: 'Neutral', value: neutralCount, color: '#f59e0b' },
            { name: 'Negative', value: negativeCount, color: '#ef4444' }
        ];
    }, [feedbacks, dateRange, customDateRange]);

    // Calculate top themes from insights
    const topThemes = useMemo((): ThemeData[] => {
        const { start, end } = getDateRange();

        const filteredInsights = insights.filter(insight => {
            const insightDate = new Date(insight.created_at);
            return insightDate >= start && insightDate <= end;
        });

        // Flatten all themes from insights
        const allThemes = filteredInsights.flatMap(insight => insight.key_themes || []);

        // Count theme occurrences
        const themeCounts: Record<string, number> = {};
        allThemes.forEach(theme => {
            themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        });

        return Object.entries(themeCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([theme, count]) => ({ theme, count }));
    }, [insights, dateRange, customDateRange]);

    // Get recent feedback for the feed
    const recentFeedbacks = useMemo(() => {
        const { start, end } = getDateRange();

        return feedbacks
            .filter(feedback => {
                const feedbackDate = new Date(feedback.created_at);
                return feedbackDate >= start && feedbackDate <= end;
            })
            .slice(0, 10); // Show latest 10
    }, [feedbacks, dateRange, customDateRange]);

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
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
                        <p className="text-gray-600 mb-2">Please wait while we fetch your data.</p>
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
                        <h2 className="text-xl font-semibold mb-2">Dashboard Error</h2>
                        <p className="text-gray-600 mb-4">
                            There was an issue loading your dashboard data.
                        </p>
                        <Button onClick={() => {
                            setError(null);
                            setLoading(true);
                            loadDashboardData();
                        }}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">Error: {error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Guided Tour */}
            <GuidedTour run={showTour} onComplete={() => setShowTour(false)} />

            {/* Header */}
            <div className="flex items-center justify-between" data-tour="dashboard-welcome">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-primary-foreground ">Analytics Dashboard</h1>
                    <p className="text-gray-600 dark:text-primary-foreground mt-2">
                        Real-time insights into your feedback data
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    {isNewUser && (
                        <Button
                            variant="outline"
                            onClick={() => setShowTour(true)}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Take Tour
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={loadDashboardData}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Onboarding Checklist */}
            {isNewUser && (
                <div data-tour="onboarding-checklist">
                    <OnboardingChecklist />
                </div>
            )}

            {/* Date Range Filter */}
            <Card className="rounded-xl shadow-lg">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">Date Range:</span>
                        </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6" data-tour="feedback-metrics">
                {/* Total Feedback */}
                <Card className="rounded-xl shadow-lg">
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

                {/* Positive Feedback */}
                <Card className="rounded-xl shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Positive Feedback</CardTitle>
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

                {/* Negative Feedback */}
                <Card className="rounded-xl shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Negative Feedback</CardTitle>
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

                {/* Neutral Feedback */}
                <Card className="rounded-xl shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Neutral Feedback</CardTitle>
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

                {/* Active Users */}
                <Card className="rounded-xl shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {dashboardMetrics.activeUsers}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Unique feedback providers
                        </p>
                    </CardContent>
                </Card>

                {/* Current Plan */}
                <Card className="rounded-xl shadow-lg border-2   ">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                        <Crown className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-blue-900 mb-2">
                            {dashboardMetrics.currentPlan}
                        </div>
                        <div className="text-sm text-blue-700 mb-3">
                            {profile?.trial_end ? (
                                `Trial ends ${format(new Date(profile.trial_end), 'MMM dd, yyyy')}`
                            ) : (
                                'Active subscription'
                            )}
                        </div>
                        <Button
                            size="sm"
                            className="w-full text-xs"
                            asChild
                        >
                            <a href="/billing">
                                {dashboardMetrics.currentPlan === 'Free Trial' ? 'Upgrade Now' : 'Manage Plan'}
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-tour="feedback-charts">
                {/* Feedback Volume Over Time */}
                <Card className="rounded-xl shadow-lg lg:col-span-2">
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
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={chartData}>
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
                                <div className="text-center">
                                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                    <p>No volume data available</p>
                                    <p className="text-sm text-gray-400">Start collecting feedback to see trends</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sentiment Breakdown */}
                <Card className="rounded-xl shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <PieChart className="h-5 w-5" />
                            <span>Sentiment Breakdown</span>
                        </CardTitle>
                        <CardDescription>
                            Distribution of feedback sentiment
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dashboardMetrics.totalFeedback > 0 ? (
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
                            <div className="flex items-center justify-center h-64 text-gray-500">
                                No sentiment data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row - Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 5 Themes */}
                <Card className="rounded-xl shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <BarChartIcon className="h-5 w-5" />
                            <span>Top 5 Themes</span>
                        </CardTitle>
                        <CardDescription>
                            Most frequently mentioned themes from insights
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {topThemes.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <RechartsBarChart data={topThemes}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="theme" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip formatter={(value: any) => [value, 'Mentions']} />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-64 text-gray-500">
                                <div className="text-center">
                                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                    <p>No theme data available</p>
                                    <p className="text-sm text-gray-400">Generate insights to see themes</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Feedback Feed */}
                <Card className="rounded-xl shadow-lg" data-tour="recent-feedback">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <MessageSquare className="h-5 w-5" />
                            <span>Recent Feedback Feed</span>
                        </CardTitle>
                        <CardDescription>
                            Latest feedback entries with sentiment analysis
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentFeedbacks.length > 0 ? (
                            <div className="space-y-4 max-h-80 overflow-y-auto">
                                {recentFeedbacks.map((feedback) => (
                                    <div key={feedback.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {feedback.email || 'Anonymous'}
                        </span>
                                                <Badge variant={getSentimentBadgeVariant(getSentiment(feedback)) as any}>
                                                    {getSentiment(feedback)}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                                <Clock className="h-4 w-4" />
                                                <span>{formatDate(feedback.created_at)}</span>
                                            </div>
                                        </div>
                                        <p className="text-gray-700 text-sm line-clamp-2">{feedback.message}</p>
                                        {feedback.page_url && (
                                            <p className="text-xs text-gray-500 mt-1 truncate">
                                                From: {feedback.page_url}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-xl font-medium text-gray-900 mb-2">
                                    No feedback yet
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Start collecting feedback through your widget to see insights and analytics.
                                </p>
                                <Button variant="outline" asChild>
                                    <a href="/feedback-settings">Configure Widget</a>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
