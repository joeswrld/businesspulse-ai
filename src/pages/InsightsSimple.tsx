import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useNavigate } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Loader2, 
  MessageSquare,
  Sparkles,
  Save,
  Download,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  Zap,
  CheckSquare,
  Square,
  Star,
  Calendar,
  User,
  TrendingUp,
  Target,
  Lightbulb,
  CheckCircle2,
  Activity
} from 'lucide-react';
import jsPDF from 'jspdf';

interface Feedback {
  id: string;
  message: string;
  rating: number | null;
  form_type: string;
  created_at: string;
  metadata?: any;
}

interface SavedInsight {
  id: string;
  title: string;
  details: string;
  created_at: string;
  feedback_count?: number;
}

interface GeneratedInsight {
  title: string;
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

export default function InsightsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    hasAccess,
    isLoading: loadingSubscription,
    isTrialExpired,
    isSubscriptionExpired,
    daysLeft,
    status
  } = useSubscriptionStatus({
    redirectOnExpiry: true,
    allowBillingPage: false
  });
  
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<GeneratedInsight | null>(null);
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
   
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
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-red-950 p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-red-200 dark:border-red-800">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">AI Insights Access Locked</CardTitle>
            <p className="text-muted-foreground">
              {isTrialExpired 
                ? 'Your trial has expired. Upgrade to access AI insights.'
                : isSubscriptionExpired
                ? 'Your subscription has expired. Renew to continue.'
                : 'Active subscription required to access AI insights.'}
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
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Existing useEffect / fetch functions remain unchanged ---

  useEffect(() => {
    if (user) {
      if (activeTab === 'generate') {
        fetchFeedbacks();
      } else {
        fetchHistory();
      }
    }
  }, [user, activeTab]);

  const fetchFeedbacks = async () => {
    if (!user) return;

    setLoadingFeedbacks(true);
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
      setLoadingFeedbacks(false);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch history error:', error);
        throw error;
      }
      
      setSavedInsights(data || []);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load insights history',
        variant: 'destructive'
      });
    } finally {
      setLoadingHistory(false);
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

  const generateInsight = async () => {
    if (!hasAccess) {
      toast({
        title: 'No Feedback Selected',
        description: 'Please select at least one feedback to generate insights',
        variant: 'destructive'
      });
      return;
    }

    setGenerating(true);
    try {
      const selectedItems = feedbacks.filter(f => selectedFeedbacks.has(f.id));
      
      const feedbackData = selectedItems.map(item => ({
        message: item.message,
        rating: item.rating,
        form_type: item.form_type,
        created_at: item.created_at,
        email: item.metadata?.email || null
      }));

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

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

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate insight');

      const analysis = data.analysis;

      if (!analysis || !analysis.summary || !analysis.sentiment) {
        throw new Error('Invalid AI response structure');
      }

      setCurrentInsight(analysis);
      
      toast({
        title: '✨ Insights Generated!',
        description: `Analysis complete for ${selectedItems.length} feedback entries`,
        duration: 3000
      });
    } catch (error: any) {
      console.error('Error generating insight:', error);
      
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

  const saveInsight = async () => {
    if (!currentInsight || !user) {
      toast({
        title: 'Error',
        description: 'No insight to save or user not authenticated',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const detailsText = `Summary:\n${currentInsight.summary}\n\nKey Themes:\n${currentInsight.key_themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nSuggested Actions:\n${currentInsight.suggested_actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nTrends:\n${currentInsight.trends.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nPerformance Score: ${currentInsight.performance.score}/100\nSentiment: ${currentInsight.sentiment.overall} (${currentInsight.sentiment.positive}% positive, ${currentInsight.sentiment.neutral}% neutral, ${currentInsight.sentiment.negative}% negative)`;

      const insertData = {
        user_id: user.id,
        title: currentInsight.title || 'AI Insight Analysis',
        details: detailsText,
        feedback_count: selectedFeedbacks.size
      };

      console.log('Attempting to insert:', insertData);

      const { data, error } = await supabase
        .from('insights')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Insert successful:', data);

      toast({
        title: '💾 Saved!',
        description: 'Insight saved to your history',
        duration: 3000
      });

      if (activeTab === 'history') {
        await fetchHistory();
      }
    } catch (error: any) {
      console.error('Error saving insight:', error);
      
      let errorMessage = 'Failed to save insight';
      
      if (error.message?.includes('permission') || error.code === 'PGRST301' || error.code === '42501') {
        errorMessage = 'Permission denied. Please check your database RLS policies.';
      } else if (error.code === '23505') {
        errorMessage = 'This insight already exists.';
      } else if (error.message?.includes('JWT') || error.message?.includes('token')) {
        errorMessage = 'Session expired. Please refresh the page and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadPDF = (title: string, content: string) => {
    try {
      if (!title || !content) {
        throw new Error('Missing title or content for PDF generation');
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = 20;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const safeTitle = String(title).substring(0, 100);
      const titleLines = doc.splitTextToSize(safeTitle, maxWidth);
      doc.text(titleLines, margin, yPosition);
      yPosition += titleLines.length * 7 + 5;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 12;
      
      doc.setFontSize(10);
      const safeContent = String(content);
      const contentLines = doc.splitTextToSize(safeContent, maxWidth);
      
      contentLines.forEach((line: string) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin, yPosition);
        yPosition += 6;
      });
      
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `NoteX AI Insights | Page ${i} of ${totalPages}`,
          margin,
          pageHeight - 10
        );
      }
      
      const filename = `${safeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      doc.save(filename);
      
      toast({
        title: '📥 Downloaded!',
        description: 'PDF saved successfully',
        duration: 2000
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const deleteInsight = async (id: string) => {
    try {
      const { error } = await supabase
        .from('insights')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      setSavedInsights(prev => prev.filter(i => i.id !== id));
      
      toast({
        title: 'Deleted',
        description: 'Insight removed from history',
        duration: 2000
      });
    } catch (error) {
      console.error('Error deleting insight:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete insight',
        variant: 'destructive'
      });
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
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Insights
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Generate actionable insights from your feedback
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={generateInsight}
            disabled={selectedFeedbacks.size === 0 || generating || !hasAccess}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'generate'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Generate</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <History className="h-4 w-4" />
              <span>History</span>
              {savedInsights.length > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {savedInsights.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="space-y-6">
            {loadingFeedbacks ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600 dark:text-gray-400">Loading feedbacks...</p>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Feedback Available
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Collect feedback to generate AI insights
                </p>
              </div>
            ) : (
              <>
                {/* Feedback Selection */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleSelectAll}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {selectedFeedbacks.size === feedbacks.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedFeedbacks.size} of {feedbacks.length} selected
                      </span>
                    </div>
                    <button
                      onClick={generateInsight}
                      disabled={selectedFeedbacks.size === 0 || generating || !hasAccess}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
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

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {feedbacks.map((feedback) => (
                      <div
                        key={feedback.id}
                        className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFeedbacks.has(feedback.id)}
                          onChange={(e) => handleFeedbackSelection(feedback.id, e.target.checked)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                {feedback.form_type.replace('_', ' ')}
                              </span>
                              {renderStars(feedback.rating)}
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(feedback.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            {feedback.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generated Insights */}
                <AnimatePresence>
                  {currentInsight && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-4"
                    >
                      {/* Action Buttons */}
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={saveInsight}
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => {
                            const content = `Summary:\n${currentInsight.summary}\n\nKey Themes:\n${currentInsight.key_themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nSuggested Actions:\n${currentInsight.suggested_actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}\n\nTrends:\n${currentInsight.trends.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nPerformance: ${currentInsight.performance.score}/100`;
                            downloadPDF(currentInsight.title || 'AI Insight', content);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download PDF</span>
                        </button>
                      </div>

                      {/* Summary Card */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Summary</h3>
                        <p className="text-gray-700 dark:text-gray-300">{currentInsight.summary}</p>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Performance */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Performance</h3>
                          <div className="text-3xl font-bold text-blue-600 mb-2">
                            {currentInsight.performance.score}/100
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${currentInsight.performance.score}%` }}
                            />
                          </div>
                          <div className="space-y-1">
                            {currentInsight.performance.metrics.map((metric, idx) => (
                              <div key={idx} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                <CheckCircle2 className="h-3 w-3 text-blue-600" />
                                <span>{metric}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Sentiment */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Sentiment</h3>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <div className="text-2xl font-bold text-green-600">{currentInsight.sentiment.positive}%</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Positive</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                              <div className="text-2xl font-bold text-gray-600">{currentInsight.sentiment.neutral}%</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Neutral</div>
                            </div>
                            <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                              <div className="text-2xl font-bold text-red-600">{currentInsight.sentiment.negative}%</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Negative</div>
                            </div>
                          </div>
                          <div className="text-center">
                            <span className="text-lg font-semibold capitalize text-gray-700 dark:text-gray-300">
                              Overall: {currentInsight.sentiment.overall}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Themes */}
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold mb-3 flex items-center space-x-2 text-gray-900 dark:text-white">
                          <Lightbulb className="h-5 w-5 text-orange-500" />
                          <span>Key Themes</span>
                        </h3>
                        <div className="space-y-2">
                          {currentInsight.key_themes.map((theme, idx) => (
                            <div key={idx} className="flex items-start space-x-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                              <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{theme}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold mb-3 flex items-center space-x-2 text-gray-900 dark:text-white">
                          <Target className="h-5 w-5 text-red-500" />
                          <span>Suggested Actions</span>
                        </h3>
                        <div className="space-y-2">
                          {currentInsight.suggested_actions.map((action, idx) => (
                            <div key={idx} className="flex items-start space-x-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                              <CheckCircle2 className="flex-shrink-0 h-5 w-5 text-red-500 mt-0.5" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Trends */}
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h3 className="font-semibold mb-3 flex items-center space-x-2 text-gray-900 dark:text-white">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          <span>Trends</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {currentInsight.trends.map((trend, idx) => (
                            <div key={idx} className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                              <Activity className="flex-shrink-0 h-4 w-4 text-green-500" />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{trend}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
              </div>
            ) : savedInsights.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Insights Yet
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Generate and save your first insight
                </p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Generate First Insight
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {insight.title}
                          </h3>
                          <div className="flex items-center space-x-3 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(insight.created_at).toLocaleString()}</span>
                            </div>
                            {insight.feedback_count && (
                              <div className="flex items-center space-x-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{insight.feedback_count} feedbacks</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setExpandedInsightId(
                            expandedInsightId === insight.id ? null : insight.id
                          )}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          {expandedInsightId === insight.id ? (
                            <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </div>

                      <AnimatePresence>
                        {expandedInsightId === insight.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                              <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-sans">
                                {insight.details}
                              </pre>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => downloadPDF(insight.title, insight.details)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors flex items-center space-x-1"
                        >
                          <Download className="h-3 w-3" />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => deleteInsight(insight.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors flex items-center space-x-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
