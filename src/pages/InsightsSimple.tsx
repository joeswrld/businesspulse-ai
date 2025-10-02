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
  Zap
} from 'lucide-react';
import jsPDF from 'jspdf';

interface SavedInsight {
  id: string;
  title: string;
  details: string;
  created_at: string;
}

interface GeneratedInsight {
  title: string;
  details: string;
}

export default function InsightsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<GeneratedInsight | null>(null);
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && activeTab === 'history') {
      fetchHistory();
    }
  }, [user, activeTab]);

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

  const generateInsight = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Empty Prompt',
        description: 'Please enter some text to generate insights',
        variant: 'destructive'
      });
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('analyze-insights', {
        body: {
          data: [{ message: prompt }],
          userId: user!.id,
          fileType: 'custom_prompt'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate insight');

      const analysis = data.analysis;
      
      // Create a formatted insight
      const insight: GeneratedInsight = {
        title: analysis.summary?.split('.')[0] || 'AI Generated Insight',
        details: `Summary:\n${analysis.summary}\n\nKey Themes:\n${analysis.key_themes?.join('\n• ') || 'None'}\n\nSuggested Actions:\n${analysis.suggested_actions?.join('\n• ') || 'None'}\n\nTrends:\n${analysis.trends?.join('\n• ') || 'None'}`
      };

      setCurrentInsight(insight);
      
      toast({
        title: '✨ Insight Generated!',
        description: 'Your AI-powered insight is ready',
        duration: 3000
      });
    } catch (error: any) {
      console.error('Error generating insight:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate insight',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveInsight = async () => {
    if (!currentInsight || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('insights')
        .insert({
          user_id: user.id,
          title: currentInsight.title,
          details: currentInsight.details
        });

      if (error) throw error;

      toast({
        title: '💾 Saved!',
        description: 'Insight saved to your history',
        duration: 3000
      });

      // Refresh history if we're on that tab
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
      
      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, 20);
      
      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 30);
      
      // Content
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(content, maxWidth);
      doc.text(lines, margin, 40);
      
      // Footer
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

  const reRunInsight = (details: string) => {
    setActiveTab('generate');
    setPrompt(details.split('\n')[0]);
    setCurrentInsight(null);
  };

  const exportAllAsCSV = () => {
    if (savedInsights.length === 0) return;

    const headers = ['Title', 'Details', 'Created At'];
    const rows = savedInsights.map(insight => [
      insight.title,
      insight.details.replace(/\n/g, ' '),
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

      // Title page
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('NoteX Insights Report', margin, yPosition);
      
      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      doc.text(`Total Insights: ${savedInsights.length}`, margin, yPosition + 5);

      savedInsights.forEach((insight, index) => {
        // Check if we need a new page
        if (yPosition > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          yPosition = 20;
        }

        yPosition += 15;
        
        // Insight title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const titleLines = doc.splitTextToSize(`${index + 1}. ${insight.title}`, maxWidth);
        doc.text(titleLines, margin, yPosition);
        yPosition += titleLines.length * 7;

        // Date
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(new Date(insight.created_at).toLocaleString(), margin, yPosition);
        yPosition += 7;

        // Content
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
      <div className="container mx-auto p-6 max-w-5xl">
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
            Transform your ideas into actionable insights with AI
          </p>
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
            <span>Generate</span>
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
            {/* Input Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Your Prompt or Feedback
                </h2>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your feedback, question, or topic to generate AI-powered insights..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-500">
                  {prompt.length} characters
                </span>
                <button
                  onClick={generateInsight}
                  disabled={generating || !prompt.trim()}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg shadow-lg transition-all disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate Insight</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Insight Display */}
            <AnimatePresence>
              {currentInsight && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl shadow-xl p-6 border-2 border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          {currentInsight.title}
                        </h3>
                        <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                          <Sparkles className="h-3 w-3" />
                          <span>AI Generated</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
                    <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed font-sans">
                      {currentInsight.details}
                    </pre>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={generateInsight}
                      disabled={generating}
                      className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Regenerate</span>
                    </button>
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
                      onClick={() => downloadPDF(currentInsight.title, currentInsight.details)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Export Options */}
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

            {/* History List */}
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
                  Generate and save your first AI-powered insight to start building your history.
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
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(insight.created_at).toLocaleString()}</span>
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
                          onClick={() => reRunInsight(insight.details)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Re-run</span>
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
