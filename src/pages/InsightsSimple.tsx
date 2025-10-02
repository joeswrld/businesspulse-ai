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
      const detailsText = `Summary:\n${currentInsight.summary}\n\nKey Themes:\n• ${currentInsight.key_themes.join('\n• ')}\n\nSuggested Actions:\n• ${currentInsight.suggested_actions.join('\n• ')}\n\nTrends:\n• ${currentInsight.trends.join('\n• ')}\n\nPerformance Score: ${currentInsight.performance.score}/100\nSentiment: ${currentInsight.sentiment.overall} (${currentInsight.sentiment.positive}% positive, ${currentInsight.sentiment.neutral}% neutral, ${currentInsight.sentiment.negative}% negative)`;

      const { data, error } = await supabase
        .from('insights')
        .insert({
          user_id: user.id,
          title: currentInsight.title,
          details: detailsText,
          feedback_count: selectedFeedbacks.size
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: '💾 Saved!',
        description: 'Insight saved to your history',
        duration: 3000
      });

      if (activeTab === 'history') {
        fetchHistory();
      }
    } catch (error: any) {
      console.error('Error saving insight:', error);
      
      let errorMessage = 'Failed to save insight';
      
      if (error.message?.includes('permission') || error.code === 'PGRST301') {
        errorMessage = 'Permission denied. Please check your account settings or contact support.';
      } else if (error.code === '23505') {
        errorMessage = 'This insight already exists.';
      } else if (error.message?.includes('JWT')) {
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
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = 20;
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(title, maxWidth);
      doc.text(titleLines, margin, yPosition);
      yPosition += titleLines.length * 7 + 3;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 15;
      
      doc.setFontSize(11);
      const contentLines = doc.splitTextToSize(content, maxWidth);
      
      contentLines.forEach((line: string) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin, yPosition);
        yPosition += 7;
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
      
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
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

  const exportAllAsCSV = () => {
    if (savedInsights.length === 0) return;

    try {
      const headers = ['Title', 'Details', 'Feedback Count', 'Created At'];
      const rows = savedInsights.map(insight => [
        insight.title,
        insight.details.replace(/\n/g, ' ').replace(/"/g, '""'),
        insight.feedback_count || 0,
        new Date(insight.created_at).toLocaleString()
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notex_insights_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: '📥 Exported!',
        description: `${savedInsights.length} insights exported to CSV`,
        duration: 2000
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Error',
        description: 'Failed to export CSV',
        variant: 'destructive'
      });
    }
  };

  const exportAllAsPDF = () => {
    if (savedInsights.length === 0) return;

    try {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = 20;

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('NoteX Insights Report', margin, yPosition);
      
      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Total Insights: ${savedInsights.length}`, margin, yPosition);
      yPosition += 10;

      savedInsights.forEach((insight, index) => {
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        yPosition += 10;
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const titleLines = doc.splitTextToSize(`${index + 1}. ${insight.title}`, maxWidth);
        doc.text(titleLines, margin, yPosition);
        yPosition += titleLines.length * 7 + 3;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(new Date(insight.created_at).toLocaleString(), margin, yPosition);
        yPosition += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const contentLines = doc.splitTextToSize(insight.details, maxWidth);
        
        contentLines.forEach((line: string) => {
          if (yPosition > pageHeight - 30) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });
        
        yPosition += 5;
      });

      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `NoteX Insights Report | Page ${i} of ${totalPages}`,
          margin,
          pageHeight - 10
        );
      }

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

                <AnimatePresence>
                  {currentInsight && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={saveInsight}
                          disabled={saving}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
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
                            const content = `Summary:\n${currentInsight.summary}\n\nKey Themes:\n• ${currentInsight.key_themes.join('\n• ')}\n\nSuggested Actions:\n• ${currentInsight.suggested_actions.join('\n• ')}\n\nTrends:\n• ${currentInsight.trends.join('\n• ')}\n\nPerformance: ${currentInsight.performance.score}/100\nSentiment: ${currentInsight.sentiment.overall}`;
                            downloadPDF(currentInsight.title, content);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download PDF</span>
                        </button>
                      </div>

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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                          <div className="flex items-center space-x-2 mb-6">
                            <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Performance Score</h3>
                          </div>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                                {currentInsight.performance.score}/100
                              </span>
                              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                currentInsight.performance.score >= 80 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : currentInsight.performance.score >= 60
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {currentInsight.performance.score >= 80 ? 'Excellent' : currentInsight.performance.score >= 60 ? 'Good' : 'Needs Work'}
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                              <div 
                                className="bg-gradient-to-r from-purple-600 to-purple-400 h-4 rounded-full transition-all duration-1000"
                                style={{ width: `${currentInsight.performance.score}%` }}
                              />
                            </div>
                            <div className="space-y-2 mt-4">
                              {currentInsight.performance.metrics.map((metric, idx) => (
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
                                {currentInsight.sentiment.positive}%
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">Positive</div>
                            </div>
                            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-600">
                              <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                                {currentInsight.sentiment.neutral}%
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">Neutral</div>
                            </div>
                            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800">
                              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                                {currentInsight.sentiment.negative}%
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">Negative</div>
                            </div>
                          </div>
                          <div className={`p-4 rounded-lg ${
                            currentInsight.sentiment.overall === 'positive'
                              ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
                              : currentInsight.sentiment.overall === 'negative'
                              ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
                              : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600'
                          }`}>
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Overall Sentiment</div>
                              <div className={`text-xl font-bold capitalize ${
                                currentInsight.sentiment.overall === 'positive'
                                  ? 'text-green-600 dark:text-green-400'
                                  : currentInsight.sentiment.overall === 'negative'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {currentInsight.sentiment.overall}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                        <div className="flex items-center space-x-2 mb-6">
                          <Lightbulb className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Key Themes</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentInsight.key_themes.map((theme, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-start space-x-3 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
                            >
                              <div className="flex-shrink-0 w-6 h-6 bg-orange-600 dark:bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {idx + 1}
                              </div>
                              <span className="text-gray-700 dark:text-gray-300 text-sm">{theme}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                        <div className="flex items-center space-x-2 mb-6">
                          <Target className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Suggested Actions</h3>
                        </div>
                        <div className="space-y-3">
                          {currentInsight.suggested_actions.map((action, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-start space-x-3 p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-800 hover:shadow-md transition-shadow"
                            >
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-red-600 dark:bg-red-500 rounded-full flex items-center justify-center">
                                  <CheckCircle2 className="h-4 w-4 text-white" />
                                </div>
                              </div>
                              <span className="text-gray-700 dark:text-gray-300 flex-1">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                        <div className="flex items-center space-x-2 mb-6">
                          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">Trends & Patterns</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {currentInsight.trends.map((trend, idx) => (
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {savedInsights.length > 0 && (
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={exportAllAsCSV}
                  className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300 text-sm"
                >
                  <FileText className="h-4 w-4" />
                  <span>Export All (CSV)</span>
                </button>
                <button
                  onClick={exportAllAsPDF}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Export All (PDF)</span>
                </button>
              </div>
            )}

            {loadingHistory ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
              </div>
            ) : savedInsights.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <History className="h-10 w-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Insights Yet
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                  Generate and save your first AI-powered insight from your feedback data.
                </p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Generate First Insight
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {savedInsights.map((insight, index) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {insight.title}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(insight.created_at).toLocaleString()}</span>
                            </div>
                            {insight.feedback_count && (
                              <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded text-blue-700 dark:text-blue-300 text-xs">
                                <MessageSquare className="h-3 w-3" />
                                <span>{insight.feedback_count} feedbacks analyzed</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setExpandedInsightId(
                            expandedInsightId === insight.id ? null : insight.id
                          )}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 mt-4">
                              <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed font-sans">
                                {insight.details}
                              </pre>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          onClick={() => downloadPDF(insight.title, insight.details)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <Download className="h-3 w-3" />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={() => deleteInsight(insight.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
