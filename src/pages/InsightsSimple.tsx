// src/pages/InsightsSimple.tsx
// Real AI-Powered Insights with 

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  Loader2, 
  CheckSquare, 
  Square, 
  MessageSquare, 
  Calendar,
  User,
  Sparkles,
  Star,
  TrendingUp,
  Target,
  BarChart3,
  Lightbulb,
  Filter,
  CheckCircle2,
  Hash,
  Activity,
  PieChart
} from 'lucide-react';

interface Feedback {
  id: string;
  message: string;
  rating: number | null;
  form_type: string;
  created_at: string;
  metadata?: any;
}

interface Insights {
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

export default function EnhancedInsightsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFeedbacks();
    }
  }, [user]);

  const fetchFeedbacks = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id)
        .single();

      if (settingsError) throw settingsError;

      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', settingsData.project_id)
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      setFeedbacks(feedbackData || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSelection = (feedbackId: string, checked: boolean) => {
    const newSelection = new Set(selectedFeedbacks);
    if (checked) {
      newSelection.add(feedbackId);
    } else {
      newSelection.delete(feedbackId);
    }
    setSelectedFeedbacks(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedFeedbacks.size === feedbacks.length) {
      setSelectedFeedbacks(new Set());
    } else {
      setSelectedFeedbacks(new Set(feedbacks.map(f => f.id)));
    }
  };

  const generateInsights = async () => {
    if (selectedFeedbacks.size === 0) return;

    setGenerating(true);

    try {
      const selectedItems = feedbacks.filter(f => selectedFeedbacks.has(f.id));
      
      // Prepare structured data for AI analysis
      const feedbackData = selectedItems.map(item => ({
        message: item.message,
        rating: item.rating,
        form_type: item.form_type,
        created_at: item.created_at,
        email: item.metadata?.email || null
      }));

      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      console.log('🤖 Calling AI analysis function...');

      // Call the Supabase Edge Function for AI analysis
      const { data, error } = await supabase.functions.invoke('analyze-insights', {
        body: {
          data: feedbackData,
          userId: user!.id,
          fileType: 'feedback'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('AI Analysis Error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate insights');
      }

      const analysis = data.analysis;

      // Validate the response structure
      if (!analysis || !analysis.summary || !analysis.sentiment) {
        throw new Error('Invalid AI response structure');
      }

      console.log('✅ AI Analysis received:', analysis);

      setInsights(analysis);
      setShowInsights(true);
      
      toast({
        title: '✨ AI Insights Generated!',
        description: `Real-time analysis complete for ${selectedItems.length} feedback entries.`,
        duration: 5000
      });
    } catch (error: any) {
      console.error('Error generating insights:', error);
      
      let errorMessage = 'Failed to generate insights. Please try again.';
      
      if (error.message?.includes('Usage limit')) {
        errorMessage = error.message;
      } else if (error.message?.includes('API key')) {
        errorMessage = 'AI service is not configured. Please contact support.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'AI service rate limit reached. Please try again in a few moments.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 7000
      });
    } finally {
      setGenerating(false);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-xs text-gray-400">No rating</span>;
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400 dark:fill-yellow-500 dark:text-yellow-500'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading feedback data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 transition-colors duration-300">
      <div className="container mx-auto p-6 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full transition-colors">
              <Brain className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              AI-Powered Insights
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Transform your feedback into actionable insights 
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1 px-3 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700">
              <MessageSquare className="h-3 w-3" />
              <span>{feedbacks.length} Feedbacks</span>
            </div>
            <div className="flex items-center space-x-1 px-3 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-full border border-purple-200 dark:border-purple-800">
              <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>

        {feedbacks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Feedback Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Share your feedback forms with customers to start collecting insights.
            </p>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-colors">
                <div className="p-6 space-y-6">
                  <div className="flex items-center space-x-2 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Select Feedback for AI Analysis</h2>
                  </div>
                  
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        {selectedFeedbacks.size === feedbacks.length ? (
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
                      <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full text-sm text-blue-700 dark:text-blue-300">
                        {selectedFeedbacks.size} of {feedbacks.length} selected
                      </div>
                    </div>
                    <button
                      onClick={generateInsights}
                      disabled={selectedFeedbacks.size === 0 || generating}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Analyzing with AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Generate AI Insights</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {feedbacks.map((feedback, index) => (
                      <motion.div
                        key={feedback.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="group rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800/50">
                          <div className="p-4">
                            <div className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={selectedFeedbacks.has(feedback.id)}
                                onChange={(e) => handleFeedbackSelection(feedback.id, e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
                                      <User className="h-3 w-3" />
                                      <span className="capitalize">{feedback.form_type.replace('_', ' ')}</span>
                                    </div>
                                    {renderStars(feedback.rating)}
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
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <AnimatePresence>
              {insights && showInsights && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  {/* Summary Section */}
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 backdrop-blur-sm">
                    <div className="p-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                          <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Executive Summary</h2>
                        <div className="ml-auto flex items-center space-x-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full text-xs text-purple-700 dark:text-purple-300">
                          <Sparkles className="h-3 w-3" />
                          <span>AI Generated</span>
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">
                        {insights.summary}
                      </p>
                    </div>
                  </div>

                  {/* Performance & Sentiment Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                      <div className="flex items-center space-x-2 mb-6">
                        <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Performance Score</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                            {insights.performance.score}/100
                          </span>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            insights.performance.score >= 80 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : insights.performance.score >= 60
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {insights.performance.score >= 80 ? 'Excellent' : insights.performance.score >= 60 ? 'Good' : 'Needs Work'}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                          <div 
                            className="bg-gradient-to-r from-purple-600 to-purple-400 h-4 rounded-full transition-all duration-1000"
                            style={{ width: `${insights.performance.score}%` }}
                          />
                        </div>
                        <div className="space-y-2 mt-4">
                          {insights.performance.metrics.map((metric, idx) => (
                            <div key={idx} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              <span>{metric}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                      <div className="flex items-center space-x-2 mb-6">
                        <PieChart className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Sentiment Analysis</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {insights.sentiment.positive}%
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">Positive</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-600">
                          <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                            {insights.sentiment.neutral}%
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">Neutral</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800">
                          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                            {insights.sentiment.negative}%
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">Negative</div>
                        </div>
                      </div>
                      <div className={`p-4 rounded-lg ${
                        insights.sentiment.overall === 'positive'
                          ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
                          : insights.sentiment.overall === 'negative'
                          ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600'
                      }`}>
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Overall Sentiment</div>
                          <div className={`text-xl font-bold capitalize ${
                            insights.sentiment.overall === 'positive'
                              ? 'text-green-600 dark:text-green-400'
                              : insights.sentiment.overall === 'negative'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {insights.sentiment.overall}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Themes */}
                  <div className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                    <div className="flex items-center space-x-2 mb-6">
                      <Lightbulb className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Key Themes</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {insights.key_themes.map((theme, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start space-x-3 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
                        >
                          <div className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-sm">
                            {idx + 1}
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 text-sm">{theme}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Actions */}
                  <div className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                    <div className="flex items-center space-x-2 mb-6">
                      <Target className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Suggested Actions</h3>
                    </div>
                    <div className="space-y-3">
                      {insights.suggested_actions.map((action, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start space-x-3 p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-800 hover:shadow-md transition-shadow"
                        >
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 flex-1">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trends */}
                  <div className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                    <div className="flex items-center space-x-2 mb-6">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Trends & Patterns</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {insights.trends.map((trend, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center space-x-3 p-4 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <div className="flex-shrink-0">
                            <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{trend}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={() => setShowInsights(false)}
                      className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg shadow-lg transition-all"
                    >
                      Hide Insights
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
