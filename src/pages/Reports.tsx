import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { jsPDF  } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Lightbulb, 
  Target,
  Download,
  Search,
  Filter,
  Calendar,
  BarChart3,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface Report {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  insights_ids: string[];
  generated_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  content?: {
    executive_summary: string;
    key_insights: string[];
    trends: string[];
    recommended_actions: string[];
    sentiment_breakdown: {
      positive: number;
      negative: number;
      neutral: number;
    };
    top_themes: string[];
  };
}

interface Insight {
  id: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  key_themes: string[];
  suggested_actions: string[];
  created_at: string;
  source_file?: string;
}

export default function Reports() {
  const { user } = useAuth();
  
  // State management
  const [reports, setReports] = useState<Report[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [showInsightSelector, setShowInsightSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Load insights from localStorage
  useEffect(() => {
    try {
      const savedInsights = localStorage.getItem('insightsHistory');
      if (savedInsights) {
        const parsedInsights = JSON.parse(savedInsights);
        setInsights(parsedInsights);
      }
    } catch (err) {
      console.error('Failed to load insights:', err);
    }
  }, []);

  // Load user reports from localStorage (since we're using localStorage for now)
  useEffect(() => {
    const fetchReports = async () => {
      try {
        // For now, we'll use localStorage to store user reports
        // In a real implementation, this would be Supabase queries
        const savedReports = localStorage.getItem('userReports');
        if (savedReports) {
          const parsedReports = JSON.parse(savedReports);
          // Filter reports for current user
          const userReports = parsedReports.filter((report: Report) => report.user_id === user?.id);
          setReports(userReports);
        } else {
          setReports([]);
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast.error('Failed to load reports');
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchReports();
    }
  }, [user]);

  // Save reports to localStorage when reports change
  useEffect(() => {
    if (reports.length > 0) {
      try {
        // Get existing reports from localStorage
        const existingReports = localStorage.getItem('userReports');
        let allReports: Report[] = [];
        
        if (existingReports) {
          allReports = JSON.parse(existingReports);
          // Remove old reports for this user
          allReports = allReports.filter((report: Report) => report.user_id !== user?.id);
        }
        
        // Add current user's reports
        allReports = [...allReports, ...reports];
        
        localStorage.setItem('userReports', JSON.stringify(allReports));
      } catch (error) {
        console.error('Error saving reports to localStorage:', error);
      }
    }
  }, [reports, user?.id]);

  // Debug: Log reports when they change
  useEffect(() => {
    console.log('Reports state updated:', reports);
  }, [reports]);

  // Debug: Log expandedReport when it changes
  useEffect(() => {
    console.log('expandedReport state changed to:', expandedReport);
  }, [expandedReport]);

  // Function to create sample report data for testing
  const createSampleReport = () => {
    const sampleReport: Report = {
      id: `sample-${Date.now()}`,
      user_id: user?.id || 'sample-user',
      title: 'Sample AI Report',
      description: 'This is a sample report for testing the preview functionality',
      insights_ids: ['sample-insight-1', 'sample-insight-2'],
      generated_at: new Date().toISOString(),
      status: 'completed',
      content: {
        executive_summary: 'This is a comprehensive analysis of your data insights, providing actionable recommendations for improvement.',
        key_insights: [
          'Customer satisfaction has improved by 15% over the last quarter',
          'Product usage patterns show increased engagement during evening hours',
          'Support ticket resolution time has decreased by 20%'
        ],
        trends: [
          'Growing adoption of mobile features',
          'Seasonal variations in user activity',
          'Increasing demand for premium features'
        ],
        recommended_actions: [
          'Implement mobile-first design improvements',
          'Optimize evening-time user experience',
          'Expand premium feature offerings'
        ],
        sentiment_breakdown: {
          positive: 65,
          negative: 15,
          neutral: 20
        },
        top_themes: ['User Experience', 'Mobile Optimization', 'Feature Development', 'Customer Support']
      }
    };
    
    setReports(prev => [sampleReport, ...prev]);
    toast.success('Sample report created! Click the eye icon to preview it.');
  };

  const handleGenerateReport = async () => {
    if (selectedInsights.length === 0) {
      toast.error('Please select at least one insight to include in the report');
      return;
    }

    if (!user?.id) {
      toast.error('User authentication required');
      return;
    }

    setGeneratingReport(true);
    try {
      // Get the actual insights data for the selected insights
      const selectedInsightsData = insights.filter(insight => 
        selectedInsights.includes(insight.id)
      );

      if (selectedInsightsData.length === 0) {
        throw new Error('No insights data found for selected insights');
      }

      // Call the generateReport Edge Function
      const response = await fetch(
        "https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/generateReport",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84"
          },
          body: JSON.stringify({
            user_id: user.id,
            insights_ids: selectedInsights,
            insights_data: selectedInsightsData, // Send actual insights data
            title: `Report - ${new Date().toLocaleDateString()}`,
            description: `Generated report based on ${selectedInsights.length} insights`
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Report generation failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Report generation failed');
      }

      // Add the new report to the list
      setReports(prev => [result.report, ...prev]);
      setSelectedInsights([]);
      setShowInsightSelector(false);
      
      toast.success('Report generated successfully!', {
        description: 'Your AI-powered report is ready.'
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSelectAllInsights = () => {
    setSelectedInsights(insights.map(insight => insight.id));
  };

  const handleDeselectAllInsights = () => {
    setSelectedInsights([]);
  };

  const handleToggleInsight = (insightId: string) => {
    setSelectedInsights(prev => 
      prev.includes(insightId) 
        ? prev.filter(id => id !== insightId)
        : [...prev, insightId]
    );
  };

  const exportToPDF = async (report: Report) => {
    if (!report.content) {
      toast.error('Report content not available for export');
      return;
    }

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
            ${report.title}
          </h1>
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
            Generated on ${new Date(report.generated_at).toLocaleDateString()} • 
            Based on ${report.insights_ids.length} insights
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 15px;">
            Executive Summary
          </h2>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            ${report.content.executive_summary}
          </p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #10b981; padding-left: 15px;">
            Key Insights
          </h2>
          <ul style="font-size: 14px; line-height: 1.6; color: #374151; padding-left: 20px;">
            ${report.content.key_insights.map(insight => 
              `<li style="margin-bottom: 8px;">${insight}</li>`
            ).join('')}
          </ul>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #f59e0b; padding-left: 15px;">
            Trends
          </h2>
          <ul style="font-size: 14px; line-height: 1.6; color: #374151; padding-left: 20px;">
            ${report.content.trends.map(trend => 
              `<li style="margin-bottom: 8px;">${trend}</li>`
            ).join('')}
          </ul>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #ef4444; padding-left: 15px;">
            Recommended Actions
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            ${report.content.recommended_actions.map((action, index) => `
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
            Top Themes
          </h2>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${report.content.top_themes.map(theme => 
              `<span style="background-color: #f3f4f6; color: #374151; padding: 6px 12px; border-radius: 16px; font-size: 12px; border: 1px solid #d1d5db;">${theme}</span>`
            ).join('')}
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; border-left: 4px solid #10b981; padding-left: 15px;">
            Sentiment Breakdown
          </h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px;">
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">${report.content.sentiment_breakdown.positive}%</div>
              <div style="color: #6b7280; font-size: 14px;">Positive</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${report.content.sentiment_breakdown.negative}%</div>
              <div style="color: #6b7280; font-size: 14px;">Negative</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #6b7280;">${report.content.sentiment_breakdown.neutral}%</div>
              <div style="color: #6b7280; font-size: 14px;">Neutral</div>
            </div>
          </div>
        </div>
      `;

      // Convert to canvas and then to PDF
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

      // Clean up
      document.body.removeChild(pdfContainer);

      // Download the PDF
      pdf.save(`${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);

      toast.success('PDF exported successfully!');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const exportAllCompletedReports = async () => {
    const completedReports = reports.filter(report => report.status === 'completed' && report.content);
    
    if (completedReports.length === 0) {
      toast.error('No completed reports available for export');
      return;
    }

    setExportingPDF(true);
    try {
      toast.info(`Generating ${completedReports.length} PDFs...`, {
        description: 'Please wait while we create your reports.'
      });

      for (let i = 0; i < completedReports.length; i++) {
        const report = completedReports[i];
        await exportToPDF(report);
        
        // Small delay between exports to prevent browser overload
        if (i < completedReports.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast.success(`Successfully exported ${completedReports.length} reports!`);
    } catch (error) {
      console.error('Error in bulk export:', error);
      toast.error('Failed to export some reports');
    } finally {
      setExportingPDF(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading reports...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 AI Reports</h1>
        <p className="text-gray-600">Generate comprehensive reports from your insights using AI</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Button 
          onClick={() => setShowInsightSelector(!showInsightSelector)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Generate New Report
        </Button>

        

        <Button 
          onClick={exportAllCompletedReports}
          variant="outline"
          className="flex items-center gap-2"
          disabled={exportingPDF || reports.filter(r => r.status === 'completed').length === 0}
        >
          {exportingPDF ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export All Completed
            </>
          )}
        </Button>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Insight Selector */}
      {showInsightSelector && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Select Insights for Report
            </CardTitle>
            <CardDescription>
              Choose which insights to include in your AI-generated report
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <div className="text-center py-8">
                <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No insights available</p>
                <p className="text-xs">Generate some insights first to create reports</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAllInsights}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeselectAllInsights}>
                      Deselect All
                    </Button>
                  </div>
                  <span className="text-sm text-gray-600">
                    {selectedInsights.length} of {insights.length} insights selected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {insights.map((insight) => (
                    <Card 
                      key={insight.id} 
                      className={`cursor-pointer transition-all ${
                        selectedInsights.includes(insight.id) 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => handleToggleInsight(insight.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedInsights.includes(insight.id)}
                            onChange={() => handleToggleInsight(insight.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {insight.summary}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  insight.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                                  insight.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {insight.sentiment}
                              </Badge>
                              {insight.source_file && (
                                <span className="text-xs text-gray-500">
                                  {insight.source_file}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowInsightSelector(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleGenerateReport}
                    disabled={generatingReport || selectedInsights.length === 0}
                    className="flex items-center gap-2"
                  >
                    {generatingReport ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : insights.length === 0 
                    ? 'First, generate some insights to create reports'
                    : 'Generate your first report from your insights'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && insights.length > 0 && (
                <Button onClick={() => setShowInsightSelector(true)}>
                  Generate First Report
                </Button>
              )}
              {!searchTerm && statusFilter === 'all' && insights.length === 0 && (
                <Button onClick={() => window.location.href = '/insights'}>
                  Go to Insights
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      {report.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {report.description}
                    </CardDescription>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(report.generated_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Lightbulb className="h-4 w-4" />
                        {report.insights_ids.length} insights
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`flex items-center gap-1 ${getStatusColor(report.status)}`}>
                      {getStatusIcon(report.status)}
                      {report.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('Eye icon clicked for report:', report.id);
                        console.log('Report data:', report);
                        console.log('Report content:', report.content);
                        console.log('Current expandedReport:', expandedReport);
                        
                        const newExpandedState = expandedReport === report.id ? null : report.id;
                        console.log('Setting expandedReport to:', newExpandedState);
                        setExpandedReport(newExpandedState);
                      }}
                    >
                      {expandedReport === report.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {expandedReport === report.id && (
                <CardContent className="border-t pt-6">
                  {!report.content ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-4">
                        <BarChart3 className="h-16 w-16 mx-auto" />
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Report Content Not Available</h4>
                      <p className="text-gray-600 text-sm mb-4">
                        This report doesn't have content yet or the content structure is incomplete.
                      </p>
                      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                        <p className="mb-2"><strong>Report ID:</strong> {report.id}</p>
                        <p className="mb-2"><strong>Status:</strong> {report.status}</p>
                        <p className="mb-2"><strong>Generated:</strong> {new Date(report.generated_at).toLocaleDateString()}</p>
                        <p><strong>Insights Count:</strong> {report.insights_ids.length}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Executive Summary */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Executive Summary
                          </h4>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {report.content.executive_summary || 'No executive summary available'}
                          </p>
                        </div>

                        {/* Sentiment Breakdown */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Sentiment Breakdown
                          </h4>
                          {report.content.sentiment_breakdown ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-green-600">Positive</span>
                                <span className="text-sm font-medium">{report.content.sentiment_breakdown.positive || 0}%</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-red-600">Negative</span>
                                <span className="text-sm font-medium">{report.content.sentiment_breakdown.negative || 0}%</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Neutral</span>
                                <span className="text-sm font-medium">{report.content.sentiment_breakdown.neutral || 0}%</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">Sentiment data not available</p>
                          )}
                        </div>

                        {/* Key Insights */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Key Insights
                          </h4>
                          {report.content.key_insights && report.content.key_insights.length > 0 ? (
                            <ul className="space-y-1">
                              {report.content.key_insights.map((insight, index) => (
                                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                                  {insight}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 text-sm">No key insights available</p>
                          )}
                        </div>

                        {/* Trends */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Trends
                          </h4>
                          {report.content.trends && report.content.trends.length > 0 ? (
                            <ul className="space-y-1">
                              {report.content.trends.map((trend, index) => (
                                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                                  {trend}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 text-sm">No trends data available</p>
                          )}
                        </div>

                        {/* Recommended Actions */}
                        <div className="lg:col-span-2">
                          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Recommended Actions
                          </h4>
                          {report.content.recommended_actions && report.content.recommended_actions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {report.content.recommended_actions.map((action, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 text-sm font-bold">{index + 1}</span>
                                  </div>
                                  <span className="text-sm text-gray-700">{action}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No recommended actions available</p>
                          )}
                        </div>

                        {/* Top Themes */}
                        <div className="lg:col-span-2">
                          <h4 className="font-semibold text-gray-900 mb-2">Top Themes</h4>
                          {report.content.top_themes && report.content.top_themes.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {report.content.top_themes.map((theme, index) => (
                                <Badge key={index} variant="secondary" className="bg-purple-100 text-purple-800">
                                  {theme}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No themes data available</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end">
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-2"
                          onClick={() => exportToPDF(report)}
                          disabled={exportingPDF}
                        >
                          {exportingPDF ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Generating PDF...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Export PDF
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}