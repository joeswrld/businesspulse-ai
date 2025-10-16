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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Clock,
  Rocket,
  Search,
  Users,
  Eye,
  EyeOff,
  Trophy,
  Sparkles
} from 'lucide-react';

interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  status: 'Planned' | 'In Progress' | 'Released';
  feedback_ids: string[];
  user_id: string;
  milestone_date: string | null;
  is_public: boolean;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Feedback {
  id: string;
  message: string;
  email: string | null;
  created_at: string;
}

interface ChangelogEntry {
  id: string;
  feature_id: string;
  title: string;
  description: string | null;
  released_at: string;
}

export default function EnhancedRoadmap() {
  const { user } = useAuth();
  
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureRequest | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState<'public' | 'internal'>('internal');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Planned' as 'Planned' | 'In Progress' | 'Released',
    feedback_ids: [] as string[],
    milestone_date: '',
    is_public: true
  });

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

  const loadFeedbacks = useCallback(async () => {
  if (!user) return;

  try {
    const { data: settingsData, error: settingsError } = await supabase
      .from('feedback_settings')
      .select('id') // Changed from project_id to id
      .eq('user_id', user.id);

    if (settingsError) {
      console.error('Error loading feedback settings:', settingsError);
      return;
    }

    const projectIds = settingsData?.map(s => s.id) || []; // Changed to use id

    if (projectIds.length > 0) {
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('id, message, metadata, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (feedbackError) {
        console.error('Error loading feedbacks:', feedbackError);
        return;
      }

      // Extract email from metadata
      const formattedFeedback = feedbackData?.map(f => ({
        ...f,
        email: f.metadata?.email || null
      })) || [];

      setFeedbacks(formattedFeedback);
    }
  } catch (error) {
    console.error('Error loading feedbacks:', error);
  }
}, [user]);
  const loadChangelog = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'Released')
        .order('released_at', { ascending: false });

      if (error) {
        console.error('Error loading changelog:', error);
        return;
      }

      const changelogEntries: ChangelogEntry[] = (data || []).map(feature => ({
        id: feature.id,
        feature_id: feature.id,
        title: feature.title,
        description: feature.description,
        released_at: feature.released_at || feature.updated_at
      }));

      setChangelog(changelogEntries);
    } catch (error) {
      console.error('Error loading changelog:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFeatureRequests();
      loadFeedbacks();
      loadChangelog();
    }
  }, [user, loadFeatureRequests, loadFeedbacks, loadChangelog]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFeatureRequests(), loadFeedbacks(), loadChangelog()]);
    setRefreshing(false);
  };

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
          milestone_date: formData.milestone_date || null,
          is_public: formData.is_public,
          user_id: user.id
        });

      if (error) {
        console.error('Error creating feature request:', error);
        toast.error('Failed to create feature request');
        return;
      }

      toast.success('Feature request created successfully');
      setShowCreateModal(false);
      setFormData({ 
        title: '', 
        description: '', 
        status: 'Planned', 
        feedback_ids: [],
        milestone_date: '',
        is_public: true
      });
      loadFeatureRequests();
    } catch (error) {
      console.error('Error creating feature request:', error);
      toast.error('Failed to create feature request');
    }
  };

  const handleUpdateFeature = async () => {
    if (!editingFeature || !formData.title.trim()) {
      toast.error('Please provide a title for the feature request');
      return;
    }

    try {
      const updateData: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        feedback_ids: formData.feedback_ids,
        milestone_date: formData.milestone_date || null,
        is_public: formData.is_public
      };

      // If moving to Released status, set released_at
      if (formData.status === 'Released' && editingFeature.status !== 'Released') {
        updateData.released_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('feature_requests')
        .update(updateData)
        .eq('id', editingFeature.id);

      if (error) {
        console.error('Error updating feature request:', error);
        toast.error('Failed to update feature request');
        return;
      }

      toast.success('Feature request updated successfully');
      
      // If moved to Released, show changelog notification
      if (formData.status === 'Released' && editingFeature.status !== 'Released') {
        toast.success('Feature added to changelog! 🎉');
        loadChangelog();
      }

      setShowEditModal(false);
      setEditingFeature(null);
      setFormData({ 
        title: '', 
        description: '', 
        status: 'Planned', 
        feedback_ids: [],
        milestone_date: '',
        is_public: true
      });
      loadFeatureRequests();
    } catch (error) {
      console.error('Error updating feature request:', error);
      toast.error('Failed to update feature request');
    }
  };

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

  const handleStatusUpdate = async (id: string, newStatus: 'Planned' | 'In Progress' | 'Released') => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'Released') {
        updateData.released_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('feature_requests')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating status:', error);
        toast.error('Failed to update status');
        return;
      }

      if (newStatus === 'Released') {
        toast.success('Feature released and added to changelog! 🎉');
        loadChangelog();
      } else {
        toast.success('Status updated successfully');
      }
      
      loadFeatureRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const openEditModal = (feature: FeatureRequest) => {
    setEditingFeature(feature);
    setFormData({
      title: feature.title,
      description: feature.description || '',
      status: feature.status,
      feedback_ids: feature.feedback_ids,
      milestone_date: feature.milestone_date || '',
      is_public: feature.is_public ?? true
    });
    setShowEditModal(true);
  };

  const getRequestCount = (feedbackIds: string[]) => {
    return feedbackIds.length;
  };

  const filteredFeatures = featureRequests.filter(feature => {
    const matchesSearch = feature.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (feature.description && feature.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesView = viewMode === 'internal' || feature.is_public;
    
    return matchesSearch && matchesView;
  });

  const groupedFeatures = {
    Planned: filteredFeatures.filter(f => f.status === 'Planned'),
    'In Progress': filteredFeatures.filter(f => f.status === 'In Progress'),
    Released: filteredFeatures.filter(f => f.status === 'Released')
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Planned': return <Clock className="h-4 w-4" />;
      case 'In Progress': return <Target className="h-4 w-4" />;
      case 'Released': return <Rocket className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'In Progress': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'Released': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatMilestone = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `${diffDays} days left`;
    
    return formatDate(dateString);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <Target className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to access your roadmap.</p>
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
            <h1 className="text-3xl font-bold">Product Roadmap</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track feature development and user requests
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 px-3 py-2 border rounded-lg">
            <Switch
              checked={viewMode === 'public'}
              onCheckedChange={(checked) => setViewMode(checked ? 'public' : 'internal')}
            />
            <label className="text-sm cursor-pointer">
              {viewMode === 'public' ? (
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  Public View
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <EyeOff className="h-4 w-4" />
                  Internal View
                </span>
              )}
            </label>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
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
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="milestone">Milestone Date</Label>
                    <Input
                      id="milestone"
                      type="date"
                      value={formData.milestone_date}
                      onChange={(e) => setFormData({ ...formData, milestone_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_public}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                  />
                  <Label>Show in public roadmap</Label>
                </div>
                <div>
                  <Label>Link Feedback ({formData.feedback_ids.length} selected)</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                    {feedbacks.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No feedback available</p>
                    ) : (
                      feedbacks.map((feedback) => (
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
                          <label htmlFor={`feedback-${feedback.id}`} className="text-sm cursor-pointer">
                            {feedback.message.substring(0, 80)}...
                          </label>
                        </div>
                      ))
                    )}
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

      {/* Search */}
      <Card>
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
            <div className="text-sm text-gray-500">
              {filteredFeatures.length} of {featureRequests.length} features
              {viewMode === 'public' && ' (public only)'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Roadmap and Changelog */}
      <Tabs defaultValue="roadmap" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roadmap">
            <Target className="h-4 w-4 mr-2" />
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="changelog">
            <Trophy className="h-4 w-4 mr-2" />
            Changelog
            {changelog.length > 0 && (
              <Badge variant="secondary" className="ml-2">{changelog.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Roadmap Tab */}
        <TabsContent value="roadmap">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(groupedFeatures).map(([status, features]) => (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    {getStatusIcon(status)}
                    <span>{status}</span>
                    <Badge variant="outline">{features.length}</Badge>
                  </h3>
                </div>
                
                <div className="space-y-3 min-h-[400px]">
                  {features.map((feature) => (
                    <Card key={feature.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base font-medium line-clamp-2 mb-2">
                              {feature.title}
                            </CardTitle>
                            {feature.description && (
                              <CardDescription className="line-clamp-2 text-sm">
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
                            {!feature.is_public && (
                              <Badge variant="outline" className="text-xs">
                                <EyeOff className="h-3 w-3 mr-1" />
                                Internal
                              </Badge>
                            )}
                          </div>

                          {/* Milestone Date */}
                          {feature.milestone_date && (
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Calendar className="h-4 w-4" />
                              <span className={
                                new Date(feature.milestone_date) < new Date() && feature.status !== 'Released'
                                  ? 'text-red-600 font-semibold'
                                  : ''
                              }>
                                {formatMilestone(feature.milestone_date)}
                              </span>
                            </div>
                          )}

                          {/* Requested Count */}
                          {feature.feedback_ids.length > 0 && (
                            <div className="flex items-center space-x-2 text-sm bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded">
                              <Users className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-700 dark:text-blue-400">
                                Requested by {getRequestCount(feature.feedback_ids)} user{feature.feedback_ids.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}

                          <div className="text-xs text-gray-500">
                            Created {formatDate(feature.created_at)}
                          </div>

                          {/* Status Actions */}
                          <div className="flex flex-wrap gap-2">
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
                                Release
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
        </TabsContent>

        {/* Changelog Tab */}
        <TabsContent value="changelog">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Release History</span>
              </CardTitle>
              <CardDescription>
                All features that have been released to production
              </CardDescription>
            </CardHeader>
            <CardContent>
              {changelog.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">No Releases Yet</h3>
                  <p className="text-gray-600">
                    Released features will automatically appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {changelog.map((entry) => (
                    <div key={entry.id} className="border-l-4 border-green-500 pl-4 py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{entry.title}</h4>
                          {entry.description && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                              {entry.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Released {formatDate(entry.released_at)}</span>
                            </span>
                            <Badge className="bg-green-100 text-green-800">
                              <Rocket className="h-3 w-3 mr-1" />
                              Released
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="edit-milestone">Milestone Date</Label>
                <Input
                  id="edit-milestone"
                  type="date"
                  value={formData.milestone_date}
                  onChange={(e) => setFormData({ ...formData, milestone_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
              <Label>Show in public roadmap</Label>
            </div>
            <div>
              <Label>Link Feedback ({formData.feedback_ids.length} selected)</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                {feedbacks.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No feedback available</p>
                ) : (
                  feedbacks.map((feedback) => (
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
                      <label htmlFor={`edit-feedback-${feedback.id}`} className="text-sm cursor-pointer">
                        {feedback.message.substring(0, 80)}...
                      </label>
                    </div>
                  ))
                )}
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
}
