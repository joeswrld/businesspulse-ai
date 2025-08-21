import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Clock, 
  Star, 
  TrendingUp, 
  Users, 
  Zap,
  Download,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Feedback {
  id: string;
  project_id: string;
  name: string | null;
  email: string | null;
  message: string;
  timestamp: string;
  status: 'new' | 'reviewed' | 'resolved';
}

const Feedback = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [settingsConfigured, setSettingsConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProjectId = useCallback(async () => {
    if (!user) return;

    setError(null);
    setLoading(true);

    try {
      console.log('Loading project ID for user:', user.id);
      
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading project ID:', error);
        throw error;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const projectId = data[0].project_id;
        console.log('Project ID loaded:', projectId);
        
        // Check if project_id is empty or null
        if (!projectId || projectId.trim() === '') {
          console.log('Project ID is empty, showing setup message');
          setSettingsConfigured(false);
          setLoading(false);
          return;
        }
        
        setProjectId(projectId);
        setSettingsConfigured(true);
      } else {
        console.log('No settings found, showing setup message');
        setSettingsConfigured(false);
      }
    } catch (error) {
      console.error('Error loading project ID:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load project configuration: ${errorMessage}`);
      toast.error(`Failed to load project configuration: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadFeedbacks = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Loading feedbacks for project:', projectId);
      
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      
      console.log('Feedbacks loaded:', data?.length || 0);
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load feedbacks: ${errorMessage}`);
      toast.error(`Failed to load feedbacks: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const setupRealtimeSubscription = useCallback(() => {
    if (!projectId) return;

    console.log('Setting up real-time subscription for project:', projectId);

    const subscription = supabase
      .channel(`feedbacks:project_id=eq.${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'feedbacks',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        console.log('New feedback received:', payload.new);
        const newFeedback = payload.new as Feedback;
        setFeedbacks(prev => [newFeedback, ...prev]);
        toast.success('New feedback received!', {
          description: `From: ${newFeedback.name || 'Anonymous'}`,
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'feedbacks',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        console.log('Feedback updated:', payload.new);
        const updatedFeedback = payload.new as Feedback;
        setFeedbacks(prev => 
          prev.map(feedback => 
            feedback.id === updatedFeedback.id ? updatedFeedback : feedback
          )
        );
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to feedback updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Subscription error');
          toast.error('Real-time connection failed. Please refresh the page.');
        }
      });

    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(subscription);
    };
  }, [projectId]);

  // Load project ID and feedbacks on component mount
  useEffect(() => {
    loadProjectId();
  }, [user, loadProjectId]);

  useEffect(() => {
    if (projectId) {
      loadFeedbacks();
      const cleanup = setupRealtimeSubscription();
      
      // Cleanup subscription on unmount or projectId change
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [projectId, loadFeedbacks, setupRealtimeSubscription]);

  const updateFeedbackStatus = async (feedbackId: string, status: 'new' | 'reviewed' | 'resolved') => {
    try {
      console.log('Updating feedback status:', { feedbackId, status });
      
      const { error } = await supabase
        .from('feedbacks')
        .update({ status })
        .eq('id', feedbackId);

      if (error) throw error;

      // Update local state immediately for better UX
      setFeedbacks(prev => 
        prev.map(feedback => 
          feedback.id === feedbackId 
            ? { ...feedback, status }
            : feedback
        )
      );

      toast.success(`Feedback marked as ${status}`);
    } catch (error) {
      console.error('Error updating feedback status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update feedback status: ${errorMessage}`);
      
      // Revert the local state change on error
      setFeedbacks(prev => 
        prev.map(feedback => 
          feedback.id === feedbackId 
            ? { ...feedback, status: feedback.status } // Keep original status
            : feedback
        )
      );
    }
  };

  const exportToTXT = () => {
    const content = feedbacks.map(feedback => 
      `Feedback ID: ${feedback.id}
From: ${feedback.name || 'Anonymous'}
Email: ${feedback.email || 'Not provided'}
Message: ${feedback.message}
Status: ${feedback.status}
Timestamp: ${new Date(feedback.timestamp).toLocaleString()}
---`
    ).join('\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedbacks-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Feedbacks exported successfully!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><AlertCircle className="h-3 w-3 mr-1" />New</Badge>;
      case 'reviewed':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Eye className="h-3 w-3 mr-1" />Reviewed</Badge>;
      case 'resolved':
        return <Badge variant="outline" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case 'reviewed':
        return <Eye className="h-4 w-4 text-yellow-600" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  // Filter feedbacks based on search and status
  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = 
      feedback.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {projectId ? 'Loading feedbacks...' : 'Loading project configuration...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Feedback</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  loadProjectId();
                }}
                className="w-full"
              >
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/feedback-settings'}
                className="w-full"
              >
                Go to Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show configuration message if settings are not configured
  if (settingsConfigured === false) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup Required</h2>
            <p className="text-gray-600 mb-6">
              You need to configure your feedback settings before you can view feedback.
            </p>
            <Button 
              onClick={() => window.location.href = '/feedback-settings'}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Configure Feedback Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mr-4">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Feedback Management</h1>
            <Badge variant="secondary" className="mt-2">
              Live
            </Badge>
          </div>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          View and manage all feedback from your website visitors in real-time.
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Feedback</p>
                  <p className="text-2xl font-bold text-gray-900">{feedbacks.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {feedbacks.filter(f => f.status === 'new').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reviewed</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {feedbacks.filter(f => f.status === 'reviewed').length}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {feedbacks.filter(f => f.status === 'resolved').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search feedbacks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setLoading(true);
                    loadFeedbacks();
                  }}
                  variant="outline"
                  disabled={loading}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={exportToTXT} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export TXT
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Feedback</CardTitle>
                <CardDescription>
                  {filteredFeedbacks.length} feedback{filteredFeedbacks.length !== 1 ? 's' : ''} found
                  {feedbacks.length > 0 && (
                    <span className="text-green-600 ml-2">
                      • Real-time updates enabled
                    </span>
                  )}
                </CardDescription>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Refreshing...
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredFeedbacks.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback found</h3>
                <p className="text-gray-600 mb-4">
                  {feedbacks.length === 0 
                    ? "No feedback has been submitted yet. Add the widget to your website to start collecting feedback."
                    : "No feedback matches your current search and filter criteria."
                  }
                </p>
                {feedbacks.length === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                    <h4 className="font-semibold text-blue-900 mb-2">Getting Started:</h4>
                    <ol className="text-sm text-blue-800 space-y-1 text-left">
                      <li>1. Go to <strong>Feedback Settings</strong> to configure your widget</li>
                      <li>2. Copy the embed code and add it to your website</li>
                      <li>3. The feedback widget will appear on your website</li>
                      <li>4. All feedback will be collected here in real-time</li>
                    </ol>
                    <Button 
                      onClick={() => window.location.href = '/feedback-settings'}
                      className="mt-3 w-full"
                      variant="outline"
                    >
                      Configure Widget
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFeedbacks.map((feedback) => (
                  <div key={feedback.id} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(feedback.status)}
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {feedback.name || 'Anonymous'}
                          </h3>
                          {feedback.email && (
                            <p className="text-sm text-gray-600">{feedback.email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(feedback.status)}
                        <Select 
                          value={feedback.status} 
                          onValueChange={(value: 'new' | 'reviewed' | 'resolved') => 
                            updateFeedbackStatus(feedback.id, value)
                          }
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
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{feedback.message}</p>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>ID: {feedback.id}</span>
                      <span>{new Date(feedback.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;