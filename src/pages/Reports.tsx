import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  FileText,
  Download,
  Plus,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  Loader2
} from 'lucide-react';

interface Report {
  id: string;
  title: string;
  type: string;
  format: string;
  status: string;
  date_range_start: string | null;
  date_range_end: string | null;
  insights_included: number | null;
  file_url: string | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch reports with realtime updates
  useEffect(() => {
    if (!user) return;

    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReports(data);
      }
      setLoading(false);
    };

    fetchReports();

    // Set up realtime subscription
    const channel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReports(prev => [payload.new as Report, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setReports(prev => 
              prev.map(report => 
                report.id === payload.new.id ? payload.new as Report : report
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setReports(prev => 
              prev.filter(report => report.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const generateReport = async (type: string, format: string) => {
    if (!user) return;

    setGenerating(type);
    
    try {
      const { data, error } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
          type,
          format,
          status: 'generating',
          date_range_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          date_range_end: new Date().toISOString().split('T')[0],
          insights_included: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Simulate report generation
      setTimeout(async () => {
        await supabase
          .from('reports')
          .update({
            status: 'completed',
            file_url: `https://example.com/reports/${data.id}.${format}`,
            file_size: Math.floor(Math.random() * 1000000) + 100000,
            insights_included: Math.floor(Math.random() * 20) + 5
          })
          .eq('id', data.id);

        setGenerating(null);
        toast({
          title: "Report Generated",
          description: `Your ${type} report has been generated successfully.`,
        });
      }, 3000);

    } catch (error) {
      console.error('Error generating report:', error);
      setGenerating(null);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadReport = (report: Report) => {
    if (report.file_url) {
      // In a real app, this would trigger the actual download
      toast({
        title: "Download Started",
        description: `Downloading ${report.title}...`,
      });
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'analytics':
        return <BarChart3 className="h-4 w-4" />;
      case 'financial':
        return <DollarSign className="h-4 w-4" />;
      case 'team':
        return <Users className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate and manage AI-powered business reports</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => generateReport('analytics', 'pdf')}
            disabled={generating === 'analytics'}
          >
            {generating === 'analytics' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Analytics Report
          </Button>
          <Button 
            variant="outline"
            onClick={() => generateReport('financial', 'excel')}
            disabled={generating === 'financial'}
          >
            {generating === 'financial' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Financial Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="financial">Financial</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="generating">Generating</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      {filteredReports.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getTypeIcon(report.type)}
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                  </div>
                  <Badge className={getStatusColor(report.status)}>
                    {report.status}
                  </Badge>
                </div>
                <CardDescription>
                  {report.type.charAt(0).toUpperCase() + report.type.slice(1)} • {report.format.toUpperCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Date Range:</span>
                    <span className="font-medium">
                      {report.date_range_start && report.date_range_end
                        ? `${new Date(report.date_range_start).toLocaleDateString()} - ${new Date(report.date_range_end).toLocaleDateString()}`
                        : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Insights:</span>
                    <span className="font-medium">{report.insights_included || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">File Size:</span>
                    <span className="font-medium">{formatFileSize(report.file_size)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">{new Date(report.created_at).toLocaleDateString()}</span>
                  </div>
                  {report.status === 'completed' && report.file_url && (
                    <Button 
                      className="w-full" 
                      onClick={() => downloadReport(report)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                  {report.status === 'generating' && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Generating...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No reports found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Generate your first report to get started with insights.'
                }
              </p>
              {(!searchTerm && typeFilter === 'all' && statusFilter === 'all') && (
                <Button onClick={() => generateReport('analytics', 'pdf')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate First Report
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;