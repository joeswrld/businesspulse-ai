import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  FileText, 
  Clock, 
  TrendingUp, 
  Lightbulb, 
  Target,
  Download,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Eye,
  BarChart3,
  MessageSquare,
  CalendarDays,
  SortAsc,
  SortDesc,
  FileDown,
  FileText as FileTextIcon
} from 'lucide-react';

// Types
interface InsightHistory {
  id: string;
  user_id: string;
  selected_feedback_ids: string[];
  analysis_result: {
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
  };
  created_at: string;
}

export default function Reports() {
  const { user } = useAuth();
  
  // State management
  const [reports, setReports] = useState<InsightHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<InsightHistory | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  // Load user's insights history
  const loadReports = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: reportsData, error: reportsError } = await supabase
        .from('insights_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: sortOrder === 'oldest' });

      if (reportsError) {
        console.error('Error loading reports:', reportsError);
        toast.error('Failed to load reports');
        return;
      }

      setReports(reportsData || []);
    } catch (error) {
      console.error('Error in loadReports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [user, sortOrder]);

  // Load reports on component mount and when sort order changes
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Filter reports based on search term and date range
  const filteredReports = reports.filter(report => {
    const matchesSearch = searchTerm === '' || 
      report.analysis_result.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.analysis_result.key_themes.some(theme => 
        theme.toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (!matchesSearch) return false;

    if (dateRange === 'all') return true;

    const reportDate = new Date(report.created_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - reportDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    switch (dateRange) {
      case '7d':
        return diffDays <= 7;
      case '30d':
        return diffDays <= 30;
      case '90d':
        return diffDays <= 90;
      default:
        return true;
    }
  });

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get summary preview (first 1-2 sentences)
  const getSummaryPreview = (summary: string) => {
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '...' : '');
  };

  // Get themes preview (comma separated, truncated)
  const getThemesPreview = (themes: string[]) => {
    if (themes.length <= 3) return themes.join(', ');
    return themes.slice(0, 3).join(', ') + ` +${themes.length - 3} more`;
  };

  // Export to PDF
  const exportToPDF = async (report: InsightHistory) => {
    setExportingPDF(true);
    try {
      toast.info('Generating PDF...', {
        description: 'Please wait while we create your report.'
      });

      // Create a temporary div for PDF generation
      const pdfContainer = document.createElement('div');
      pdfContainer.style.position = 'absolute';
      pdfContainer.style.left = '-9999px';
      pdfContainer.style.top = '0';
      pdfContainer.style.width = '800px';
      pdfContainer.style.backgroundColor = 'white';
      pdfContainer.style.padding = '40px';
      pdfContainer.style.fontFamily = 'Arial, sans-serif';
      pdfContainer.style.color = '#333';
      document.body.appendChild(pdfContainer);

      // Generate PDF content
      pdfContainer.innerHTML = `
        <div style="margin-bottom: 30px;">
          <h1 style="color: #1f2937; font-size: 28px; margin-bottom: 10px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px;">
            AI Insights Analysis Report
          </h1>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
            Generated on ${formatDate(report.created_at)} • 
            Based on ${report.selected_feedback_ids.length} feedback entries
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 15px;">
            Summary
          </h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            ${report.analysis_result.summary}
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #10b981; padding-left: 15px;">
            Key Themes
          </h2>
          <ul style="font-size: 14px; line-height: 1.6; color: #374151; padding-left: 20px;">
            ${report.analysis_result.key_themes.map(theme => 
              `<li style="margin-bottom: 8px;">${theme}</li>`
            ).join('')}
          </ul>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #f59e0b; padding-left: 15px;">
            Trends
          </h2>
          <ul style="font-size: 14px; line-height: 1.6; color: #374151; padding-left: 20px;">
            ${report.analysis_result.trends.map(trend => 
              `<li style="margin-bottom: 8px;">${trend}</li>`
            ).join('')}
          </ul>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #ef4444; padding-left: 15px;">
            Suggested Actions
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            ${report.analysis_result.suggested_actions.map((action, index) => `
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background-color: #f9fafb;">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <div style="width: 24px; height: 24px; background-color: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px;">
                    ${index + 1}
                  </div>
                  <span style="font-weight: 600; color: #1f2937;">Action ${index + 1}</span>
                </div>
                <p style="color: #374151; line-height: 1.5;">${action}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #8b5cf6; padding-left: 15px;">
            Performance Metrics
          </h2>
          <div style="margin-bottom: 20px;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 600; color: #1f2937; margin-right: 15px;">Overall Score:</span>
              <div style="width: 100px; height: 20px; background-color: #e5e7eb; border-radius: 10px; overflow: hidden;">
                <div style="width: ${report.analysis_result.performance.score}%; height: 100%; background-color: #10b981;"></div>
              </div>
              <span style="margin-left: 10px; font-weight: 600; color: #1f2937;">${report.analysis_result.performance.score}/100</span>
            </div>
          </div>
          <ul style="font-size: 14px; line-height: 1.6; color: #374151; padding-left: 20px;">
            ${report.analysis_result.performance.metrics.map(metric => 
              `<li style="margin-bottom: 8px;">${metric}</li>`
            ).join('')}
          </ul>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #ec4899; padding-left: 15px;">
            Sentiment Analysis
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
            <div style="text-align: center; padding: 20px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
              <div style="font-size: 24px; font-weight: bold; color: #16a34a; margin-bottom: 5px;">${report.analysis_result.sentiment.positive}%</div>
              <div style="color: #16a34a; font-weight: 500;">Positive</div>
            </div>
            <div style="text-align: center; padding: 20px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fde68a;">
              <div style="font-size: 24px; font-weight: bold; color: #ca8a04; margin-bottom: 5px;">${report.analysis_result.sentiment.neutral}%</div>
              <div style="color: #ca8a04; font-weight: 500;">Neutral</div>
            </div>
            <div style="text-align: center; padding: 20px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
              <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 5px;">${report.analysis_result.sentiment.negative}%</div>
              <div style="color: #dc2626; font-weight: 500;">Negative</div>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <Badge style="background-color: #3b82f6; color: white; padding: 8px 16px; border-radius: 16px; font-size: 14px;">
              Overall: ${report.analysis_result.sentiment.overall}
            </Badge>
          </div>
        </div>
      `;

      // Generate PDF
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download PDF
      pdf.save(`insights-report-${report.id}-${new Date(report.created_at).toISOString().split('T')[0]}.pdf`);

      // Cleanup
      document.body.removeChild(pdfContainer);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  // Export to CSV
  const exportToCSV = async (report: InsightHistory) => {
    setExportingCSV(true);
    try {
      // Flatten the analysis result into CSV format
      const csvData = [
        ['Report ID', report.id],
        ['Generated Date', formatDate(report.created_at)],
        ['Feedback Entries Analyzed', report.selected_feedback_ids.length.toString()],
        ['Summary', report.analysis_result.summary],
        ['Key Themes', report.analysis_result.key_themes.join('; ')],
        ['Suggested Actions', report.analysis_result.suggested_actions.join('; ')],
        ['Trends', report.analysis_result.trends.join('; ')],
        ['Performance Score', report.analysis_result.performance.score.toString()],
        ['Performance Metrics', report.analysis_result.performance.metrics.join('; ')],
        ['Sentiment Positive', report.analysis_result.sentiment.positive.toString()],
        ['Sentiment Neutral', report.analysis_result.sentiment.neutral.toString()],
        ['Sentiment Negative', report.analysis_result.sentiment.negative.toString()],
        ['Overall Sentiment', report.analysis_result.sentiment.overall]
      ];

      // Convert to CSV string
      const csvContent = csvData.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `insights-report-${report.id}-${new Date(report.created_at).toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('CSV exported successfully!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  // View full report
  const viewFullReport = (report: InsightHistory) => {
    setSelectedReport(report);
    setShowViewModal(true);
  };

  // Get sentiment badge variant
  const getSentimentBadgeVariant = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'default';
      case 'negative':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to access your reports.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Insights Reports</h1>
          <p className="text-gray-600 mt-2">
            View and export your AI-generated insights analysis reports
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadReports}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search reports by summary or themes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Range Filter */}
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  <div className="flex items-center space-x-2">
                    <SortDesc className="h-4 w-4" />
                    <span>Newest First</span>
                  </div>
                </SelectItem>
                <SelectItem value="oldest">
                  <div className="flex items-center space-x-2">
                    <SortAsc className="h-4 w-4" />
                    <span>Oldest First</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Loading reports...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchTerm || dateRange !== 'all' ? 'No reports found' : 'No reports yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || dateRange !== 'all' 
                ? 'Try adjusting your search or filters.'
                : 'Generate your first insights report from the Insights page.'
              }
            </p>
            {!searchTerm && dateRange === 'all' && (
              <Button asChild>
                <a href="/insights-simple">Go to Insights</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {report.selected_feedback_ids.length} feedbacks
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Summary Preview */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {getSummaryPreview(report.analysis_result.summary)}
                  </p>
                </div>

                {/* Key Themes Preview */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Key Themes</h3>
                  <p className="text-sm text-gray-600">
                    {getThemesPreview(report.analysis_result.key_themes)}
                  </p>
                </div>

                {/* Performance Score */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Performance Score</h3>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${report.analysis_result.performance.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {report.analysis_result.performance.score}/100
                    </span>
                  </div>
                </div>

                {/* Sentiment */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Overall Sentiment</h3>
                  <Badge variant={getSentimentBadgeVariant(report.analysis_result.sentiment.overall)}>
                    {report.analysis_result.sentiment.overall}
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewFullReport(report)}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToPDF(report)}
                      disabled={exportingPDF}
                      className="w-full"
                    >
                      {exportingPDF ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileTextIcon className="h-4 w-4" />
                      )}
                      PDF
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCSV(report)}
                      disabled={exportingCSV}
                      className="w-full"
                    >
                      {exportingCSV ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Full Report Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Full Report - {selectedReport && formatDate(selectedReport.created_at)}</span>
            </DialogTitle>
            <DialogDescription>
              Complete analysis based on {selectedReport?.selected_feedback_ids.length} feedback entries
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-6">
              {/* Summary */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  <span>Summary</span>
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {selectedReport.analysis_result.summary}
                </p>
              </div>

              {/* Key Themes */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span>Key Themes</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedReport.analysis_result.key_themes.map((theme, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-700">{theme}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Actions */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Suggested Actions</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedReport.analysis_result.suggested_actions.map((action, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trends */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span>Trends</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedReport.analysis_result.trends.map((trend, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                      <span className="text-gray-700">{trend}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  <span>Performance Metrics</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Overall Score</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${selectedReport.analysis_result.performance.score}%` }}
                        />
                      </div>
                      <span className="font-semibold">{selectedReport.analysis_result.performance.score}/100</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedReport.analysis_result.performance.metrics.map((metric, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">{metric}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sentiment */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-pink-600" />
                  <span>Sentiment Analysis</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Overall Sentiment</span>
                    <Badge 
                      variant={getSentimentBadgeVariant(selectedReport.analysis_result.sentiment.overall)}
                      className="text-sm"
                    >
                      {selectedReport.analysis_result.sentiment.overall}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedReport.analysis_result.sentiment.positive}%
                      </div>
                      <div className="text-sm text-gray-600">Positive</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {selectedReport.analysis_result.sentiment.neutral}%
                      </div>
                      <div className="text-sm text-gray-600">Neutral</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {selectedReport.analysis_result.sentiment.negative}%
                      </div>
                      <div className="text-sm text-gray-600">Negative</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Report ID: {selectedReport.id}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => exportToPDF(selectedReport)}
                    disabled={exportingPDF}
                  >
                    {exportingPDF ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileTextIcon className="h-4 w-4 mr-2" />
                    )}
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportToCSV(selectedReport)}
                    disabled={exportingCSV}
                  >
                    {exportingCSV ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4 mr-2" />
                    )}
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}