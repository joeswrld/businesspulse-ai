import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  Loader2, 
  MessageSquare,
  Sparkles,
  RefreshCw,
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
  Filter,
  TrendingUp,
  Target,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  Activity,
  PieChart
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
  details: string;
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

      if (error) throw error;
      setSavedInsights(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load insights history',
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
    if (selectedFeedbacks.size === 0) {
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
    if (!currentInsight || !user) return;

    setSaving(true);
    try {
      const detailsText = `Summary:\n${currentInsight.summary}\n\nKey Themes:\n• ${currentInsight.key_themes.join('\n• ')}\n\nSuggested Actions:\n• ${currentInsight.suggested_actions.join('\n• ')}\n\nTrends:\n• ${currentInsight.trends.join('\n• ')}\n\nPerformance Score: ${currentInsight.performance.score}/100\nSentiment: ${currentInsight.sentiment.overall} (${currentInsight.sentiment.positive}% positive, ${currentInsight.sentiment.neutral}% neutral, ${currentInsight.sentiment.negative}% negative)`;

      const { error } = await supabase
        .from('insights')
        .insert({
          user_id: user.id,
          title: currentInsight.title,
          details: detailsText,
          feedback_count: selectedFeedbacks.size
        });

      if (error) throw error;

      toast({
        title: '💾 Saved!',
        description: 'Insight saved to your history',
        duration: 3000
      });

      if (activeTab === 'history') {
        fetchHistory();
      }
    } catch (error) {
      console.error('Error saving insight:', error);
      toast({
        title: 'Error',
        description: 'Failed to save insight',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadPDF = (title: string, content: string) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 30);
      
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(content, maxWidth);
      doc.text(lines, margin, 40);
      
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`NoteX AI Insights | Page ${pageCount}`, margin, doc.internal.pageSize.getHeight() - 10);
      
      doc.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
      
      toast({
        title: '📥 Downloaded!',
        description: 'PDF saved successfully',
        duration: 2000
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
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

  const exportAllAsCSV = () => {
    if (savedInsights.length === 0) return;

    const headers = ['Title', 'Details', 'Feedback Count', 'Created At'];
    const rows = savedInsights.map(insight => [
      insight.title,
      insight.details.replace(/\n/g, ' '),
      insight.feedback_count || 0,
      new Date(insight.created_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notex_insights_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: '📥 Exported!',
      description: `${savedInsights.length} insights exported to CSV`,
      duration: 2000
    });
  };

  const exportAllAsPDF = () => {
    if (savedInsights.length === 0) return;

    try {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = 20;

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('NoteX Insights Report', margin, yPosition);
      
      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      doc.text(`Total Insights: ${savedInsights.length}`, margin, yPosition + 5);

      savedInsights.forEach((insight, index) => {
        if (yPosition > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          yPosition = 20;
        }

        yPosition += 15;
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const titleLines = doc.splitTextToSize(`${index + 1}. ${insight.title}`, maxWidth);
        doc.text(titleLines, margin, yPosition);
        yPosition += titleLines.length * 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(new Date(insight.created_at).toLocaleString(), margin, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const contentLines = doc.splitTextToSize(insight.details, maxWidth);
        doc.text(contentLines, margin, yPosition);
        yPosition += contentLines.length * 5 + 5;
      });

      doc.save(`notex_all_insights_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: '📥 Exported!',
        description: `${savedInsights.length} insights exported to PDF`,
        duration: 2000
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Insights Generator
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Convert your feedback into actionable AI-powered insights
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 mt-3">
            <div className="flex items-center space-x-1 px-3 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700">
              <MessageSquare className="h-3 w-3" />
              <span>{feedbacks.length} Feedbacks Available</span>
            </div>
            <div className="flex items-center space-x-1 px-3 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-full border border-purple-200 dark:border-purple-800">
              <Sparkles className="h-3 w-3 text-purple-600" />
              <span>AI-Powered</span>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'generate'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Generate from Feedback</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <History className="h-4 w-4" />
            <span>History</span>
            {savedInsights.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {savedInsights.length}
              </span>
            )}
          </button>
        </div>

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {loadingFeedbacks ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600 dark:text-gray-400">Loading feedbacks...</p>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="h-10 w-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Feedback Available
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Collect feedback from your customers first to generate AI insights.
                </p>
              </div>
            ) : (
              <>
                {/* Feedback Selection */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <Filter className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Select Feedback to Analyze</h2>
                  </div>
                  
                  <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
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
                      onClick={generateInsight}
                      disabled={selectedFeedbacks.size === 0 || generating}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg shadow-lg transition-all disabled:cursor-not-allowed"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Generating Insights...</span>
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
                        transition={{ delay: index * 0.03 }}
                        className="group rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all bg-white dark:bg-gray-800/50"
                      >
                        <div className="p-4">
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedFeedbacks.has(feedback.id)}
                              onChange={(e) => handleFeedbackSelection(feedback.id, e.target.checked)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                <div className="flex items-center space-x-2">
                                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
                                    <User className="h-3 w-3" />
                                    <span className="capitalize">{feedback.form_type.replace('_', ' ')}</span>
                                  </div>
                                  {renderStars(feedback.rating)}
                                </div>
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(feedback.created_at).toLocaleString()}</span>
                                </div>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed line-clamp-2">
                                {feedback.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Generated Insights Display */}
                <AnimatePresence>
                  {currentInsight && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {/* Action Buttons */}
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={saveInsight}
                          disabled={saving}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          <span>Save to History</span>
                        </button>
                        <button
                          onClick={() => {
                            const content = `Summary:\n${currentInsight.summary}\n\nKey Themes:\n• ${currentInsight.key_themes.join('\n• ')}\n\nSuggested Actions:\n• ${currentInsight.suggested_actions.join('\n• ')}\n\nTrends:\n• ${currentInsight.trends.join('\n• ')}\n\nPerformance: ${currentInsight.performance.score}/100`;
                            downloadPDF(currentInsight.title, content);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download PDF</span>
                        </button>
                      </div>

                      {/* Summary */}
                      <div className="rounded-xl border border-blue-200 dark:border-blue-800 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6">
                        <div className="flex items-center space-x-2 mb-4">
                          <div className="p-2 bg-blue-600 rounded-lg">
                            <BarChart3 className="h-6 w-6 text-white" />
                          </div>
                          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Executive Summary</h2>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">
                          {currentInsight.summary}
                        </p>
                      </div>

                      {/* Performance & Sentiment */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                          <div className="flex items-center space-x-2 mb-6">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Performance Score</h3>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-4xl font-bold text-purple-600">
                                {currentInsight.performance.score}/100
                              </span>
                              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                currentInsight.performance.score >= 80 
                                  ? 'bg-green-100 text-green-700'
                                  : currentInsight.performance.score >= 60
                                  ? 'bg-yellow-100 text-yellow-700'
