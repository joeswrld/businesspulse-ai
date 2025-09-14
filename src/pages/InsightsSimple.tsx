import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Brain, 
  Loader2, 
  CheckSquare, 
  Square, 
  MessageSquare, 
  Calendar,
  Mail,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

// Types
interface Feedback {
  id: string;
  message: string;
  email: string | null;
  created_at: string;
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

const InsightsSimple: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch feedbacks
  const fetchFeedbacks = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's project ID first
      const { data: projectData, error: projectError } = await supabase
        .rpc('get_or_create_feedback_settings', { p_user_id: user.id });
      
      if (projectError) {
        console.error('Error loading project ID:', projectError);
        setError('Failed to load project settings');
        return;
      }

      if (!projectData || projectData.length === 0) {
        setFeedbacks([]);
        return;
      }

      const projectId = projectData[0].project_id;

      // Fetch feedbacks for this project
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('id, message, email, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (feedbackError) {
        console.error('Error loading feedback:', feedbackError);
        setError('Failed to load feedback');
        return;
      }

      setFeedbacks(feedbackData || []);
    } catch (error) {
      console.error('Error in fetchFeedbacks:', error);
      setError('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load feedbacks on mount
  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
        },
        () => {
          // Refetch feedbacks when changes occur
          fetchFeedbacks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchFeedbacks]);

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
      setSelectedFeedbacks(new Set());
    } else {
      setSelectedFeedbacks(new Set(feedbacks.map(f => f.id)));
    }
  };

  // Generate insights
  const generateInsights = async () => {
    if (!user) {
      toast.error('Please log in to generate insights.');
      return;
    }

    if (selectedFeedbacks.size === 0) {
      toast.error('Please select at least one feedback to analyze.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      // Get selected feedback messages
      const selectedIds = Array.from(selectedFeedbacks);
      const selectedFeedbackData = feedbacks.filter(f => selectedIds.includes(f.id));

      const feedbackText = selectedFeedbackData.map(f => 
        `[${f.email || 'Anonymous'}] ${f.message}`
      ).join('\n\n');

      // Call the AI endpoint
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

      if (response.ok) {
        const result = await response.json();
        console.log('✅ AI Analysis success!');
        console.log('📊 Analysis result:', result.analysis);

        if (!result.analysis) {
          throw new Error('Invalid response from analysis service');
        }

        setInsights(result.analysis);
        toast.success('Insights generated successfully!');
      } else {
        const errorText = await response.text();
        console.warn('❌ AI Analysis failed:', response.status, errorText);
        throw new Error(`Analysis failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
      toast.error('Analysis failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
          <p className="text-gray-600 mt-2">
            Analyze your feedback with AI-powered insights
          </p>
        </div>
      </div>

      {/* Feedback Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
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
              onClick={generateInsights}
              disabled={selectedFeedbacks.size === 0 || generating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>

          {/* Feedbacks List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading feedback...</span>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No feedback found</p>
              <p className="text-sm">You need to have feedback in your projects to generate insights.</p>
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
                            {feedback.email ? (
                              <Badge variant="secondary" className="flex items-center space-x-1">
                                <Mail className="h-3 w-3" />
                                <span>{feedback.email}</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline">Anonymous</Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatTimestamp(feedback.created_at)}</span>
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

      {/* AI Insights Results */}
      {insights && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              <span>AI Insights</span>
            </CardTitle>
            <CardDescription>
              AI-powered analysis of your selected feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Summary</h3>
              <p className="text-gray-700 leading-relaxed">{insights.summary}</p>
            </div>

            {/* Key Themes */}
            {insights.key_themes && insights.key_themes.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Key Themes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {insights.key_themes.map((theme, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-white rounded-lg border">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-gray-700">{theme}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Actions */}
            {insights.suggested_actions && insights.suggested_actions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Suggested Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {insights.suggested_actions.map((action, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-white rounded-lg border">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="text-gray-700">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Score */}
            {insights.performance && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Performance Score</h3>
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-bold text-blue-600">
                    {insights.performance.score}/100
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${insights.performance.score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sentiment Analysis */}
            {insights.sentiment && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Sentiment Analysis</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Overall Sentiment</span>
                  <Badge 
                    variant={
                      insights.sentiment.overall === 'positive' ? 'default' : 
                      insights.sentiment.overall === 'negative' ? 'destructive' : 'secondary'
                    }
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InsightsSimple;