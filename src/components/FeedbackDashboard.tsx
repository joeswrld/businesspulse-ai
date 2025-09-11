import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  QrCode, 
  Mail, 
  RefreshCw, 
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { useRealtimeFeedback } from '@/hooks/useRealtimeFeedback';
import { formatDistanceToNow } from 'date-fns';

interface FeedbackDashboardProps {
  projectId: string;
}

const FeedbackDashboard: React.FC<FeedbackDashboardProps> = ({ projectId }) => {
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'widget' | 'qr' | 'email_signature'>('all');
  
  const {
    feedback,
    loading,
    error,
    isConnected,
    refresh,
    getFeedbackByChannel,
    getRecentFeedback,
    getStats
  } = useRealtimeFeedback({
    projectId,
    enabled: true,
    onNewFeedback: (newFeedback) => {
      console.log('New feedback received:', newFeedback);
    }
  });

  const stats = getStats();
  const recentFeedback = getRecentFeedback(24);
  const filteredFeedback = selectedChannel === 'all' 
    ? feedback 
    : getFeedbackByChannel(selectedChannel);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'widget': return <MessageSquare className="h-4 w-4" />;
      case 'qr': return <QrCode className="h-4 w-4" />;
      case 'email_signature': return <Mail className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'widget': return 'bg-blue-100 text-blue-800';
      case 'qr': return 'bg-green-100 text-green-800';
      case 'email_signature': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading feedback...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Feedback</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live updates enabled' : 'Disconnected'}
          </span>
        </div>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last 24h</p>
                <p className="text-2xl font-bold">{recentFeedback.length}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">With Email</p>
                <p className="text-2xl font-bold">{stats.withEmail}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion</p>
                <p className="text-2xl font-bold">{Math.round(stats.completionRate)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Feedback by Channel</span>
          </CardTitle>
          <CardDescription>
            Distribution of feedback across different entry points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <MessageSquare className="h-6 w-6 text-blue-600 mr-2" />
                <span className="font-semibold">Widget</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.byChannel.widget}</p>
              <p className="text-sm text-gray-600">
                {stats.total > 0 ? Math.round((stats.byChannel.widget / stats.total) * 100) : 0}% of total
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <QrCode className="h-6 w-6 text-green-600 mr-2" />
                <span className="font-semibold">QR Code</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.byChannel.qr}</p>
              <p className="text-sm text-gray-600">
                {stats.total > 0 ? Math.round((stats.byChannel.qr / stats.total) * 100) : 0}% of total
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Mail className="h-6 w-6 text-purple-600 mr-2" />
                <span className="font-semibold">Email</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.byChannel.email_signature}</p>
              <p className="text-sm text-gray-600">
                {stats.total > 0 ? Math.round((stats.byChannel.email_signature / stats.total) * 100) : 0}% of total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
          <CardDescription>
            Latest feedback submissions for your project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedChannel} onValueChange={(value) => setSelectedChannel(value as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="widget">Widget</TabsTrigger>
              <TabsTrigger value="qr">QR Code</TabsTrigger>
              <TabsTrigger value="email_signature">Email</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedChannel} className="mt-4">
              {filteredFeedback.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No feedback yet</p>
                  <p className="text-sm">Feedback will appear here once users start submitting it.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredFeedback.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getChannelColor(item.channel)}>
                            {getChannelIcon(item.channel)}
                            <span className="ml-1 capitalize">{item.channel.replace('_', ' ')}</span>
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      
                      <p className="text-gray-900 mb-2">{item.message}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        {item.name && (
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {item.name}
                          </span>
                        )}
                        {item.email && (
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {item.email}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackDashboard;