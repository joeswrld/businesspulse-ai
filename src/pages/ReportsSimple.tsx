import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUsageTracking } from '@/hooks/useUsageTracking';

interface Report {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

const ReportsSimple: React.FC = () => {
  const { user } = useAuth();
  const { trackUsage } = useUsageTracking();
  const [reports, setReports] = useState<Report[]>([
    {
      id: '1',
      title: 'Q4 Customer Feedback Report',
      description: 'Analysis of customer feedback for Q4 2024',
      status: 'completed',
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      title: 'Product Satisfaction Analysis',
      description: 'Deep dive into product satisfaction metrics',
      status: 'processing',
      created_at: '2024-01-14T14:20:00Z'
    },
    {
      id: '3',
      title: 'Market Trends Report',
      description: 'Analysis of current market trends and opportunities',
      status: 'pending',
      created_at: '2024-01-13T09:15:00Z'
    }
  ]);
  const [generatingReport, setGeneratingReport] = useState(false);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    
    try {
      // Track usage
      await trackUsage('reports');
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const newReport: Report = {
        id: Date.now().toString(),
        title: `Report ${reports.length + 1}`,
        description: 'Newly generated report',
        status: 'completed',
        created_at: new Date().toISOString()
      };
      
      setReports(prev => [newReport, ...prev]);
    } catch (error) {
      console.error('Report generation error:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Reports</h1>
          <p className="text-muted-foreground">
            Generate and manage comprehensive business reports
          </p>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={generatingReport}
          className="flex items-center space-x-2"
        >
          {generatingReport ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {report.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(report.status)}
                  {getStatusBadge(report.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Created: {new Date(report.created_at).toLocaleDateString()}
                </div>
                <div className="flex space-x-2">
                  {report.status === 'completed' && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reports.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first executive report to get started
            </p>
            <Button onClick={handleGenerateReport} disabled={generatingReport}>
              <Plus className="h-4 w-4 mr-2" />
              Generate First Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportsSimple;