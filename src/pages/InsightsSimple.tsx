import React, { useState, useEffect, useCallback } from 'react';
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

// Mock data for demonstration
const mockFeedbacks = [
  {
    id: '1',
    message: 'The new dashboard is amazing! Love the analytics features.',
    rating: 5,
    form_type: 'product_feedback',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    message: 'Customer support response time could be improved.',
    rating: 3,
    form_type: 'customer_satisfaction',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    message: 'The mobile app needs better navigation.',
    rating: 2,
    form_type: 'product_feedback',
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
];

const mockInsights = {
  summary: "Overall customer sentiment is positive with 67% satisfaction. Key areas for improvement include customer support response times and mobile app navigation.",
  key_themes: [
    "Dashboard improvements praised",
    "Support response time concerns",
    "Mobile UX needs work",
    "Analytics features well-received"
  ],
  suggested_actions: [
    "Increase support team capacity",
    "Redesign mobile navigation",
    "Continue dashboard enhancements",
    "Gather more mobile feedback"
  ],
  trends: ["Increasing mobile usage", "Growing demand for analytics"],
  performance: {
    metrics: ["67% satisfaction rate", "3.3/5 average rating"],
    score: 67
  },
  sentiment: {
    positive: 45,
    negative: 25,
    neutral: 30,
    overall: 'neutral' as const
  }
};

export default function EnhancedInsightsPage() {
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<typeof mockInsights | null>(null);
  const [showInsights, setShowInsights] = useState(false);

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
    if (selectedFeedbacks.size === mockFeedbacks.length) {
      setSelectedFeedbacks(new Set());
    } else {
      setSelectedFeedbacks(new Set(mockFeedbacks.map(f => f.id)));
    }
  };

  const generateInsights = () => {
    setGenerating(true);
    setTimeout(() => {
      setInsights(mockInsights);
      setShowInsights(true);
      setGenerating(false);
    }, 2000);
  };

  const renderStars = (rating: number) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 transition-colors duration-300">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
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
              <Eye className="h-3 w-3" />
              <span>3 Projects</span>
            </div>
            <div className="flex items-center space-x-1 px-3 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700">
              <MessageSquare className="h-3 w-3" />
              <span>{mockFeedbacks.length} Feedbacks</span>
            </div>
          </div>
        </motion.div>

        {/* Feedback Selection Card */}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose the feedback entries you want to analyze. You can select individual items or use "Select All".
              </p>

              {/* Selection Controls */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    {selectedFeedbacks.size === mockFeedbacks.length ? (
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
                    {selectedFeedbacks.size} of {mockFeedbacks.length} selected
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

              <div className="h-px bg-gray-200 dark:bg-gray-700" />

              {/* Feedbacks List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {mockFeedbacks.map((feedback, index) => (
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

        {/* AI Insights Results */}
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
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI-powered analysis of your selected feedback
                  </p>

                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-6 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2 mb-4">
                        <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Summary</h3>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {insights.summary}
                      </p>
                    </div>

                    {/* Key Themes */}
                    <div className="rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-6 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Key Themes</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {insights.key_themes.map((theme, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                          >
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{theme}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suggested Actions */}
                    <div className="rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-6 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2 mb-4">
                        <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Suggested Actions</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {insights.suggested_actions.map((action, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                          >
                            <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                            <span className="text-gray-700 dark:text-gray-300 text-sm">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Performance Score & Sentiment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Performance Score */}
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
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              insights.performance.score >= 80 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                : insights.performance.score >= 60 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            }`}>
                              {insights.performance.score >= 80 ? "Excellent" : insights.performance.score >= 60 ? "Good" : "Needs Improvement"}
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div 
                              className="bg-gradient-to-r from-purple-600 to-purple-400 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${insights.performance.score}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sentiment Analysis */}
                      <div className="rounded-lg bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2 mb-4">
                          <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sentiment Analysis</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-gray-400 text-sm">Overall Sentiment</span>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              insights.sentiment.overall === 'positive' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : insights.sentiment.overall === 'negative' 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            }`}>
                              {insights.sentiment.overall}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {insights.sentiment.positive}%
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Positive</div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                {insights.sentiment.neutral}%
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Neutral</div>
                            </div>
                            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
