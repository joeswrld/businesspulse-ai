import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  BarChart3,
  TrendingUp,
  FileDown,
  Eye,
  Trash2,
  RefreshCw,
  Mail
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Report {
  id: string;
  user_id: string;
  title: string;
  description: string;
  report_type: 'PDF' | 'CSV' | 'XLSX' | 'Dashboard';
  status: 'draft' | 'processing' | 'completed' | 'failed';
  file_url: string | null;
  file_size: number | null;
  insights_count: number;
  generated_at: string | null;
  scheduled_for: string | null;
  tags: string[];
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface ReportStats {
  total_reports: number;
  avg_processing_time: number;
  last_generated_at: string | null;
  reports_by_type: { type: string; count: number }[];
  reports_by_status: { status: string; count: number }[];
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [reports, setReports] = useState<Report[]>([]);
  const [reportStats, setReportStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Form state
  const [newReportTitle, setNewReportTitle] = useState('');
  const [newReportDescription, setNewReportDescription] = useState('');
  const [newReportType, setNewReportType] = useState<'PDF' | 'CSV' | 'XLSX'>('PDF');
  const [scheduledDate, setScheduledDate] = useState('');

  // Fetch reports data
  const fetchReportsData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching reports data for user:', user.id);
      
      // Fetch user's reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Fetch report statistics
      const { data: statsData, error: statsError } = await supabase
        .from('report_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      console.log('📊 Reports data fetched:', {
        reports: reportsData?.length || 0,
        stats: statsData ? 'Yes' : 'No'
      });
      
      setReports(reportsData || []);
      setReportStats(statsData);
      
    } catch (error) {
      console.error('❌ Error fetching reports data:', error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time reports subscriptions for user:', user.id);

    // Subscribe to report changes
    const reportsChannel = supabase
      .channel('reports-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Report real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            setReports(prev => [payload.new as Report, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReports(prev => 
              prev.map(report => 
                report.id === payload.new.id ? payload.new as Report : report
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setReports(prev => prev.filter(report => report.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to report stats changes
    const statsChannel = supabase
      .channel('report-stats-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'report_stats',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Report stats real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setReportStats(payload.new as ReportStats);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time reports subscriptions');
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(statsChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // Generate new report
  const generateReport = async () => {
    if (!user || !newReportTitle.trim()) return;

    setGenerating(true);
    try {
      console.log(`🚀 Generating ${newReportType} report: ${newReportTitle}`);
      
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          user_id: user.id,
          title: newReportTitle.trim(),
          description: newReportDescription.trim(),
          report_type: newReportType,
          scheduled_for: scheduledDate || null
        }
      });

      if (error) throw error;

      toast({
        title: "Report Generation Started",
        description: `Your ${newReportType} report is being generated...`,
      });

      setNewReportTitle('');
      setNewReportDescription('');
      setScheduledDate('');

    } catch (error: any) {
      console.error('❌ Error generating report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  // Download report
  const downloadReport = async (report: Report) => {
    if (!report.file_url) {
      toast({
        title: "No File Available",
        description: "Report file is not ready for download",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get signed URL for download
      const { data: { signedUrl }, error } = await supabase.storage
        .from('reports')
        .createSignedUrl(report.file_url, 60); // 60 seconds expiry

      if (error) throw error;

      // Trigger download
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = `${report.title}.${report.report_type.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: `${report.title} is downloading...`,
      });

    } catch (error: any) {
      console.error('❌ Error downloading report:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download report file",
        variant: "destructive"
      });
    }
  };

  // Delete report
  const deleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Report Deleted",
        description: "Report has been removed successfully",
      });

    } catch (error: any) {
      console.error('❌ Error deleting report:', error);
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive"
      });
    }
  };

  // Filter reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           report.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || report.report_type === selectedType;
      const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [reports, searchTerm, selectedType, selectedStatus]);

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'draft':
        return <FileText className="h-4 w-4" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <FileText className="h-4 w-4" />;
      case 'CSV':
        return <BarChart3 className="h-4 w-4" />;
      case 'XLSX':
        return <TrendingUp className="h-4 w-4" />;
      case 'Dashboard':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const now = new Date();
    const created = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
              <p className="mt-2 text-lg text-gray-600">
                Generate and manage AI-powered business intelligence reports.
              </p>
            </div>
            <Button onClick={() => document.getElementById('generate-report-modal')?.classList.remove('hidden')}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {reportStats?.total_reports || 0}
                  </div>
                  <div className="text-sm text-gray-500">Generated reports</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Processing Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {reportStats?.avg_processing_time ? `${Math.round(reportStats.avg_processing_time)}s` : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">Generation time</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Last Generated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {reportStats?.last_generated_at ? formatTimeAgo(reportStats.last_generated_at) : 'Never'}
                  </div>
                  <div className="text-sm text-gray-500">Most recent report</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-white shadow-sm border-0 mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="XLSX">XLSX</SelectItem>
                  <SelectItem value="Dashboard">Dashboard</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchReportsData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>
              {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
                <p className="text-gray-500">
                  Generate your first AI-powered report to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(report.report_type)}
                        <div>
                          <h4 className="font-medium text-gray-900">{report.title}</h4>
                          <p className="text-sm text-gray-600">{report.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(report.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(report.status)}
                                <span className="capitalize">{report.status}</span>
                              </div>
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(report.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {report.status === 'completed' && report.file_url && (
                        <Button
                          size="sm"
                          onClick={() => downloadReport(report)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteReport(report.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generate Report Modal */}
      <div id="generate-report-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 hidden">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Generate New Report</CardTitle>
            <CardDescription>
              Create an AI-powered report from your insights and data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Report Title</label>
              <Input
                value={newReportTitle}
                onChange={(e) => setNewReportTitle(e.target.value)}
                placeholder="Enter report title"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Input
                value={newReportDescription}
                onChange={(e) => setNewReportDescription(e.target.value)}
                placeholder="Describe what this report covers"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Report Type</label>
              <Select value={newReportType} onValueChange={(value: any) => setNewReportType(value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF Report</SelectItem>
                  <SelectItem value="CSV">CSV Data Export</SelectItem>
                  <SelectItem value="XLSX">Excel Spreadsheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Schedule for Later (Optional)</label>
              <Input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={generateReport}
                disabled={generating || !newReportTitle.trim()}
                className="flex-1"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => document.getElementById('generate-report-modal')?.classList.add('hidden')}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;