import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  Download,
  Filter,
  Search,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  Bell,
  RefreshCw,
  Mail,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Feedback {
  id: string;
  client_name: string;
  email: string;
  message: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  status: 'new' | 'reviewed' | 'resolved';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at: string;
}

interface FeedbackNotification {
  id: string;
  type: 'new_feedback' | 'negative_sentiment' | 'urgent_issue';
  message: string;
  sent_at: string;
  read_at: string | null;
  feedback_id: string;
}

const Feedback = () => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [notifications, setNotifications] = useState<FeedbackNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    reviewed: 0,
    resolved: 0,
    positive: 0,
    negative: 0,
    neutral: 0,
    urgent: 0
  });

  // Fetch feedback data
  const fetchFeedback = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFeedback(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('feedback_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Calculate statistics
  const calculateStats = (data: Feedback[]) => {
    const stats = {
      total: data.length,
      new: data.filter(f => f.status === 'new').length,
      reviewed: data.filter(f => f.status === 'reviewed').length,
      resolved: data.filter(f => f.status === 'resolved').length,
      positive: data.filter(f => f.sentiment === 'positive').length,
      negative: data.filter(f => f.sentiment === 'negative').length,
      neutral: data.filter(f => f.sentiment === 'neutral').length,
      urgent: data.filter(f => f.priority === 'urgent').length
    };
    setStats(stats);
  };

  // Update feedback status
  const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', feedbackId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Status updated successfully');
      fetchFeedback(); // Refresh data
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('feedback_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Export feedback to TXT
  const exportFeedback = () => {
    const filteredFeedback = getFilteredFeedback();
    
    let content = `Feedback Export - ${new Date().toLocaleDateString()}\n`;
    content += `Total Feedback: ${filteredFeedback.length}\n\n`;
    
    filteredFeedback.forEach((item, index) => {
      content += `${index + 1}. ${item.client_name || 'Anonymous'}\n`;
      content += `   Email: ${item.email || 'N/A'}\n`;
      content += `   Date: ${new Date(item.created_at).toLocaleString()}\n`;
      content += `   Status: ${item.status}\n`;
      content += `   Priority: ${item.priority}\n`;
      content += `   Sentiment: ${item.sentiment}\n`;
      content += `   Message: ${item.message}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Feedback exported successfully');
  };

  // Filter feedback based on search and filters
  const getFilteredFeedback = () => {
    return feedback.filter(item => {
      const matchesSearch = !searchTerm || 
        item.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSentiment = sentimentFilter === 'all' || item.sentiment === sentimentFilter;
      const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesSentiment && matchesPriority;
    });
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">New</Badge>;
      case 'reviewed':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Reviewed</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get sentiment icon
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-100 text-red-800">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'normal':
        return <Badge className="bg-blue-100 text-blue-800">Normal</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-800">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    fetchFeedback();
    fetchNotifications();

    // Subscribe to feedback changes
    const feedbackChannel = supabase
      .channel('feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Feedback changed:', payload);
          fetchFeedback();
        }
      )
      .subscribe();

    // Subscribe to notification changes
    const notificationChannel = supabase
      .channel('notification-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification changed:', payload);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(feedbackChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredFeedback = getFilteredFeedback();
  const unreadNotifications = notifications.filter(n => !n.read_at).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Feedback Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage customer feedback in real-time
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchFeedback} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportFeedback} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export TXT
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Feedback</p>
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
                <p className="text-sm font-medium text-muted-foreground">New</p>
                <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Positive</p>
                <p className="text-2xl font-bold text-green-600">{stats.positive}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Urgent</p>
                <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="feedback" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feedback" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>Feedback</span>
            {stats.new > 0 && (
              <Badge variant="destructive" className="ml-1">{stats.new}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
            {unreadNotifications > 0 && (
              <Badge variant="destructive" className="ml-1">{unreadNotifications}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search feedback..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by sentiment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiment</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Table */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback ({filteredFeedback.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeedback.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.client_name || 'Anonymous'}</p>
                            <p className="text-sm text-muted-foreground">{item.email || 'No email'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm truncate">{item.message}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.status}
                            onValueChange={(value) => updateFeedbackStatus(item.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="reviewed">Reviewed</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {getSentimentIcon(item.sentiment)}
                            <span className="capitalize">{item.sentiment}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{new Date(item.created_at).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">
                              {new Date(item.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFeedback(item);
                              setShowDetailDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border ${
                        notification.read_at ? 'bg-muted/50' : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {notification.type === 'new_feedback' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                            {notification.type === 'negative_sentiment' && <TrendingDown className="h-4 w-4 text-red-600" />}
                            {notification.type === 'urgent_issue' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                            <Badge variant="outline" className="capitalize">
                              {notification.type.replace('_', ' ')}
                            </Badge>
                            {!notification.read_at && (
                              <Badge variant="destructive" className="text-xs">New</Badge>
                            )}
                          </div>
                          <p className="text-sm">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.sent_at).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read_at && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feedback Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Client Name</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedFeedback.client_name || 'Anonymous'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedFeedback.email || 'No email provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedFeedback.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <div className="mt-1">{getPriorityBadge(selectedFeedback.priority)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Sentiment</label>
                  <div className="mt-1 flex items-center space-x-1">
                    {getSentimentIcon(selectedFeedback.sentiment)}
                    <span className="capitalize">{selectedFeedback.sentiment}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedFeedback.category || 'General'}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Message</label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{selectedFeedback.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedFeedback.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Updated</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedFeedback.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (selectedFeedback.email) {
                      window.open(`mailto:${selectedFeedback.email}`, '_blank');
                    }
                  }}
                  disabled={!selectedFeedback.email}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Reply
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Feedback;