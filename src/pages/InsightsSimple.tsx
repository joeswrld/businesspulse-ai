import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
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
  Star,
  TrendingUp,
  Target,
  BarChart3,
  Lightbulb,
  RefreshCw,
  Eye,
  Filter
} from 'lucide-react';

// Import shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

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
  const [showInsights, setShowInsights] = useState(false);

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
      let feedbackText = selectedFeedbackData.map(f => {
        const behaviorAnalysis = behaviorAnalyses.find(b => b.feedback_id === f.id);
        let behaviorContext = '';
        
        if (behaviorAnalysis) {
          behaviorContext = `\n[Behavior: ${behaviorAnalysis.behavior_sentiment}, ${behaviorAnalysis.rage_clicks} rage clicks, ${behaviorAnalysis.time_on_page_seconds}s on page]`;
        }

        const ratingText = f.rating ? `\n[Rating: ${f.rating}/5 stars]` : '';
        const formType = `\n[Type: ${f.form_type.replace('_', ' ')}]`;
        
        return `[Feedback] ${f.message}${ratingText}${formType}${behaviorContext}`;
      }).join('\n\n');

      // Truncate input if too large to prevent MAX_TOKENS errors
      const MAX_INPUT_LENGTH = 8000; // characters
      if (feedbackText.length > MAX_INPUT_LENGTH) {
        const originalLength = feedbackText.length;
        feedbackText = feedbackText.substring(0, MAX_INPUT_LENGTH) + '\n...[truncated for length]';
        console.log(`⚠️ Input truncated from ${originalLength} to ${MAX_INPUT_LENGTH} characters`);
        toast.warning('Large dataset detected, generating condensed insights...', { duration: 3000 });
      }

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
        setShowInsights(true);
        
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
        } else if (errorText.includes('MAX_TOKENS') || errorText.includes('output token limit')) {
          userMessage = 'Large dataset detected. The analysis exceeded the token limit. Please try with fewer feedback entries (recommended: 10-15 items) or contact support for large datasets.';
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const insightCardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Brain className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI-Powered Insights
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Transform your feedback into actionable insights with advanced AI analysis
          </p>
          {projectIds.length > 0 && (
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>{projectIds.length} Project{projectIds.length !== 1 ? 's' : ''}</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3" />
                <span>{feedbacks.length} Feedback{feedbacks.length !== 1 ? 's' : ''}</span>
              </Badge>
            </div>
          )}
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchFeedbacks}
                    className="ml-4"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Feedback Selection Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Select Feedback for Analysis</span>
                </CardTitle>
                <CardDescription>
                  Choose the feedback entries you want to analyze. You can select individual items or use "Select All".
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selection Controls */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      onClick={handleSelectAll}
                      disabled={feedbacks.length === 0}
                      className="flex items-center space-x-2"
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
                    </Button>
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <span>{selectedFeedbacks.size} of {feedbacks.length} selected</span>
                    </Badge>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {selectedFeedbacks.size > 20 && (
                      <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center space-x-1">
                        <AlertCircle className="h-4 w-4" />
                        <span>Large selection detected. Analysis may take longer.</span>
                      </div>
                    )}
                    <Button
                      onClick={generateInsights}
                      disabled={selectedFeedbacks.size === 0 || generating}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Generating Insights...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          <span>Generate Insights</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Feedbacks List */}
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start space-x-3 p-4">
                        <Skeleton className="h-4 w-4 rounded mt-1" />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      No feedback found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      You need to have feedback in your projects to generate insights.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {feedbacks.map((feedback, index) => (
                      <motion.div
                        key={feedback.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group"
                      >
                        <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedFeedbacks.has(feedback.id)}
                                onChange={(e) => handleFeedbackSelection(feedback.id, e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="flex items-center space-x-1">
                                      <User className="h-3 w-3" />
                                      <span className="capitalize">{feedback.form_type.replace('_', ' ')}</span>
                                    </Badge>
                                    {feedback.rating && renderStars(feedback.rating)}
                                  </div>
                                  <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatTimestamp(feedback.created_at)}</span>
                                  </div>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed line-clamp-3">
                                  {feedback.message}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Insights Results */}
          <AnimatePresence>
            {insights && showInsights && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-2xl">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span>AI Insights</span>
                    </CardTitle>
                    <CardDescription>
                      AI-powered analysis of your selected feedback
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {/* Summary */}
                    <motion.div
                      variants={insightCardVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span>Summary</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {insights.summary}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Key Themes */}
                    {insights.key_themes && insights.key_themes.length > 0 && (
                      <motion.div
                        variants={insightCardVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.1 }}
                      >
                        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                              <span>Key Themes</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {insights.key_themes.map((theme, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 + index * 0.1 }}
                                  className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                                >
                                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                                  <span className="text-gray-700 dark:text-gray-300">{theme}</span>
                                </motion.div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {/* Suggested Actions */}
                    {insights.suggested_actions && insights.suggested_actions.length > 0 && (
                      <motion.div
                        variants={insightCardVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.2 }}
                      >
                        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                              <span>Suggested Actions</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {insights.suggested_actions.map((action, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 + index * 0.1 }}
                                  className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                                >
                                  <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                                  <span className="text-gray-700 dark:text-gray-300">{action}</span>
                                </motion.div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {/* Performance Score */}
                    {insights.performance && (
                      <motion.div
                        variants={insightCardVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.3 }}
                      >
                        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              <span>Performance Score</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                  {insights.performance.score}/100
                                </span>
                                <Badge 
                                  variant={insights.performance.score >= 80 ? "default" : insights.performance.score >= 60 ? "secondary" : "destructive"}
                                  className="text-sm"
                                >
                                  {insights.performance.score >= 80 ? "Excellent" : insights.performance.score >= 60 ? "Good" : "Needs Improvement"}
                                </Badge>
                              </div>
                              <Progress 
                                value={insights.performance.score} 
                                className="h-3"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {/* Sentiment Analysis */}
                    {insights.sentiment && (
                      <motion.div
                        variants={insightCardVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.4 }}
                      >
                        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              <span>Sentiment Analysis</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Overall Sentiment</span>
                                <Badge 
                                  variant={
                                    insights.sentiment.overall === 'positive' ? "default" :
                                    insights.sentiment.overall === 'negative' ? "destructive" : "secondary"
                                  }
                                >
                                  {insights.sentiment.overall}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {insights.sentiment.positive}%
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">Positive</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                    {insights.sentiment.neutral}%
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">Neutral</div>
                                </div>
                                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    {insights.sentiment.negative}%
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">Negative</div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {/* Behavior Analysis Summary */}
                    {behaviorAnalyses.length > 0 && (
                      <motion.div
                        variants={insightCardVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: 0.5 }}
                      >
                        <Card className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Eye className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                              <span>Behavior Analysis Summary</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card className="bg-white dark:bg-gray-700">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    User Frustration Indicators
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Rage Clicks</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {behaviorAnalyses.reduce((sum, b) => sum + b.rage_clicks, 0)} total
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Frustrated Sessions</span>
                                    <span className="font-medium text-red-600 dark:text-red-400">
                                      {behaviorAnalyses.filter(b => b.behavior_sentiment === 'frustrated').length}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                              
                              <Card className="bg-white dark:bg-gray-700">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Engagement Metrics
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Avg. Time on Page</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {Math.round(behaviorAnalyses.reduce((sum, b) => sum + b.time_on_page_seconds, 0) / behaviorAnalyses.length)}s
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Positive Sessions</span>
                                    <span className="font-medium text-green-600 dark:text-green-400">
                                      {behaviorAnalyses.filter(b => b.behavior_sentiment === 'positive').length}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default InsightsSimple;