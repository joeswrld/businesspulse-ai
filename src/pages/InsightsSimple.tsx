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
  User,
  Sparkles,
  AlertCircle,
  Star
} from 'lucide-react';

// Types matching your database schema
interface Feedback {
  id: string;
  project_id: string;
  user_id: string | null;
  form_type: 'customer_satisfaction' | 'product_feedback';
  message: string;
  rating: number | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface BehaviorAnalysis {
  id: string;
  session_id: string;
  feedback_id: string;
  rage_clicks: number;
  scroll_behavior_score: number;
  time_on_page_seconds: number;
  behavior_sentiment: 'positive' | 'negative' | 'neutral' | 'frustrated';
  ai_analysis: string;
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
  const [behaviorAnalyses, setBehaviorAnalyses] = useState<BehaviorAnalysis[]>([]);
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Dark mode detection
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    return () => observer.disconnect();
  }, []);

  // Fetch user's projects and feedbacks
  const fetchFeedbacks = useCallback(async () => {
    if (!user?.id) {
      console.log('No user logged in');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching feedback for user:', user.id);

      // Step 1: Get all projects owned by this user from feedback_settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id);

      if (settingsError) {
        console.error('Error fetching feedback_settings:', settingsError);
        throw new Error(`Failed to fetch projects: ${settingsError.message}`);
      }

      const userProjectIds = settingsData?.map(s => s.project_id) || [];
      console.log('📁 User projects:', userProjectIds);

      if (userProjectIds.length === 0) {
        console.log('⚠️ No projects found for user');
        setFeedbacks([]);
        setProjectIds([]);
        setLoading(false);
        return;
      }

      setProjectIds(userProjectIds);

      // Step 2: Fetch all feedback for these projects
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('id, project_id, user_id, form_type, message, rating, metadata, created_at')
        .in('project_id', userProjectIds)
        .order('created_at', { ascending: false });

      if (feedbackError) {
        console.error('❌ Error loading feedback:', feedbackError);
        throw new Error(`Failed to load feedback: ${feedbackError.message}`);
      }

      console.log('✅ Loaded feedbacks:', feedbackData?.length || 0);
      setFeedbacks(feedbackData || []);

      // Step 3: Try to fetch behavior analyses if the table exists
      if (feedbackData && feedbackData.length > 0) {
        const feedbackIds = feedbackData.map(f => f.id);
        
        try {
          const { data: behaviorData, error: behaviorError } = await supabase
            .from('behavior_analysis')
            .select('*')
            .in('feedback_id', feedbackIds);

          if (!behaviorError && behaviorData) {
            console.log('📊 Loaded behavior analyses:', behaviorData.length);
            setBehaviorAnalyses(behaviorData);
          }
        } catch (behaviorErr) {
          // Behavior analysis table might not exist - that's okay
          console.log('ℹ️ No behavior analysis data available');
        }
      }

      setError(null);
    } catch (error) {
      console.error('💥 Error in fetchFeedbacks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load feedback';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load feedbacks on mount
  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // Set up real-time subscription for feedback changes
  useEffect(() => {
    if (!user?.id || projectIds.length === 0) return;

    console.log('🔄 Setting up real-time subscription for projects:', projectIds);

    const channel = supabase
      .channel('feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
          filter: `project_id=in.(${projectIds.join(',')})`,
        },
        (payload) => {
          console.log('📡 Real-time update received:', payload);
          fetchFeedbacks();
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Unsubscribing from real-time updates');
      supabase.removeChannel(channel);
    };
  }, [user?.id, projectIds, fetchFeedbacks]);

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

  // Generate AI insights
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

      const selectedIds = Array.from(selectedFeedbacks);
      const selectedFeedbackData = feedbacks.filter(f => selectedIds.includes(f.id));

      // Create enhanced feedback text with context
      const feedbackText = selectedFeedbackData.map(f => {
        const behaviorAnalysis = behaviorAnalyses.find(b => b.feedback_id === f.id);
        let behaviorContext = '';
        
        if (behaviorAnalysis) {
          behaviorContext = `\n[Behavior: ${behaviorAnalysis.behavior_sentiment}, ${behaviorAnalysis.rage_clicks} rage clicks, ${behaviorAnalysis.time_on_page_seconds}s on page]`;
        }

        const ratingText = f.rating ? `\n[Rating: ${f.rating}/5 stars]` : '';
        const formType = `\n[Type: ${f.form_type.replace('_', ' ')}]`;
        
        return `[Feedback] ${f.message}${ratingText}${formType}${behaviorContext}`;
      }).join('\n\n');

      console.log('🤖 Generating AI insights for', selectedIds.length, 'feedbacks');
      console.log('📝 Feedback text length:', feedbackText.length, 'characters');

      // Get auth session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Authentication session not found. Please log in again.');
      }

      console.log('🔑 Auth session obtained, calling AI endpoint...');

      // Call AI analysis endpoint
      const response = await fetch(`https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/analyze-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          data: feedbackText,
          userId: user.id,
          fileType: 'feedback-analysis'
        }),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ AI Analysis complete:', result);

        if (!result.analysis) {
          throw new Error('Invalid response from analysis service. The AI did not return insights.');
        }

        setInsights(result.analysis);
        
        // Save the report to database
        try {
          const { error: reportError } = await supabase
            .from('reports')
            .insert({
              user_id: user.id,
              title: `Insight Report - ${new Date().toLocaleDateString()}`,
              feedback_ids: selectedIds,
              insights_text: JSON.stringify(result.analysis)
            });

          if (reportError) {
            console.error('⚠️ Error saving report:', reportError);
          } else {
            console.log('💾 Report saved successfully');
          }
        } catch (reportError) {
          console.error('⚠️ Error saving report:', reportError);
        }
        
        toast.success('Insights generated successfully!');
      } else {
        let errorText = 'Unknown error';
        let errorDetails = {};
        
        try {
          const errorJson = await response.json();
          errorDetails = errorJson;
          errorText = errorJson.error || JSON.stringify(errorJson);
        } catch {
          errorText = await response.text();
        }

        console.error('❌ AI Analysis failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          details: errorDetails
        });

        // Provide helpful error messages
        let userMessage = 'Analysis failed. ';
        if (response.status === 404) {
          userMessage += 'The AI service endpoint was not found. Please check your Gemini API configuration.';
        } else if (response.status === 401 || response.status === 403) {
          userMessage += 'Authentication failed. Please check your API keys and permissions.';
        } else if (response.status === 500) {
          userMessage += 'Server error. The issue might be with the Gemini API key or configuration. Please contact support.';
        } else {
          userMessage += `Error ${response.status}: ${errorText}`;
        }

        throw new Error(userMessage);
      }
    } catch (error) {
      console.error('💥 Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setGenerating(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Render star rating
  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`container mx-auto p-6 space-y-6 ${isDarkMode ? 'dark' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">AI Insights</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Analyze your feedback with AI-powered insights
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" />
            <div className="flex-1">
              <p className="text-red-800 dark:text-red-200">{error}</p>
              <button
                onClick={fetchFeedbacks}
                className="mt-2 px-3 py-1 text-sm border border-red-300 dark:border-red-700 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-800 dark:text-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Selection */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold flex items-center space-x-2 dark:text-gray-100">
            <MessageSquare className="h-5 w-5" />
            <span>Select Feedback for Analysis</span>
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Choose the feedback entries you want to analyze. You can select individual items or use "Select All".
          </p>
        </div>
        <div className="p-6 space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                disabled={feedbacks.length === 0}
                className="px-4 py-2 border dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {selectedFeedbacks.size === feedbacks.length && feedbacks.length > 0 ? (
                  <>
                    <Square className="h-4 w-4" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    <span>Select All</span>
                  </>
                )}
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedFeedbacks.size} of {feedbacks.length} selected
              </span>
            </div>
            <button
              onClick={generateInsights}
              disabled={selectedFeedbacks.size === 0 || generating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  <span>Generate Insights</span>
                </>
              )}
            </button>
          </div>

          {/* Feedbacks List */}
          {loading ? (
            <div className="flex items-center justify-center py-8 dark:text-gray-300">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading feedback...</span>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium">No feedback found</p>
              <p className="text-sm">You need to have feedback in your projects to generate insights.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {feedbacks.map((feedback) => (
                <div key={feedback.id} className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedFeedbacks.has(feedback.id)}
                      onChange={(e) => handleFeedbackSelection(feedback.id, e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 text-xs border dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 rounded flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{feedback.form_type.replace('_', ' ')}</span>
                          </span>
                          {feedback.rating && renderStars(feedback.rating)}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatTimestamp(feedback.created_at)}</span>
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-3">
                        {feedback.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Insights Results */}
      {insights && (
        <div className="bg-blue-50/30 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow">
          <div className="p-6 border-b border-blue-200 dark:border-blue-800">
            <h2 className="text-xl font-semibold flex items-center space-x-2 dark:text-gray-100">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>AI Insights</span>
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              AI-powered analysis of your selected feedback
            </p>
          </div>
          <div className="p-6 space-y-6">
            {/* Summary */}
            <div>
              <h3 className="text-lg font-semibold mb-3 dark:text-gray-100">Summary</h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{insights.summary}</p>
            </div>

            {/* Key Themes */}
            {insights.key_themes && insights.key_themes.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 dark:text-gray-100">Key Themes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {insights.key_themes.map((theme, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-700 dark:text-gray-300">{theme}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Actions */}
            {insights.suggested_actions && insights.suggested_actions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 dark:text-gray-100">Suggested Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {insights.suggested_actions.map((action, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                      <div className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full flex-shrink-0"></div>
                      <span className="text-gray-700 dark:text-gray-300">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Score */}
            {insights.performance && (
              <div>
                <h3 className="text-lg font-semibold mb-3 dark:text-gray-100">Performance Score</h3>
                <div className="flex items-center space-x-4">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {insights.performance.score}/100
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
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
                <h3 className="text-lg font-semibold mb-3 dark:text-gray-100">Sentiment Analysis</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Overall Sentiment</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    insights.sentiment.overall === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    insights.sentiment.overall === 'negative' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {insights.sentiment.overall}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {insights.sentiment.positive}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Positive</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {insights.sentiment.neutral}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Neutral</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {insights.sentiment.negative}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Negative</div>
                  </div>
                </div>
              </div>
            )}

            {/* Behavior Analysis Summary */}
            {behaviorAnalyses.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 dark:text-gray-100">Behavior Analysis Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">User Frustration Indicators</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="dark:text-gray-400">Rage Clicks</span>
                        <span className="font-medium dark:text-gray-200">
                          {behaviorAnalyses.reduce((sum, b) => sum + b.rage_clicks, 0)} total
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="dark:text-gray-400">Frustrated Sessions</span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {behaviorAnalyses.filter(b => b.behavior_sentiment === 'frustrated').length}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Engagement Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="dark:text-gray-400">Avg. Time on Page</span>
                        <span className="font-medium dark:text-gray-200">
                          {Math.round(behaviorAnalyses.reduce((sum, b) => sum + b.time_on_page_seconds, 0) / behaviorAnalyses.length)}s
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="dark:text-gray-400">Positive Sessions</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {behaviorAnalyses.filter(b => b.behavior_sentiment === 'positive').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsSimple;
