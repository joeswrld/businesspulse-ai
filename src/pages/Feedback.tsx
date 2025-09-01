import { useState, useEffect, useCallback, useMemo } from "react";
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
  AlertCircle,
  Tag,
  Plus,
  RefreshCw,
  Settings,
  ExternalLink,
  Calendar,
  User,
  Mail,
  MoreHorizontal,
  Edit3,
  Trash2,
  Archive,
  MessageCircle,
  Sparkles
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
  tags?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

interface FeedbackTag {
  id: string;
  feedback_id: string;
  tag: string;
  created_at: string;
}

const Feedback = () => {
  const { user } = useAuth();
  
  // State management
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'reviewed' | 'resolved'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | 'all'>('all');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [showTagInput, setShowTagInput] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');

  // Load project ID and feedbacks
  const loadProjectAndFeedbacks = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's project ID
      const { data: projectSettings, error: projectError } = await (supabase as any)
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (projectError) {
        console.error('Error loading project settings:', projectError);
        toast.error('Failed to load project configuration');
        return;
      }

      if (!projectSettings || projectSettings.length === 0) {
        setProjectId(null);
        setLoading(false);
        return;
      }

      const projectId = (projectSettings as any)?.[0]?.project_id;
      if (!projectId || projectId.trim() === '') {
        setProjectId(null);
        setLoading(false);
        return;
      }

      setProjectId(projectId);

      // Load feedbacks for the project
      const { data: feedbacksData, error: feedbacksError } = await (supabase as any)
        .from('feedbacks')
        .select('*')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false });

      if (feedbacksError) {
        console.error('Error loading feedbacks:', feedbacksError);
        toast.error('Failed to load feedbacks');
        return;
      }

      // Load tags for each feedback
      const feedbacksWithTags = await Promise.all(
        (feedbacksData || []).map(async (feedback: any) => {
          const { data: tagsData } = await (supabase as any)
            .from('feedback_tags')
            .select('tag')
            .eq('feedback_id', feedback.id);
          
          return {
            ...feedback,
            tags: (tagsData as any)?.map((t: any) => t.tag) || [],
            sentiment: analyzeSentiment(feedback.message)
          };
        })
      );

      setFeedbacks(feedbacksWithTags as any);
      setLoading(false);

    } catch (error) {
      console.error('Error in loadProjectAndFeedbacks:', error);
      toast.error('Failed to load data');
      setLoading(false);
    }
  }, [user]);

  // Load data on mount
  useEffect(() => {
    loadProjectAndFeedbacks();
  }, [loadProjectAndFeedbacks]);

  // Setup real-time subscription
  useEffect(() => {
    if (!projectId) return;

    setRealtimeStatus('connecting');
    
    const channel = supabase
      .channel(`feedbacks-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feedbacks',
        filter: `project_id=eq.${projectId}`
      }, async (payload) => {
        console.log('Real-time event received:', payload);
        
        if (payload.eventType === 'INSERT') {
          const newFeedback = payload.new as Feedback;
          const feedbackWithTags = {
            ...newFeedback,
            tags: [],
            sentiment: analyzeSentiment(newFeedback.message)
          };
          setFeedbacks(prev => [feedbackWithTags, ...prev]);
          toast.success('New feedback received!');
        } else if (payload.eventType === 'UPDATE') {
          const updatedFeedback = payload.new as Feedback;
          setFeedbacks(prev => prev.map(f => 
            f.id === updatedFeedback.id ? { ...f, ...updatedFeedback } : f
          ));
        } else if (payload.eventType === 'DELETE') {
          const deletedFeedback = payload.old as Feedback;
          setFeedbacks(prev => prev.filter(f => f.id !== deletedFeedback.id));
        }
      })
      .subscribe((status) => {
        setRealtimeStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  // Analyze sentiment from message content
  const analyzeSentiment = (message: string): 'positive' | 'negative' | 'neutral' => {
    const positiveWords = [
      'great', 'good', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'satisfied',
      'perfect', 'awesome', 'outstanding', 'brilliant', 'superb', 'terrific', 'pleased', 'impressed', 'smooth',
      'fast', 'easy', 'intuitive', 'beautiful', 'clean', 'modern', 'helpful', 'supportive', 'responsive'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'annoyed', 'disappointed',
      'broken', 'slow', 'difficult', 'confusing', 'ugly', 'cluttered', 'buggy', 'crash', 'error', 'fail',
      'useless', 'waste', 'problem', 'issue', 'complaint', 'unhappy', 'dissatisfied', 'poor', 'weak'
    ];

    const messageLower = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  };

  // Filter feedbacks based on all filters
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(feedback => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        feedback.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feedback.email?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== 'all' && feedback.status !== statusFilter) return false;

      // Sentiment filter
      if (sentimentFilter !== 'all' && feedback.sentiment !== sentimentFilter) return false;

      // Date filter
      if (dateFilter !== 'all') {
        const feedbackDate = new Date(feedback.timestamp);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - feedbackDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (dateFilter === '7d' && diffDays > 7) return false;
        if (dateFilter === '30d' && diffDays > 30) return false;
      }

      return true;
    });
  }, [feedbacks, searchTerm, statusFilter, sentimentFilter, dateFilter]);

  // Update feedback status
  const updateFeedbackStatus = async (feedbackId: string, newStatus: 'new' | 'reviewed' | 'resolved') => {
    setUpdating(feedbackId);
    
    try {
      const { error } = await (supabase as any)
        .from('feedbacks')
        .update({ status: newStatus })
        .eq('id', feedbackId);

      if (error) {
        throw error;
      }

      setFeedbacks(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, status: newStatus } : f
      ));

      toast.success(`Feedback marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating feedback status:', error);
      toast.error('Failed to update feedback status');
    } finally {
      setUpdating(null);
    }
  };

  // Add tag to feedback
  const addTagToFeedback = async (feedbackId: string, tag: string) => {
    if (!tag.trim()) return;

    try {
      // Insert tag into feedback_tags table
      const { error } = await (supabase as any)
        .from('feedback_tags')
        .insert({
          feedback_id: feedbackId,
          tag: tag.trim().toLowerCase()
        });

      if (error) {
        throw error;
      }

      // Update local state
      setFeedbacks(prev => prev.map(f => 
        f.id === feedbackId 
          ? { ...f, tags: [...(f.tags || []), tag.trim().toLowerCase()] }
          : f
      ));

      setNewTag('');
      setShowTagInput(null);
      toast.success('Tag added successfully');
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Failed to add tag');
    }
  };

  // Remove tag from feedback
  const removeTagFromFeedback = async (feedbackId: string, tagToRemove: string) => {
    try {
      const { error } = await (supabase as any)
        .from('feedback_tags')
        .delete()
        .eq('feedback_id', feedbackId)
        .eq('tag', tagToRemove);

      if (error) {
        throw error;
      }

      setFeedbacks(prev => prev.map(f => 
        f.id === feedbackId 
          ? { ...f, tags: (f.tags || []).filter(tag => tag !== tagToRemove) }
          : f
      ));

      toast.success('Tag removed successfully');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag');
    }
  };

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

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new':
        return 'secondary';
      case 'reviewed':
        return 'default';
      case 'resolved':
        return 'outline';
      default:
        return 'secondary';
    }
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

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertCircle className="h-4 w-4" />;
      case 'reviewed':
        return <Eye className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to access your feedback.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Loading Feedback...</h2>
            <p className="text-gray-600">Please wait while we fetch your data.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="p-12">
            <div className="mb-6">
              <MessageSquare className="h-24 w-24 text-blue-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">No Feedback Widget Configured</h1>
              <p className="text-lg text-gray-600 mb-8">
                You need to set up a feedback widget to start collecting feedback from your users.
              </p>
            </div>
            
            <div className="space-y-4">
              <Button size="lg" asChild>
                <a href="/feedback-settings">
                  <Settings className="h-5 w-5 mr-2" />
                  Configure Feedback Widget
                </a>
              </Button>
              
              <div className="text-sm text-gray-500">
                <p>Once configured, feedback will appear here in real-time</p>
              </div>
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
          <h1 className="text-3xl font-bold text-gray-900">Feedback Management</h1>
          <p className="text-gray-600 mt-2">
            Manage and respond to user feedback in real-time
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-green-500' : 
                realtimeStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="capitalize">{realtimeStatus}</span>
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-500">
              {feedbacks.length} feedback entries
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={loadProjectAndFeedbacks}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <a href="/feedback-settings">
              <Settings className="h-4 w-4 mr-2" />
              Widget Settings
            </a>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="rounded-xl shadow-lg border-2 border-blue-100 bg-blue-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search feedback by message, name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>

            {/* Sentiment Filter */}
            <Select value={sentimentFilter} onValueChange={(value: any) => setSentimentFilter(value)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredFeedbacks.length} of {feedbacks.length} feedback entries
        </div>
        <div className="text-sm text-gray-500">
          {filteredFeedbacks.length > 0 && (
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Feedback Grid */}
      {filteredFeedbacks.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFeedbacks.map((feedback) => (
            <Card key={feedback.id} className="rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusBadgeVariant(feedback.status)}>
                      {getStatusIcon(feedback.status)}
                      <span className="ml-1 capitalize">{feedback.status}</span>
                    </Badge>
                    <Badge variant={getSentimentBadgeVariant(feedback.sentiment || 'neutral')}>
                      {feedback.sentiment || 'neutral'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(feedback.timestamp)}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* User Info */}
                {(feedback.name || feedback.email) && (
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    {feedback.name && (
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{feedback.name}</span>
                      </div>
                    )}
                    {feedback.email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="h-4 w-4" />
                        <span>{feedback.email}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-800 leading-relaxed">{feedback.message}</p>
                </div>

                {/* Tags */}
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {feedback.tags?.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-red-50"
                        onClick={() => removeTagFromFeedback(feedback.id, tag)}
                      >
                        {tag}
                        <XCircle className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                      onClick={() => setShowTagInput(feedback.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Tag
                    </Button>
                  </div>
                </div>

                {/* Tag Input */}
                {showTagInput === feedback.id && (
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Enter tag name..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addTagToFeedback(feedback.id, newTag)}
                    />
                    <Button
                      size="sm"
                      onClick={() => addTagToFeedback(feedback.id, newTag)}
                      disabled={!newTag.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowTagInput(null);
                        setNewTag('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    {feedback.status !== 'resolved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateFeedbackStatus(feedback.id, 'resolved')}
                        disabled={updating === feedback.id}
                      >
                        {updating === feedback.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        <span className="ml-1">Mark Resolved</span>
                      </Button>
                    )}
                    
                    {feedback.status === 'new' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateFeedbackStatus(feedback.id, 'reviewed')}
                        disabled={updating === feedback.id}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Mark Reviewed
                      </Button>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-400">
                    ID: {feedback.id.slice(0, 8)}...
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="rounded-xl shadow-lg text-center py-16">
          <CardContent>
            <div className="mb-6">
              <MessageSquare className="h-24 w-24 text-blue-500 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                {searchTerm || statusFilter !== 'all' || sentimentFilter !== 'all' || dateFilter !== 'all' 
                  ? 'No feedback matches your filters' 
                  : 'No feedback yet'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all' || sentimentFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your search criteria or filters to see more results.'
                  : 'Start collecting feedback by embedding the widget on your website or app.'
                }
              </p>
            </div>
            
            {!searchTerm && statusFilter === 'all' && sentimentFilter === 'all' && dateFilter === 'all' && (
              <div className="space-y-4">
                <Button size="lg" asChild>
                  <a href="/feedback-settings">
                    <Settings className="h-5 w-5 mr-2" />
                    Configure Feedback Widget
                  </a>
                </Button>
                
                <div className="text-sm text-gray-500">
                  <p>Once configured, feedback will appear here in real-time</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Feedback;