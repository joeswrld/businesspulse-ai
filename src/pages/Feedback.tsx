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
import { componentPerformance } from "@/utils/performanceTest";

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
  console.log('Feedback component rendering...');
  
  const { user } = useAuth();
  console.log('User from AuthContext:', user);
  
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [settingsConfigured, setSettingsConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Performance tracking
  const renderTimer = componentPerformance.trackRender('Feedback');

  const loadProjectId = useCallback(async () => {
    if (!user) {
      console.log('No user, skipping loadProjectId');
      setIsInitializing(false);
      return;
    }

    console.log('Starting loadProjectId for user:', user.id);
    setError(null);

    try {
      console.log('Loading project ID for user:', user.id);
      
      // Simple direct query without complex caching
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('project_id, project_id_locked')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading project ID:', error);
        throw error;
      }

      console.log('Query result:', { data, error });

      if (data && Array.isArray(data) && data.length > 0) {
        const projectId = data[0].project_id;
        console.log('Project ID loaded:', projectId);
        

        
        // Check if project_id is empty or null
        if (!projectId || projectId.trim() === '') {
          console.log('Project ID is empty, showing setup message');
          setSettingsConfigured(false);
          setIsInitializing(false);
          return;
        }
        
        setProjectId(projectId);
        setSettingsConfigured(true);
        setIsInitializing(false);
        console.log('Project ID set successfully');
      } else {
        console.log('No settings found, showing setup message');
        setSettingsConfigured(false);
        setIsInitializing(false);
      }
    } catch (error) {
      console.error('Error loading project ID:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load project configuration: ${errorMessage}`);
      toast.error(`Failed to load project configuration: ${errorMessage}`);
      setIsInitializing(false);
    }
  }, [user]);

  const loadFeedbacks = useCallback(async () => {
    if (!projectId) {
      console.log('No projectId, skipping loadFeedbacks');
      return;
    }

    console.log('Starting loadFeedbacks for project:', projectId);
    setError(null);

    try {
      console.log('Loading feedbacks for project:', projectId);
      
      // Simple direct query
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error in loadFeedbacks query:', error);
        throw error;
      }
      
      console.log('Feedbacks loaded:', data?.length || 0);
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load feedbacks: ${errorMessage}`);
      toast.error(`Failed to load feedbacks: ${errorMessage}`);
    }
  }, [projectId]);

  const setupRealtimeSubscription = useCallback(() => {
    if (!projectId) return;

    console.log('Setting up real-time subscription for project:', projectId);

    const channelName = `feedbacks-${projectId}`;
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'feedbacks',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        console.log('New feedback received via real-time:', payload.new);
        const newFeedback = payload.new as Feedback;
        
        // Add the new feedback to the top of the list
        setFeedbacks(prev => {
          // Check if feedback already exists to avoid duplicates
          const exists = prev.some(f => f.id === newFeedback.id);
          if (exists) {
            console.log('Feedback already exists in list, skipping duplicate');
            return prev;
          }
          console.log('Adding new feedback to list');
          return [newFeedback, ...prev];
        });
        
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
        console.log('Feedback updated via real-time:', payload.new);
        const updatedFeedback = payload.new as Feedback;
        setFeedbacks(prev => 
          prev.map(feedback => 
            feedback.id === updatedFeedback.id ? updatedFeedback : feedback
          )
        );
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'feedbacks',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        console.log('Feedback deleted via real-time:', payload.old);
        const deletedFeedback = payload.old as Feedback;
        setFeedbacks(prev => 
          prev.filter(feedback => feedback.id !== deletedFeedback.id)
        );
      })
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to feedback updates for project:', projectId);
          toast.success('Real-time updates enabled', {
            description: 'New feedback will appear automatically',
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error');
          toast.error('Real-time connection failed. Please refresh the page.');
        } else if (status === 'TIMED_OUT') {
          console.error('Real-time subscription timed out');
          toast.error('Real-time connection timed out. Please refresh the page.');
        } else if (status === 'CLOSED') {
          console.log('Real-time subscription closed');
        }
      });

    return () => {
      console.log('Cleaning up real-time subscription for project:', projectId);
      supabase.removeChannel(subscription);
    };
  }, [projectId]);

  // Load project ID and feedbacks on component mount
  useEffect(() => {
    console.log('Feedback useEffect triggered - user:', user?.id, 'isInitializing:', isInitializing, 'settingsConfigured:', settingsConfigured);
    if (user) {
      loadProjectId();
    }
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

  const bulkUpdateFeedbackStatus = async (status: 'new' | 'reviewed' | 'resolved') => {
    if (selectedFeedbacks.size === 0) {
      toast.error('Please select feedbacks to update');
      return;
    }

    setBulkUpdating(true);
    try {
      console.log('Bulk updating feedback status:', { 
        feedbackIds: Array.from(selectedFeedbacks), 
        status 
      });
      
      const { error } = await supabase
        .from('feedbacks')
        .update({ status })
        .in('id', Array.from(selectedFeedbacks));

      if (error) throw error;

      // Update local state immediately for better UX
      setFeedbacks(prev => 
        prev.map(feedback => 
          selectedFeedbacks.has(feedback.id)
            ? { ...feedback, status }
            : feedback
        )
      );

      // Clear selection
      setSelectedFeedbacks(new Set());

      toast.success(`${selectedFeedbacks.size} feedback(s) marked as ${status}`);
    } catch (error) {
      console.error('Error bulk updating feedback status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to update feedback status: ${errorMessage}`);
    } finally {
      setBulkUpdating(false);
    }
  };

  const toggleFeedbackSelection = (feedbackId: string) => {
    setSelectedFeedbacks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(feedbackId)) {
        newSet.delete(feedbackId);
      } else {
        newSet.add(feedbackId);
      }
      return newSet;
    });
  };

  const selectAllFeedbacks = () => {
    const allIds = filteredFeedbacks.map(f => f.id);
    setSelectedFeedbacks(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedFeedbacks(new Set());
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

  // Show loading state while initializing
  if (isInitializing || settingsConfigured === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-4">Initializing...</p>
            <p className="text-sm text-gray-500 mb-4">
              User: {user?.id ? 'Logged in' : 'Not logged in'} | 
              Settings: {settingsConfigured === null ? 'Loading' : settingsConfigured ? 'Configured' : 'Not configured'}
            </p>
            <Button 
              onClick={() => {
                console.log('Debug: Force loading project ID');
                loadProjectId();
              }}
              variant="outline"
              size="sm"
            >
              Debug: Retry Load
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // End render timer
  renderTimer.end();

  console.log('About to render Feedback component - states:', {
    user: !!user,
    isInitializing,
    settingsConfigured,
    error,
    projectId
  });

  // Fallback - show main content even if there are issues
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-6">
          <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mr-6 shadow-lg">
            <MessageSquare className="h-10 w-10 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
              Feedback Management
            </h1>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live & Real-time
              </Badge>
              {isInitializing && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-spin"></div>
                  Loading...
                </Badge>
              )}
              <span className="text-sm text-gray-500 font-medium">
                Powered by NoteX
              </span>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto">
          <p className="text-xl text-gray-600 leading-relaxed mb-4">
            View and manage all feedback from your website visitors in real-time. 
            Stay connected with your audience and respond to their needs instantly.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Real-time updates</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Bulk actions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Smart filtering</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Real-time Active
            </Badge>
            <span className="text-sm text-gray-500">
              New feedback will appear automatically
            </span>
          </div>
          <Button 
            onClick={() => {
              setLoading(true);
              loadFeedbacks();
            }}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Refreshing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>

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

        {/* Bulk Actions */}
        {filteredFeedbacks.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedFeedbacks.size === filteredFeedbacks.length && filteredFeedbacks.length > 0}
                      onChange={selectedFeedbacks.size === filteredFeedbacks.length ? clearSelection : selectAllFeedbacks}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">
                      {selectedFeedbacks.size === 0 
                        ? 'Select all' 
                        : `${selectedFeedbacks.size} of ${filteredFeedbacks.length} selected`
                      }
                    </span>
                  </div>
                  
                  {selectedFeedbacks.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Bulk actions:</span>
                      <Button
                        onClick={() => bulkUpdateFeedbackStatus('reviewed')}
                        disabled={bulkUpdating}
                        size="sm"
                        variant="outline"
                        className="text-yellow-700 border-yellow-200 hover:bg-yellow-50"
                      >
                        {bulkUpdating ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-1"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Mark Reviewed
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => bulkUpdateFeedbackStatus('resolved')}
                        disabled={bulkUpdating}
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-200 hover:bg-green-50"
                      >
                        {bulkUpdating ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mark Resolved
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={clearSelection}
                        size="sm"
                        variant="ghost"
                        className="text-gray-500"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
                
                {selectedFeedbacks.size > 0 && (
                  <div className="text-sm text-gray-500">
                    {selectedFeedbacks.size} feedback{selectedFeedbacks.size !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                  <div key={feedback.id} className={`border rounded-lg p-6 transition-colors ${
                    selectedFeedbacks.has(feedback.id) 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'hover:bg-gray-50'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedFeedbacks.has(feedback.id)}
                          onChange={() => toggleFeedbackSelection(feedback.id)}
                          className="rounded border-gray-300 mt-1"
                        />
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