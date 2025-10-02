import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Plus, 
  Edit, 
  Trash2, 
  MessageSquare, 
  Calendar, 
  User, 
  RefreshCw,
  Loader2,
  Target,
  CheckCircle,
  Clock,
  Rocket,
  Search,
  Filter
} from 'lucide-react';

// Types
interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  status: 'Planned' | 'In Progress' | 'Released';
  feedback_ids: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface Feedback {
  id: string;
  message: string;
  email: string | null;
  created_at: string;
}

const Roadmap: React.FC = () => {
  const { user } = useAuth();
  
  // State management
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureRequest | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Planned' as 'Planned' | 'In Progress' | 'Released',
    feedback_ids: [] as string[]
  });

  // Load feature requests
  const loadFeatureRequests = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading feature requests:', error);
        toast.error('Failed to load feature requests');
        return;
      }

      setFeatureRequests(data || []);
    } catch (error) {
      console.error('Error loading feature requests:', error);
      toast.error('Failed to load feature requests');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load feedbacks for linking
  const loadFeedbacks = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's project IDs from feedback_settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id);

      if (settingsError) {
        console.error('Error loading feedback settings:', settingsError);
        return;
      }

      const projectIds = settingsData?.map(s => s.project_id) || [];

      if (projectIds.length > 0) {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('feedback')
          .select('id, message, email, created_at')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });

        if (feedbackError) {
          console.error('Error loading feedbacks:', feedbackError);
          return;
        }

        setFeedbacks(feedbackData || []);
      }
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    }
  }, [user]);

  // Load data on component mount
  useEffect(() => {
    if (user) {
      loadFeatureRequests();
      loadFeedbacks();
    }
  }, [user, loadFeatureRequests, loadFeedbacks]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('feature-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feature_requests',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadFeatureRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadFeatureRequests]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFeatureRequests(), loadFeedbacks()]);
    setRefreshing(false);
  };

  // Handle create feature request
  const handleCreateFeature = async () => {
    if (!user || !formData.title.trim()) {
      toast.error('Please provide a title for the feature request');
      return;
    }

    try {
      const { error } = await supabase
        .from('feature_requests')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          feedback_ids: formData.feedback_ids,
          user_id: user.id
        });

      if (error) {
        console.error('Error creating feature request:', error);
        toast.error('Failed to create feature request');
        return;
      }

      toast.success('Feature request created successfully');
      setShowCreateModal(false);
      setFormData({ title: '', description: '', status: 'Planned', feedback_ids: [] });
      loadFeatureRequests();
    } catch (error) {
      console.error('Error creating feature request:', error);
      toast.error('Failed to create feature request');
    }
  };

  // Handle update feature request
  const handleUpdateFeature = async () => {
    if (!editingFeature || !formData.title.trim()) {
      toast.error('Please provide a title for the feature request');
      return;
    }

    try {
      const { error } = await supabase
        .from('feature_requests')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          feedback_ids: formData.feedback_ids
        })
        .eq('id', editingFeature.id);

      if (error) {
        console.error('Error updating feature request:', error);
        toast.error('Failed to update feature request');
        return;
      }

      toast.success('Feature request updated successfully');
      setShowEditModal(false);
      setEditingFeature(null);
      setFormData({ title: '', description: '', status: 'Planned', feedback_ids: [] });
      loadFeatureRequests();
    } catch (error) {
      console.error('Error updating feature request:', error);
      toast.error('Failed to update feature request');
    }
  };

  // Handle delete feature request
  const handleDeleteFeature = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature request?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('feature_requests')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting feature request:', error);
        toast.error('Failed to delete feature request');
        return;
      }

      toast.success('Feature request deleted successfully');
      loadFeatureRequests();
    } catch (error) {
      console.error('Error deleting feature request:', error);
      toast.error('Failed to delete feature request');
    }
  };

  // Handle status update
  const handleStatusUpdate = async (id: string, newStatus: 'Planned' | 'In Progress' | 'Released') => {
    try {
      const { error } = await supabase
        .from('feature_requests')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        console.error('Error updating status:', error);
        toast.error('Failed to update status');
        return;
      }

      toast.success('Status updated successfully');
      loadFeatureRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Open edit modal
  const openEditModal = (feature: FeatureRequest) => {
    setEditingFeature(feature);
    setFormData({
      title: feature.title,
      description: feature.description || '',
      status: feature.status,
      feedback_ids: feature.feedback_ids
    });
    setShowEditModal(true);
  };

  // Filter feature requests
  const filteredFeatures = featureRequests.filter(feature =>
    feature.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (feature.description && feature.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group features by status
  const groupedFeatures = {
    Planned: filteredFeatures.filter(f => f.status === 'Planned'),
    'In Progress': filteredFeatures.filter(f => f.status === 'In Progress'),
    Released: filteredFeatures.filter(f => f.status === 'Released')
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Planned':
        return <Clock className="h-4 w-4" />;
      case 'In Progress':
        return <Target className="h-4 w-4" />;
      case 'Released':
        return <Rocket className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planned':
        return 'bg-gray-100 text-gray-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Released':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get linked feedback count
  const getLinkedFeedbackCount = (feedbackIds: string[]) => {
    return feedbackIds.length;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="text-center">
              <Target className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Authentication Required</h2>
              <p className="text-gray-600 dark:text-gray-400">Please log in to access your roadmap.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading roadmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Product Roadmap</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage feature requests and track development progress
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="lg">
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
              <DialogHeader>
                <DialogTitle>Create New Feature Request</DialogTitle>
                <DialogDescription>
                  Add a new feature to your product roadmap
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter feature title"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter feature description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Planned">Planned</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Released">Released</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Link Feedback</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2 border-gray-200 dark:border-gray-700">
                    {feedbacks.map((feedback) => (
                      <div key={feedback.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`feedback-${feedback.id}`}
                          checked={formData.feedback_ids.includes(feedback.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                feedback_ids: [...formData.feedback_ids, feedback.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                feedback_ids: formData.feedback_ids.filter(id => id !== feedback.id)
                              });
                            }
                          }}
                        />
                        <label htmlFor={`feedback-${feedback.id}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                          {feedback.message.substring(0, 100)}...
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateFeature}>
                    Create Feature
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-slate-900">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredFeatures.length} of {featureRequests.length} features
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(groupedFeatures).map(([status, features]) => (
          <div key={status} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                {getStatusIcon(status)}
                <span>{status}</span>
                <Badge variant="outline" className="ml-2">
                  {features.length}
                </Badge>
              </h3>
            </div>
            
            <div className="space-y-3 min-h-[400px]">
              {features.map((feature) => (
                <Card key={feature.id} className="hover:shadow-md transition-shadow bg-white dark:bg-slate-900">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base font-medium line-clamp-2">
                          {feature.title}
                        </CardTitle>
                        {feature.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {feature.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(feature)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFeature(feature.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Status Badge */}
                      <div className="flex items-center justify-between">
                        <Badge className={getStatusColor(feature.status)}>
                          {feature.status}
                        </Badge>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(feature.created_at)}
                        </div>
                      </div>

                      {/* Linked Feedback */}
                      {feature.feedback_ids.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                          <MessageSquare className="h-4 w-4" />
                          <span>{getLinkedFeedbackCount(feature.feedback_ids)} linked feedback</span>
                        </div>
                      )}

                      {/* Status Actions */}
                      <div className="flex space-x-2">
                        {feature.status !== 'Planned' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(feature.id, 'Planned')}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Planned
                          </Button>
                        )}
                        {feature.status !== 'In Progress' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(feature.id, 'In Progress')}
                          >
                            <Target className="h-3 w-3 mr-1" />
                            In Progress
                          </Button>
                        )}
                        {feature.status !== 'Released' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusUpdate(feature.id, 'Released')}
                          >
                            <Rocket className="h-3 w-3 mr-1" />
                            Released
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {features.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No {status.toLowerCase()} features</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Edit Feature Request</DialogTitle>
            <DialogDescription>
              Update the feature request details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter feature title"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter feature description"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Released">Released</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link Feedback</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2 border-gray-200 dark:border-gray-700">
                {feedbacks.map((feedback) => (
                  <div key={feedback.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-feedback-${feedback.id}`}
                      checked={formData.feedback_ids.includes(feedback.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            feedback_ids: [...formData.feedback_ids, feedback.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            feedback_ids: formData.feedback_ids.filter(id => id !== feedback.id)
                          });
                        }
                      }}
                    />
                    <label htmlFor={`edit-feedback-${feedback.id}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                      {feedback.message.substring(0, 100)}...
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateFeature}>
                Update Feature
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Roadmap;