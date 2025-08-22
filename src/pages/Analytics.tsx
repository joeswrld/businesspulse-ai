import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  BarChart3,
  Brain,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Target,
  ArrowUpRight,
  Users,
  Activity,
  Zap,
  Clock,
  Database,
  BarChart,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  DollarSign,
  Building,
  Globe,
  Rocket,
  Shield,
  Award,
  PieChart as PieChartIcon
} from 'lucide-react';

import {
  BarChart,
  Bar,
  PieChart,
  Cell,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface InsightData {
  id: string;
  user_id: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  key_themes: Array<{
    theme: string;
    confidence: number;
    frequency: string;
    description: string;
  } | string>;
  suggested_actions: Array<{
    action: string;
    priority: string;
    confidence: number;
    impact: string;
  } | string>;
  created_at: string;
  source_file?: string;
}

interface GeminiAnalyticsResponse {
  executive_summary: string;
  key_insights: string[];
  trends: string[];
  performance_metrics: {
    positive: number;
    negative: number;
    neutral: number;
  };
  recommended_actions: string[];
}

interface SentimentData {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
}

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const { checkUsage, incrementUsage, usage, resetUsage, refreshUsage } = useUsageTracking();
  
  // State for real-time data
  const [insightsData, setInsightsData] = useState<InsightData[]>([]);
  const [geminiAnalytics, setGeminiAnalytics] = useState<GeminiAnalyticsResponse | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRealTimeActive, setIsRealTimeActive] = useState(true);

  // Fetch insights data from Supabase
  const fetchInsightsData = useCallback(async () => {
    if (!user) {
      console.log('No user found, cannot fetch insights');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching insights for user:', user.id, user.email);
      
      const { data, error: fetchError } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Supabase fetch error:', fetchError);
        throw new Error(`Failed to fetch insights: ${fetchError.message}`);
      }

      console.log('Raw insights data from Supabase:', data);
      setInsightsData(data || []);
      setLastUpdated(new Date());
      console.log('Fetched insights data:', data?.length || 0, 'records');
      
      // Process data for charts
      processChartData(data || []);
      
      // If no data from Supabase, try localStorage as fallback
      if (!data || data.length === 0) {
        console.log('No Supabase data, checking localStorage...');
        const savedInsights = localStorage.getItem('insightsHistory');
        if (savedInsights) {
          try {
            const parsedInsights = JSON.parse(savedInsights);
            const userInsights = parsedInsights.filter((insight: any) => 
              insight.user_id === user.id
            );
            if (userInsights.length > 0) {
              console.log('Found insights in localStorage:', userInsights.length);
              setInsightsData(userInsights);
              processChartData(userInsights);
              toast.info('Loaded insights from local storage', {
                description: 'No data found in database, using local insights'
              });
            }
          } catch (error) {
            console.error('Error parsing localStorage insights:', error);
          }
        }
      }
      
    } catch (error) {
      console.error('Error fetching insights data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch insights data');
      toast.error('Failed to load insights data');
      
      // Try localStorage as fallback on error
      try {
        const savedInsights = localStorage.getItem('insightsHistory');
        if (savedInsights) {
          const parsedInsights = JSON.parse(savedInsights);
          const userInsights = parsedInsights.filter((insight: any) => 
            insight.user_id === user.id
          );
          if (userInsights.length > 0) {
            console.log('Fallback: Using localStorage insights:', userInsights.length);
            setInsightsData(userInsights);
            processChartData(userInsights);
            setError(null); // Clear error since we have fallback data
          }
        }
      } catch (localError) {
        console.error('Fallback localStorage also failed:', localError);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Process data for charts
  const processChartData = useCallback((insights: InsightData[]) => {
    if (!insights.length) {
      setSentimentData([]);
      setCategoryData([]);
      return;
    }

    // Process sentiment data for last 7 days
    const sentiment: SentimentData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayInsights = insights.filter(item => 
        item.created_at.startsWith(dateStr)
      );
      
      const positive = dayInsights.filter(item => item.sentiment === 'positive').length;
      const negative = dayInsights.filter(item => item.sentiment === 'negative').length;
      const neutral = dayInsights.filter(item => item.sentiment === 'neutral').length;
      
      sentiment.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        positive,
        negative,
        neutral
      });
    }
    setSentimentData(sentiment);

    // Process theme data from insights
    const themeCounts: Record<string, number> = {};
    insights.forEach(item => {
      if (Array.isArray(item.key_themes)) {
        item.key_themes.forEach(theme => {
          const themeText = typeof theme === 'string' ? theme : theme.theme;
          if (themeText) {
            themeCounts[themeText] = (themeCounts[themeText] || 0) + 1;
          }
        });
      }
    });
    
    const themes = Object.entries(themeCounts)
      .map(([theme, count]) => ({
        category: theme,
        count,
        percentage: (count / insights.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    
    setCategoryData(themes);
    
    // Update last updated time when charts are processed
    setLastUpdated(new Date());
  }, []);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscription for user:', user.id);
    
    const channel = supabase
      .channel('insights-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_insights',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Real-time insights change:', payload);
        
        if (payload.eventType === 'INSERT') {
          setInsightsData(prev => {
            const newData = [payload.new as InsightData, ...prev];
            // Process chart data with new data immediately
            setTimeout(() => processChartData(newData), 0);
            return newData;
          });
          toast.success('New insight received!', {
            description: 'Analytics updated in real-time'
          });
        } else if (payload.eventType === 'UPDATE') {
          setInsightsData(prev => {
            const updatedData = prev.map(item => 
              item.id === payload.new.id ? payload.new as InsightData : item
            );
            // Process chart data with updated data immediately
            setTimeout(() => processChartData(updatedData), 0);
            return updatedData;
          });
        } else if (payload.eventType === 'DELETE') {
          setInsightsData(prev => {
            const filteredData = prev.filter(item => item.id !== payload.old.id);
            // Process chart data with filtered data immediately
            setTimeout(() => processChartData(filteredData), 0);
            return filteredData;
          });
        }
      })
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, processChartData]);

  // Fetch initial data on mount
  useEffect(() => {
    fetchInsightsData();
  }, [fetchInsightsData]);

  // Listen for localStorage changes from InsightsPage
  useEffect(() => {
    if (!user) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'insightsHistory' && e.newValue) {
        try {
          const newInsights = JSON.parse(e.newValue);
          // Filter insights for current user
          const userInsights = newInsights.filter((insight: any) => 
            insight.user_id === user.id
          );
          
          if (userInsights.length !== insightsData.length) {
            const newCount = userInsights.length - insightsData.length;
            setInsightsData(userInsights);
            processChartData(userInsights);
            
            if (newCount > 0) {
              toast.success(`${newCount} new insight${newCount > 1 ? 's' : ''} received!`, {
                description: 'Analytics updated in real-time from local storage'
              });
            } else {
              toast.success('Insights updated!', {
                description: 'Analytics refreshed from local storage'
              });
            }
          }
        } catch (error) {
          console.error('Error parsing insights from localStorage:', error);
        }
      }
    };

    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', handleStorageChange);

    // Also check localStorage on mount for any existing data
    const savedInsights = localStorage.getItem('insightsHistory');
    if (savedInsights) {
      try {
        const parsedInsights = JSON.parse(savedInsights);
        const userInsights = parsedInsights.filter((insight: any) => 
          insight.user_id === user.id
        );
        if (userInsights.length > 0 && userInsights.length !== insightsData.length) {
          setInsightsData(userInsights);
          processChartData(userInsights);
        }
      } catch (error) {
        console.error('Error parsing insights from localStorage:', error);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, insightsData.length, processChartData]);

  // Generate Strategic Business Intelligence using AI
  const generateAIAnalytics = async () => {
    if (!user || !insightsData.length) {
      toast.error('No insights data available for strategic analysis');
      return;
    }

    // Check usage limits before proceeding
    const canGenerateAnalytics = await checkUsage('business_analytics', 1);
    if (!canGenerateAnalytics) {
      toast.error("Business Analytics limit reached. Please upgrade your plan to continue generating strategic intelligence.");
      return;
    }
    
    setGeneratingAI(true);
    setError(null);
    
    try {
      // Enhanced strategic analysis request
      const enhancedRequest = {
        user_id: user.id,
        insights_data: insightsData,
        strategic_focus: {
          business_intelligence: true,
          competitive_analysis: true,
          market_trends: true,
          risk_assessment: true,
          opportunity_identification: true,
          strategic_recommendations: true,
          performance_optimization: true,
          growth_strategy: true
        }
      };

      // Call the Supabase Edge Function for strategic business intelligence
      const { data, error } = await supabase.functions.invoke('generateAnalytics', {
        body: enhancedRequest
      });

      if (error) {
        throw new Error(`Strategic analysis error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No response from strategic intelligence service');
      }

      // Check if the response has the expected structure
      if (data.error) {
        throw new Error(data.error);
      }

      // Validate the response structure
      const requiredFields = ['executive_summary', 'key_insights', 'trends', 'performance_metrics', 'recommended_actions'];
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Invalid response structure. Missing fields: ${missingFields.join(', ')}`);
      }

      // Increment usage after successful analytics generation
      await incrementUsage('business_analytics', 1);

      setGeminiAnalytics(data);
      toast.success('Strategic Business Intelligence Generated! 🚀', {
        description: 'Your strategic insights and business intelligence are ready for executive decision-making'
      });
      
    } catch (error) {
      console.error('Error generating strategic business intelligence:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate strategic business intelligence';
      setError(errorMessage);
      toast.error('Failed to generate strategic business intelligence', {
        description: errorMessage
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  // Create sample insights data for testing
  const createSampleInsights = async () => {
    if (!user) return;
    
    try {
      setGeneratingAI(true);
      
      const sampleInsights: InsightData[] = [
        {
          id: `sample-${Date.now()}-1`,
          user_id: user.id,
          summary: "Customer feedback analysis shows positive sentiment towards new product features",
          sentiment: 'positive',
          key_themes: [
            { theme: "Product Features", confidence: 0.9, frequency: "High", description: "New features well received" },
            { theme: "User Experience", confidence: 0.8, frequency: "Medium", description: "Interface improvements noted" }
          ],
          suggested_actions: [
            { action: "Continue feature development", priority: "High", confidence: 0.9, impact: "High" },
            { action: "Gather more user feedback", priority: "Medium", confidence: 0.7, impact: "Medium" }
          ],
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          source_file: "customer_survey.csv"
        },
        {
          id: `sample-${Date.now()}-2`,
          user_id: user.id,
          summary: "Support ticket analysis reveals areas for improvement in customer service",
          sentiment: 'negative',
          key_themes: [
            { theme: "Customer Service", confidence: 0.8, frequency: "High", description: "Response time issues" },
            { theme: "Technical Issues", confidence: 0.7, frequency: "Medium", description: "Product bugs reported" }
          ],
          suggested_actions: [
            { action: "Improve response times", priority: "High", confidence: 0.9, impact: "High" },
            { action: "Fix reported bugs", priority: "High", confidence: 0.8, impact: "High" }
          ],
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          source_file: "support_tickets.csv"
        },
        {
          id: `sample-${Date.now()}-3`,
          user_id: user.id,
          summary: "Market analysis indicates strong competition in the current sector",
          sentiment: 'neutral',
          key_themes: [
            { theme: "Market Competition", confidence: 0.9, frequency: "High", description: "Competitive landscape analysis" },
            { theme: "Industry Trends", confidence: 0.8, frequency: "Medium", description: "Emerging market patterns" }
          ],
          suggested_actions: [
            { action: "Monitor competitor activities", priority: "Medium", confidence: 0.8, impact: "Medium" },
            { action: "Analyze market opportunities", priority: "Medium", confidence: 0.7, impact: "Medium" }
          ],
          created_at: new Date().toISOString(),
          source_file: "market_research.pdf"
        }
      ];

      // Save to localStorage
      const existingInsights = localStorage.getItem('insightsHistory');
      let allInsights = [];
      if (existingInsights) {
        try {
          allInsights = JSON.parse(existingInsights);
        } catch (error) {
          console.error('Error parsing existing insights:', error);
        }
      }
      
      const updatedInsights = [...sampleInsights, ...allInsights];
      localStorage.setItem('insightsHistory', JSON.stringify(updatedInsights));
      
      // Update state
      setInsightsData(sampleInsights);
      processChartData(sampleInsights);
      setLastUpdated(new Date());
      
      toast.success('Sample insights created!', {
        description: 'You can now generate AI analytics'
      });
      
    } catch (error) {
      console.error('Error creating sample insights:', error);
      toast.error('Failed to create sample insights');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await fetchInsightsData();
    setRefreshing(false);
  };

  // Calculate KPIs from insights data
  const totalInsights = insightsData.length;
  const positiveInsights = insightsData.filter(item => item.sentiment === 'positive').length;
  const negativeInsights = insightsData.filter(item => item.sentiment === 'negative').length;
  const neutralInsights = insightsData.filter(item => item.sentiment === 'neutral').length;
  
  const positivePercentage = totalInsights > 0 ? Math.round((positiveInsights / totalInsights) * 100) : 0;
  const negativePercentage = totalInsights > 0 ? Math.round((negativeInsights / totalInsights) * 100) : 0;
  const neutralPercentage = totalInsights > 0 ? Math.round((neutralInsights / totalInsights) * 100) : 0;

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Strategic Business Intelligence</h1>
          <p className="text-muted-foreground">Transform raw data into strategic insights with AI-powered analytics</p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`flex items-center gap-1 text-xs ${isRealTimeActive ? 'text-green-600' : 'text-gray-500'}`}>
              <div className={`w-2 h-2 rounded-full ${isRealTimeActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              {isRealTimeActive ? 'Live' : 'Offline'}
            </div>
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          
          {/* Real-Time Usage Indicator */}
          {user && (
            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <BarChart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900">Business Analytics Usage</h4>
                    <p className="text-sm text-green-700">
                      {usage.business_analytics.current} of {usage.business_analytics.limit === -1 ? '∞' : usage.business_analytics.limit} analytics generated
                      {usage.business_analytics.limit !== -1 && (
                        <span className="ml-2 text-xs">
                          ({Math.round((usage.business_analytics.current / usage.business_analytics.limit) * 100)}%)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">Real-time</span>
                </div>
              </div>
              {usage.business_analytics.limit !== -1 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-green-600 mb-1">
                    <span>Usage Progress</span>
                    <span>{usage.business_analytics.remaining} remaining</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        usage.business_analytics.current / usage.business_analytics.limit >= 0.9 
                          ? 'bg-red-500' 
                          : usage.business_analytics.current / usage.business_analytics.limit >= 0.75 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min((usage.business_analytics.current / usage.business_analytics.limit) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setIsRealTimeActive(!isRealTimeActive)}
            className={isRealTimeActive ? 'border-green-200 bg-green-50' : ''}
          >
            <Activity className={`h-4 w-4 mr-2 ${isRealTimeActive ? 'text-green-600' : 'text-gray-500'}`} />
            {isRealTimeActive ? 'Live' : 'Offline'}
          </Button>
          <Button 
            variant="outline" 
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="destructive" 
            onClick={async () => {
              if (!user) return;
              try {
                const confirmed = window.confirm('Reset analytics? This will clear generated analytics and reset your usage counters for today.');
                if (!confirmed) return;

                // Clear analytics data for this user
                const { error: delErr } = await supabase
                  .from('ai_insights')
                  .delete()
                  .eq('user_id', user.id);
                if (delErr) throw delErr;

                // Reset usage counters on server (business_analytics)
                await resetUsage('business_analytics');
                // Optionally reset AI insights usage as well
                await resetUsage('ai_insights');

                // Refresh UI
                await fetchInsightsData();
                await refreshUsage();
                toast.success('Analytics reset successfully');
              } catch (e: any) {
                console.error('Reset analytics failed:', e);
                toast.error('Failed to reset analytics');
              }
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)}
              className="mt-3"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Debug Information - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-sm text-blue-900">Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-blue-800 space-y-2">
            <div>User ID: {user?.id || 'Not authenticated'}</div>
            <div>User Email: {user?.email || 'Not available'}</div>
            <div>Total Insights: {totalInsights}</div>
            <div>Loading: {loading.toString()}</div>
            <div>Last Updated: {lastUpdated.toLocaleString()}</div>
            <div>Real-time Active: {isRealTimeActive.toString()}</div>
            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  console.log('Current insights data:', insightsData);
                  console.log('localStorage insights:', localStorage.getItem('insightsHistory'));
                }}
                className="text-xs"
              >
                Log Data to Console
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Insights
            </CardTitle>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-500" />
              {isRealTimeActive && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalInsights}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Activity className="h-3 w-3 mr-1 text-blue-500" />
              <span className="text-blue-500">Real-time</span>
              <span className="ml-1">data</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Positive Sentiment
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{positivePercentage}%</div>
            <Progress value={positivePercentage} className="mt-2" />
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span className="text-green-500">{positiveInsights} insights</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Negative Sentiment
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{negativePercentage}%</div>
            <Progress value={negativePercentage} className="mt-2" />
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span className="text-red-500">{negativeInsights} insights</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Neutral Sentiment
            </CardTitle>
            <Minus className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{neutralPercentage}%</div>
            <Progress value={neutralPercentage} className="mt-2" />
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span className="text-gray-500">{neutralInsights} insights</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Data Stream */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2 text-green-500" />
            Real-time Data Stream
            {isRealTimeActive && (
              <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </CardTitle>
          <CardDescription>
            Live updates from your insights and AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Connection Status:</span>
              <Badge variant={isRealTimeActive ? "default" : "secondary"}>
                {isRealTimeActive ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last Update:</span>
              <span className="font-mono text-xs">{lastUpdated.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data Source:</span>
              <span className="text-xs">Supabase + localStorage</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Records:</span>
              <span className="font-mono text-xs">{totalInsights}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Real-time Mode:</span>
              <Badge variant={isRealTimeActive ? "default" : "secondary"}>
                {isRealTimeActive ? "Active" : "Paused"}
              </Badge>
            </div>
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-2">Data Flow:</div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Supabase Realtime</span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>localStorage Sync</span>
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Chart Updates</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sentiment Trends Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
              Sentiment Trends (Last 7 Days)
              {isRealTimeActive && (
                <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              )}
            </CardTitle>
            <CardDescription>Daily sentiment analysis from insights</CardDescription>
          </CardHeader>
          <CardContent>
            {sentimentData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sentimentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="positive" fill="#10b981" name="Positive" />
                    <Bar dataKey="neutral" fill="#6b7280" name="Neutral" />
                    <Bar dataKey="negative" fill="#ef4444" name="Negative" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No sentiment data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2 text-green-500" />
              Key Themes
              {isRealTimeActive && (
                <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </CardTitle>
            <CardDescription>Distribution of insights by theme</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ category, percentage }) => `${category} ${percentage.toFixed(1)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gemini AI Analytics Section */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
            Strategic Business Intelligence Engine
          </CardTitle>
          <CardDescription>
            Transform raw data into strategic insights using AI-powered business intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!geminiAnalytics ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Ready to Generate Strategic Intelligence</h3>
                <p className="text-muted-foreground mb-4">
                  {totalInsights > 0 
                    ? `Transform ${totalInsights} insights into strategic business intelligence`
                    : 'No insights data available for strategic analysis'
                  }
                </p>
                
                {totalInsights === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      To get started, you can either:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button 
                        onClick={createSampleInsights}
                        disabled={generatingAI}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        {generatingAI ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Create Sample Data
                          </>
                        )}
                      </Button>
                      <Button 
                        onClick={() => window.open('/insights', '_blank')}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Go to Insights Page
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Sample data will be created locally for testing purposes
                    </p>
                  </div>
                ) : (
                  <Button 
                    onClick={generateAIAnalytics}
                    disabled={generatingAI}
                    className="w-full md:w-auto"
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing your business performance...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Generate AI Analytics
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Executive Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="h-5 w-5 mr-2 text-blue-500" />
                      Executive Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground leading-relaxed">
                      {geminiAnalytics.executive_summary}
                    </p>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-green-500" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {geminiAnalytics.performance_metrics.positive}%
                        </div>
                        <div className="text-xs text-muted-foreground">Positive</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {geminiAnalytics.performance_metrics.negative}%
                        </div>
                        <div className="text-xs text-muted-foreground">Negative</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">
                          {geminiAnalytics.performance_metrics.neutral}%
                        </div>
                        <div className="text-xs text-muted-foreground">Neutral</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Insights and Trends */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                        Key Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {geminiAnalytics.key_insights.map((insight, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2 text-purple-500" />
                        Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {geminiAnalytics.trends.map((trend, index) => (
                          <li key={index} className="flex items-start">
                            <ArrowUpRight className="h-4 w-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                            <span className="text-sm">{trend}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Recommended Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="h-5 w-5 mr-2 text-orange-500" />
                      Recommended Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {geminiAnalytics.recommended_actions.map((action, index) => (
                        <div key={index} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-start">
                            <Target className="h-4 w-4 mr-2 mt-0.5 text-orange-500 flex-shrink-0" />
                            <span className="text-sm text-orange-800">{action}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Regenerate Button */}
                <div className="text-center">
                  <Button 
                    onClick={generateAIAnalytics}
                    disabled={generatingAI}
                    variant="outline"
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Analytics
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;