// src/pages/InsightsSimple.tsx
// Fixed version with correct JSX structure

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
  AlertCircle,
  Star,
  TrendingUp,
  Target,
  BarChart3,
  Lightbulb,
  Eye,
  Filter
} from 'lucide-react';

interface Feedback {
  id: string;
  message: string;
  rating: number | null;
  form_type: string;
  created_at: string;
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
      
      const totalRatings = selectedItems.filter(f => f.rating !== null).length;
      const avgRating = totalRatings > 0
        ? selectedItems.reduce((sum, f) => sum + (f.rating || 0), 0) / totalRatings
        : 0;
      
      const satisfactionRate = totalRatings > 0
        ? Math.round((selectedItems.filter(f => f.rating && f.rating >= 4).length / totalRatings) * 100)
        : 0;

      const positive = selectedItems.filter(f => f.rating && f.rating >= 4).length;
      const negative = selectedItems.filter(f => f.rating && f.rating <= 2).length;
      const neutral = selectedItems.filter(f => !f.rating || f.rating === 3).length;
      const total = selectedItems.length;

      const positivePercent = Math.round((positive / total) * 100);
      const negativePercent = Math.round((negative / total) * 100);
      const neutralPercent = Math.round((neutral / total) * 100);

      const overallSentiment = positivePercent > 50 ? 'positive' : negativePercent > 50 ? 'negative' : 'neutral';

      const messages = selectedItems.map(f => f.message.toLowerCase());
      const commonWords = ['good', 'great', 'excellent', 'poor', 'bad', 'issue', 'problem', 'love', 'like', 'improve'];
      const themes: string[] = [];
      
      commonWords.forEach(word => {
        const count = messages.filter(m => m.includes(word)).length;
        if (count > 0) {
          themes.push(`"${word}" mentioned ${count} time${count > 1 ? 's' : ''}`);
        }
      });

      const generatedInsights: Insights = {
        summary: `Analysis of ${selectedItems.length} feedback entries shows ${satisfactionRate}% satisfaction rate with an average rating of ${avgRating.toFixed(1)}/5. ${
          overallSentiment === 'positive' 
            ? 'Overall sentiment is positive.' 
            : overallSentiment === 'negative'
            ? 'Overall sentiment indicates areas needing improvement.'
            : 'Sentiment is mixed with room for enhancement.'
        }`,
        key_themes: themes.slice(0, 4).length > 0 ? themes.slice(0, 4) : ['No common themes detected'],
        suggested_actions: [
          avgRating < 3 ? 'Urgent: Address critical feedback issues' : 'Continue current service quality',
          negative > positive ? 'Focus on resolving customer pain points' : 'Maintain positive customer experience',
          'Follow up with customers who provided email addresses',
          'Analyze feedback patterns for product improvements'
        ],
        trends: [
          `${selectedItems.filter(f => f.form_type === 'customer_satisfaction').length} CSAT responses`,
          `${selectedItems.filter(f => f.form_type === 'product_feedback').length} Product feedback entries`
        ],
        performance: {
          metrics: [
            `${satisfactionRate}% satisfaction rate`,
            `${avgRating.toFixed(1)}/5 average rating`,
            `${selectedItems.length} total responses`
          ],
          score: satisfactionRate
        },
        sentiment: {
          positive: positivePercent,
          negative: negativePercent,
          neutral: neutralPercent,
          overall: overallSentiment as 'positive' | 'negative' | 'neutral'
        }
      };

      await new Promise(resolve => setTimeout(resolve, 2000));

      setInsights(generatedInsights);
      setShowInsights(true);
      
      toast({
        title: 'Insights Generated!',
        description: `Analysis complete for ${selectedItems.length} feedback entries.`
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate insights. Please try again.',
        variant: 'destructive'
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
            Transform your feedback into actionable insights with advanced AI analysis
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1 px-3 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700">
              <MessageSquare className="h-3 w-3" />
              <span>{feedbacks.length} Feedbacks</span>
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
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Select Feedback for Analysis</h2>
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
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Generate Insights</span>
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
                >
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 backdrop-blur-sm">
                    <div className="p-6 space-y-6">
                      <div className="flex items-center space-x-2 border-b border-blue-200 dark:border-blue-800 pb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                          <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">AI Insights</h2>
                      </div>

                      <div className="space-y-6">
                        <div className="rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-6 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-2 mb-4">
                            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Summary</h3>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {insights.summary}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-2 mb-4">
                              <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Performance Score</h3>
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                  {insights.performance.score}/100
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <div 
                                  className="bg-gradient-to-r from-purple-600 to-purple-400 h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${insights.performance.score}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-6 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-2 mb-4">
                              <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sentiment Analysis</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                  {insights.sentiment.positive}%
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Positive</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                  {insights.sentiment.neutral}%
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Neutral</div>
                              </div>
                              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                  {insights.sentiment.negative}%
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Negative</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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
