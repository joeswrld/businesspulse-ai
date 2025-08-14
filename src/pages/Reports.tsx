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
  Clock,
  CheckCircle,
  AlertTriangle,
  FileDown,
  BarChart3,
  Calendar,
  Loader2,
  Eye,
  Trash2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Report {
  id: string;
  user_id: string;
  title: string;
  description: string;
  report_type: 'PDF' | 'CSV' | 'XLSX';
  status: 'processing' | 'done' | 'failed';
  file_url: string | null;
  file_size: number | null;
  processing_time_seconds: number | null;
  created_at: string;
  updated_at: string;
}

interface ReportStats {
  id: string;
  user_id: string;
  total_reports: number;
  avg_processing_time: number;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const reportsPerPage = 20;

  // Fetch reports and stats
  const fetchData = useCallback(async (page = 1, append = false) => {
    if (!user) return;

    try {
      console.log('🔍 Fetching reports for user:', user.id, 'page:', page);
      
      // Fetch reports with pagination
      const from = (page - 1) * reportsPerPage;
      const to = from + reportsPerPage - 1;
      
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (reportsError) {
        console.error('❌ Reports fetch error:', reportsError);
        throw reportsError;
      }

      // Fetch report stats
      const { data: statsData, error: statsError } = await supabase
        .from('report_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Stats fetch error:', statsError);
      }

      console.log('📊 Reports fetched:', reportsData?.length || 0);
      console.log('📈 Stats fetched:', statsData ? 'Yes' : 'No');
      
      if (append) {
        setReports(prev => [...prev, ...(reportsData || [])]);
      } else {
        setReports(reportsData || []);
      }
      
      setReportStats(statsData);
      setHasMore((reportsData?.length || 0) === reportsPerPage);
      
    } catch (error) {
      console.error('❌ Error fetching data:', error);
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

    console.log('🔄 Setting up real-time subscriptions for user:', user.id);

    // Subscribe to reports changes
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
          console.log('🔄 Reports real-time update:', payload.eventType, payload.new);
          
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

    // Subscribe to report_stats changes
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
      console.log('🔄 Cleaning up real-time subscriptions');
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(statsChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchData(1, false);
  }, [fetchData]);

  // Load more reports
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchData(nextPage, true);
    }
  }, [hasMore, loading, currentPage, fetchData]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = searchTerm === '' || 
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.description && report.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = selectedType === 'all' || report.report_type === selectedType;
      const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [reports, searchTerm, selectedType, selectedStatus]);

  // Generate new report
  const generateReport = async (reportType: 'PDF' | 'CSV' | 'XLSX') => {
    if (!user) return;

    setGenerating(true);
    try {
      console.log('🚀 Generating new report:', reportType, 'for user:', user.id);
      
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { 
          user_id: user.id,
          report_type: reportType,
          title: `AI Insights Report - ${reportType} - ${new Date().toLocaleDateString()}`,
          description: `Comprehensive ${reportType} report of your AI insights`
        }
      });

      if (error) throw error;

      console.log('✅ New report generated:', data);
      toast({
        title: "Success!",
        description: `New ${reportType} report is being generated. You'll see it appear in the list shortly.`,
      });
      
    } catch (error: any) {
      console.error('❌ Error generating report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate new report",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  // Download report
  const downloadReport = async (report: Report) => {
    if (!report.file_url) return;

    try {
      const response = await fetch(report.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${report.report_type.toLowerCase()}`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Report download has begun",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the report",
        variant: "destructive"
      });
    }
  };

  // Delete report
  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Report deleted",
        description: "Report has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete report",
        variant: "destructive"
      });
    }
  };

  // Utility functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'done':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'done':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <FileText className="h-4 w-4" />;
      case 'CSV':
        return <FileDown className="h-4 w-4" />;
      case 'XLSX':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  if (loading && reports.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="mt-2 text-lg text-gray-600">
            Generate and manage AI-powered business intelligence reports.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{reportStats?.total_reports || 0}</div>
                  <div className="text-sm text-gray-500">Generated</div>
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
                    {reportStats?.avg_processing_time ? `${reportStats.avg_processing_time.toFixed(1)}s` : '0s'}
                  </div>
                  <div className="text-sm text-gray-500">Per report</div>
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
                  <div className="text-sm text-gray-500">Report created</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex gap-2">
            <Button 
              onClick={() => generateReport('PDF')} 
              disabled={generating}
              variant="outline"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
            <Button 
              onClick={() => generateReport('CSV')} 
              disabled={generating}
              variant="outline"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Generate CSV
                </>
              )}
            </Button>
            <Button 
              onClick={() => generateReport('XLSX')} 
              disabled={generating}
              variant="outline"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate XLSX
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border-0 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search reports by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
                <SelectItem value="XLSX">XLSX</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-6">
          {filteredReports.length === 0 ? (
            <Card className="bg-white shadow-sm border-0">
              <CardContent className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {reports.length === 0 ? 'No reports yet' : 'No reports match your filters'}
                </h3>
                <p className="text-gray-500">
                  {reports.length === 0 
                    ? 'Click the buttons above to generate your first AI insights report!' 
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {filteredReports.map((report) => (
                <Card key={report.id} className="bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`${getStatusColor(report.status)} border`}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(report.status)}
                              <span className="capitalize">{report.status}</span>
                            </div>
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getTypeIcon(report.report_type)}
                            {report.report_type}
                          </Badge>
                          {report.processing_time_seconds && (
                            <Badge variant="secondary" className="text-xs">
                              {report.processing_time_seconds}s
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{report.title}</h3>
                        {report.description && (
                          <p className="text-gray-600 mb-3">{report.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        {report.status === 'done' && report.file_url && (
                          <Button
                            size="sm"
                            onClick={() => downloadReport(report)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteReport(report.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* File Details */}
                    {report.status === 'done' && (
                      <div className="mb-4 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-800">
                            <strong>File Size:</strong> {formatFileSize(report.file_size)}
                          </span>
                          {report.processing_time_seconds && (
                            <span className="text-green-800">
                              <strong>Generated in:</strong> {report.processing_time_seconds}s
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatTimeAgo(report.created_at)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center pt-6">
                  <Button
                    onClick={loadMore}
                    disabled={loading}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More Reports'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;