import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUsageEnforcement } from '@/hooks/useUsageEnforcement';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { useRealtimeFeedback } from '@/hooks/useRealtimeFeedback';
import { FeedbackBadgeGroup } from '@/components/ui/FeedbackBadge';
import { toast } from 'sonner';
import { 
  Brain, 
  RefreshCw, 
  History, 
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
  Eye,
  BarChart3,
  TrendingUp,
  Lightbulb,
  Target,
  MessageSquare,
  Calendar,
  ArrowRight,
  Loader2,
  CheckSquare,
  Square,
  Filter,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

interface InsightHistory {
  id: string;
  user_id: string;
  selected_feedback_ids: string[];
  analysis_result: GeminiAnalysis;
  created_at: string;
}

interface GeminiAnalysis {
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

const Insights: React.FC = () => {
  const { user } = useAuth();
  const { checkUsage, enforceUsage } = useUsageEnforcement();
  const { trackUsage } = useUsageTracking();
  
  // Use real-time feedback hook
  const { 
    feedbacks, 
    counts, 
    loading: feedbackLoading, 
    error: feedbackError, 
    realtimeStatus 
  } = useRealtimeFeedback();
  
  // State
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<GeminiAnalysis | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<InsightHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<InsightHistory | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('analysis');


  // Load analysis history
  const loadAnalysisHistory = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingHistory(true);
      setError(null);

      const { data: historyData, error: historyError } = await (supabase as any)
        .from('insights_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('Error loading analysis history:', historyError);
        setError('Failed to load analysis history');
        return;
      }

      setAnalysisHistory((historyData || []) as any);
    } catch (error) {
      console.error('Error in loadAnalysisHistory:', error);
      setError('Failed to load analysis history');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  // Load data on component mount
  useEffect(() => {
    loadAnalysisHistory();
  }, [loadAnalysisHistory]);

  // Handle feedback selection
  const handleFeedbackSelection = (feedbackId: string, checked: boolean) => {
    const newSelection = new Set(selectedFeedbacks);
    if (checked) {
      newSelection.add(feedbackId);
    } else {
      newSelection.delete(feedbackId);
    }
    setSelectedFeedbacks(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedFeedbacks.size === feedbacks.length && feedbacks.length > 0) {
      // Deselect all
      setSelectedFeedbacks(new Set());
    } else {
      // Select all available feedbacks
      setSelectedFeedbacks(new Set(feedbacks.map(f => f.id)));
    }
  };

  // Generate analysis from selected feedbacks
  const generateAnalysis = async () => {
    if (!user) {
      toast.error('Please log in to generate analysis.');
      return;
    }

    if (selectedFeedbacks.size === 0) {
      toast.error('Please select at least one feedback to analyze.');
      return;
    }

    // Check usage limits
    try {
      const canProceed = await checkUsage('insights');
      if (!canProceed) {
        const shouldUpgrade = await enforceUsage('insights');
        if (!shouldUpgrade) {
          return;
        }
      }
    } catch (error) {
      console.error('Usage check failed:', error);
      toast.error('Failed to check usage limits');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      setAnalysisProgress(0);

      // Get selected feedback messages
      const selectedFeedbackData = feedbacks.filter(f => selectedFeedbacks.has(f.id));
      const feedbackText = selectedFeedbackData.map(f => 
        `[${f.name || 'Anonymous'}] ${f.message}`
      ).join('\n\n');

      // Simulate analysis progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return 80;
          }
          return prev + 10;
        });
      }, 200);

      // Call the analyze-insights Edge Function
      const session = await supabase.auth.getSession();
      if (session.error || !session.data.session) {
        throw new Error('Authentication session not found');
      }

      const response = await fetch(`https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/analyze-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          data: feedbackText,
          userId: user.id,
          fileType: 'feedback-analysis'
        }),
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Edge Function success!');
        console.log('📊 Analysis result:', result.analysis);

        if (!result.analysis) {
          console.error('❌ Missing analysis in response:', result);
          throw new Error('Invalid response from analysis service');
        }

        // Track usage after successful analysis
        await trackUsage('insights');

        // Save to insights history
        try {
          const { error: insertError } = await (supabase as any)
            .from('insights_history')
            .insert({
              user_id: user.id,
              selected_feedback_ids: Array.from(selectedFeedbacks),
              analysis_result: result.analysis
            });

          if (insertError) {
            console.warn('Failed to save to history, but analysis completed:', insertError);
            toast.warning('Analysis completed but failed to save to history.');
          } else {
            // Reload history
            await loadAnalysisHistory();
          }
        } catch (dbError) {
          console.warn('Database error, but analysis completed:', dbError);
          toast.warning('Analysis completed but failed to save to history.');
        }

        setCurrentAnalysis(result.analysis);
        setActiveTab('results');
        toast.success('Analysis completed successfully!');
      } else {
        const errorText = await response.text();
        console.warn('❌ Edge Function failed:', response.status, errorText);
        throw new Error(`Analysis failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
      toast.error('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get feedback count by status
  const getFeedbackCountByStatus = (status: string) => {
    return feedbacks.filter(f => f.status === status).length;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Insights Analysis</h1>
          <p className="text-gray-600 mt-2">
            Analyze your user feedback with AI-powered insights
          </p>
          <div className="flex items-center space-x-4 mt-3">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-green-500' : 
                realtimeStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="capitalize">{realtimeStatus}</span>
            </div>
            <FeedbackBadgeGroup counts={counts} />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              loadAnalysisHistory();
            }}
            disabled={isLoadingHistory}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Feedback Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                <p className="text-2xl font-bold text-gray-900">{feedbacks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">New</p>
                <p className="text-2xl font-bold text-gray-900">{getFeedbackCountByStatus('new')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Reviewed</p>
                <p className="text-2xl font-bold text-gray-900">{getFeedbackCountByStatus('reviewed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{getFeedbackCountByStatus('resolved')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>Select Feedback for Analysis</span>
              </CardTitle>
              <CardDescription>
                Choose the feedback entries you want to analyze. You can select individual items or use "Select All".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={handleSelectAll}
                    disabled={feedbacks.length === 0}
                  >
                    {selectedFeedbacks.size === feedbacks.length && feedbacks.length > 0 ? (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Select All
                      </>
                    )}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {selectedFeedbacks.size} of {feedbacks.length} selected
                  </span>
                </div>
                <Button
                  onClick={generateAnalysis}
                  disabled={selectedFeedbacks.size === 0 || isAnalyzing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Analysis
                    </>
                  )}
                </Button>
              </div>

              {/* Analysis Progress */}
              {isAnalyzing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Analyzing feedback...</span>
                    <span>{analysisProgress}%</span>
                  </div>
                  <Progress value={analysisProgress} className="w-full" />
                </div>
              )}

              {/* Feedbacks List */}
              {feedbackLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading feedbacks...</span>
                </div>
              ) : feedbacks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No feedbacks found</p>
                  <p className="text-sm">You need to have feedbacks in your projects to generate insights.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {feedbacks.map((feedback) => (
                    <Card key={feedback.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={selectedFeedbacks.has(feedback.id)}
                            onCheckedChange={(checked) => 
                              handleFeedbackSelection(feedback.id, checked as boolean)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">
                                  {feedback.name || 'Anonymous'}
                                </span>
                                <Badge variant={feedback.status === 'new' ? 'default' : feedback.status === 'reviewed' ? 'secondary' : 'outline'}>
                                  {feedback.status}
                                </Badge>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatTimestamp(feedback.timestamp)}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm line-clamp-3">
                              {feedback.message}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {currentAnalysis ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                    <span>Analysis Results</span>
                  </CardTitle>
                  <CardDescription>
                    AI-powered insights based on your selected feedback
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Summary */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Summary</h3>
                    <p className="text-gray-700 leading-relaxed">{currentAnalysis.summary}</p>
                  </div>

                  {/* Key Themes */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Key Themes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {currentAnalysis.key_themes.map((theme, index) => (
                        <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-700">{theme}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Actions */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Suggested Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {currentAnalysis.suggested_actions.map((action, index) => (
                        <div key={index} className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                          <span className="text-gray-700">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trends */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Trends</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {currentAnalysis.trends.map((trend, index) => (
                        <div key={index} className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-gray-700">{trend}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Overall Score</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={currentAnalysis.performance.score} className="w-24" />
                          <span className="font-semibold">{currentAnalysis.performance.score}/100</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {currentAnalysis.performance.metrics.map((metric, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-700">{metric}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sentiment Analysis */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Sentiment Analysis</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Overall Sentiment</span>
                        <Badge 
                          variant={
                            currentAnalysis.sentiment.overall === 'positive' ? 'default' : 
                            currentAnalysis.sentiment.overall === 'negative' ? 'destructive' : 'secondary'
                          }
                          className="text-sm"
                        >
                          {currentAnalysis.sentiment.overall}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {currentAnalysis.sentiment.positive}%
                          </div>
                          <div className="text-sm text-gray-600">Positive</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600">
                            {currentAnalysis.sentiment.neutral}%
                          </div>
                          <div className="text-sm text-gray-600">Neutral</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {currentAnalysis.sentiment.negative}%
                          </div>
                          <div className="text-sm text-gray-600">Negative</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Brain className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-medium">No Analysis Results</p>
              <p className="text-sm">Generate an analysis by selecting feedbacks and clicking "Generate Analysis".</p>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Analysis History</span>
              </CardTitle>
              <CardDescription>
                View your previous analysis results and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading history...</span>
                </div>
              ) : analysisHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No Analysis History</p>
                  <p className="text-sm">Your analysis history will appear here after you generate insights.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analysisHistory.map((historyItem) => (
                    <Collapsible key={historyItem.id}>
                      <CollapsibleTrigger asChild>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <div>
                                  <p className="font-medium text-gray-900">
                                    Analysis from {formatTimestamp(historyItem.created_at)}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {historyItem.selected_feedback_ids.length} feedbacks analyzed
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">
                                  Score: {historyItem.analysis_result.performance.score}/100
                                </Badge>
                                <Badge 
                                  variant={
                                    historyItem.analysis_result.sentiment.overall === 'positive' ? 'default' : 
                                    historyItem.analysis_result.sentiment.overall === 'negative' ? 'destructive' : 'secondary'
                                  }
                                >
                                  {historyItem.analysis_result.sentiment.overall}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Card className="mt-2 ml-6">
                          <CardContent className="p-4 space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Summary</h4>
                              <p className="text-gray-700 text-sm">{historyItem.analysis_result.summary}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold mb-2">Key Themes</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                  {historyItem.analysis_result.key_themes.slice(0, 3).map((theme, index) => (
                                    <li key={index} className="flex items-center space-x-2">
                                      <Target className="h-3 w-3 text-blue-600" />
                                      <span>{theme}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">Top Actions</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                  {historyItem.analysis_result.suggested_actions.slice(0, 3).map((action, index) => (
                                    <li key={index} className="flex items-center space-x-2">
                                      <ArrowRight className="h-3 w-3 text-blue-600" />
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCurrentAnalysis(historyItem.analysis_result);
                                  setActiveTab('results');
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Full Analysis
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Download analysis as JSON
                                  const dataStr = JSON.stringify(historyItem.analysis_result, null, 2);
                                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                                  const url = URL.createObjectURL(dataBlob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `analysis-${historyItem.id}.json`;
                                  link.click();
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Insights;