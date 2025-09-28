import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  createProject, 
  getUserProjects, 
  getFeedbackSettings, 
  createDefaultFeedbackSettings,
  updateFeedbackSettings,
  deleteProject as deleteProjectUtil,
  uploadProjectLogo,
  type Project,
  type FeedbackSettings,
  type ProjectWithSettings
} from '@/utils/projectUtils';

import {
  Settings,
  Palette,
  Eye,
  Copy,
  Check,
  MessageSquare,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Code,
  Plus,
  X,
  Trash2
} from 'lucide-react';

// Types are now imported from projectUtils

export default function FeedbackSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [projects, setProjects] = useState<ProjectWithSettings[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // Create Project Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLogo, setNewProjectLogo] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  // Load user projects with enhanced error handling
  const loadProjects = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('Loading projects for user:', user.id);

      const projectsData = await getUserProjects(user.id);
      console.log('Loaded projects:', projectsData);
      setProjects(projectsData);

      // Auto-select first project if available and none is selected
      if (projectsData.length > 0 && !selectedProject) {
        console.log('Auto-selecting first project:', projectsData[0].id);
        setSelectedProject(projectsData[0].id);
      }

    } catch (error) {
      console.error('Error loading projects:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while loading projects';
      setError(errorMessage);
      toast.error(`Failed to load projects: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [user, selectedProject]);

  // Load feedback settings with better error handling
  const loadFeedbackSettings = useCallback(async (projectId: string) => {
    if (!user || !projectId) return;

    try {
      console.log('Loading feedback settings for project:', projectId);

      // Try to load existing settings
      let settingsData = await getFeedbackSettings(projectId, user.id);

      if (settingsData) {
        console.log('Loaded existing settings:', settingsData);
        setSettings(settingsData);
      } else {
        // Create default settings if none exist
        console.log('No settings found, creating default settings');
        try {
          settingsData = await createDefaultFeedbackSettings(projectId, user.id);
          console.log('Created new settings:', settingsData);
          setSettings(settingsData);
        } catch (createError) {
          console.error('Failed to create settings, using fallback:', createError);
          const fallbackSettings: FeedbackSettings = {
            id: `fallback-${projectId}`,
            user_id: user.id,
            project_id: projectId,
            widget_title: 'We love your feedback!',
            widget_color: '#3B82F6',
            greeting_text: 'Help us improve by sharing your thoughts',
            created_at: new Date().toISOString()
          };
          setSettings(fallbackSettings);
          toast.warning('Using offline settings. Database unavailable.');
        }
      }
    } catch (error) {
      console.error('Error loading feedback settings:', error);
      toast.error('Failed to load settings for this project');
    }
  }, [user]);

  // Enhanced project creation with comprehensive error handling
  const handleCreateProject = async () => {
    if (!user || !newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      setCreating(true);
      console.log('Starting project creation...', { 
        userId: user.id, 
        projectName: newProjectName,
        userEmail: user.email
      });

      let logoUrl: string | undefined = undefined;
      
      // Upload logo if provided
      if (newProjectLogo) {
        try {
          logoUrl = await uploadProjectLogo(user.id, newProjectLogo);
          console.log('Logo uploaded successfully:', logoUrl);
        } catch (logoError) {
          console.error('Logo upload failed:', logoError);
          toast.warning('Logo upload failed, continuing without logo');
        }
      }

      // Create project using the helper function
      const newProject = await createProject(user.id, newProjectName.trim(), logoUrl);
      console.log('Project created successfully:', newProject);

      // Refresh projects and select the new one
      console.log('Refreshing projects list...');
      await loadProjects();
      setSelectedProject(newProject.id);

      // Reset modal state
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectLogo(null);

      toast.success('Project created successfully!');

    } catch (error) {
      console.error('Error creating project:', error);
      
      // More detailed error messages based on the error type
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('network')) {
          toast.error('Network error. Please check your internet connection and try again.');
        } else if (error.message.includes('JWT') || error.message.includes('token')) {
          toast.error('Session expired. Please refresh the page and log in again.');
        } else if (error.message.includes('permission')) {
          toast.error('Permission denied. Please check your authentication and try logging out/in.');
        } else if (error.message.includes('timeout')) {
          toast.error('Request timed out. Please try again.');
        } else {
          toast.error(`Failed to create project: ${error.message}`);
        }
      } else {
        toast.error('Failed to create project. Check console for detailed error information.');
      }
    } finally {
      setCreating(false);
    }
  };

  // Enhanced save settings with validation
  const saveSettings = async () => {
    if (!settings || !selectedProject) {
      toast.error('No settings to save');
      return;
    }

    // Validate settings
    if (!settings.widget_title.trim()) {
      toast.error('Widget title is required');
      return;
    }

    if (!settings.greeting_text.trim()) {
      toast.error('Greeting text is required');
      return;
    }

    // Validate color format
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(settings.widget_color)) {
      toast.error('Please enter a valid hex color (e.g., #3B82F6)');
      return;
    }

    try {
      setSaving(true);

      // If it's a fallback settings, just show success (can't save to database)
      if (settings.id.startsWith('fallback-')) {
        toast.success('Settings saved locally! Note: Database not available.');
        return;
      }

      const settingsToSave = {
        widget_title: settings.widget_title.trim(),
        widget_color: settings.widget_color,
        greeting_text: settings.greeting_text.trim()
      };

      console.log('Saving settings:', settingsToSave);

      const updatedSettings = await updateFeedbackSettings(settings.id, settingsToSave);
      
      // Update local state with the saved data
      setSettings(updatedSettings);
      
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [loadProjects, user]);

  // Load settings when project changes
  useEffect(() => {
    if (selectedProject && user) {
      loadFeedbackSettings(selectedProject);
    }
  }, [selectedProject, loadFeedbackSettings, user]);

  // Update setting with validation
  const updateSetting = (key: keyof FeedbackSettings, value: any) => {
    if (!settings) return;
    
    // Basic validation
    if (key === 'widget_color' && typeof value === 'string') {
      // Ensure it's a valid color format
      if (value && !value.startsWith('#')) {
        value = '#' + value.replace('#', '');
      }
    }
    
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  // Copy embed code
  const copyEmbedCode = async () => {
    if (!selectedProject || !settings) return;

    const embedCode = `<script src="https://notex.com.ng/widget.js" data-project-id="${settings.project_id}"></script>`;
    
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success('Embed code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying embed code:', error);
      toast.error('Failed to copy embed code');
    }
  };

  // Get embed URL
  const getEmbedUrl = () => {
    if (!selectedProject || !settings) return '';
    return `https://notex.com.ng/widget.js?project_id=${settings.project_id}`;
  };

  // Get direct form URLs
  const getFormUrls = () => {
    if (!selectedProject || !settings) return { satisfaction: '', feedback: '' };
    const baseUrl = 'https://notex.com.ng';
    return {
      satisfaction: `${baseUrl}/forms/satisfaction?project_id=${settings.project_id}`,
      feedback: `${baseUrl}/forms/feedback?project_id=${settings.project_id}`
    };
  };

  // Handle logo file selection with validation
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setNewProjectLogo(file);
    }
  };

  // Delete project function
  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!user) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${projectName}"? This action cannot be undone and will delete all associated feedback data.`
    );

    if (!confirmed) return;

    try {
      await deleteProjectUtil(projectId, user.id);

      // Remove from local state
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // Clear selection if deleted project was selected
      if (selectedProject === projectId) {
        setSelectedProject('');
        setSettings(null);
      }

      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  // Reset error state when user changes
  useEffect(() => {
    if (user) {
      setError(null);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <Settings className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to access feedback settings.</p>
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
            <h2 className="text-xl font-semibold mb-2">Loading Settings...</h2>
            <p className="text-gray-600">Please wait while we fetch your data.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Settings</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-2">
              <Button onClick={loadProjects}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => setError(null)}>
                Clear Error
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Feedback Settings</h1>
          <p className="text-primary/70 mt-2">
            Configure your feedback widget and forms
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={saveSettings} disabled={saving || !settings}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
          <CardDescription>
            Choose which project to configure feedback settings for
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            // No projects state
            <div className="text-center py-8">
              <Globe className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Found</h3>
              <p className="text-gray-600 mb-4">
                Create your first project to start collecting feedback
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Project
              </Button>
            </div>
          ) : (
            // Projects exist - show dropdown with management options
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="project-select">Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-6">
                  <Button variant="outline" onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </div>
              </div>

              {/* Project Management */}
              {selectedProject && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Project Management</h4>
                      <p className="text-sm text-gray-600">
                        {projects.find(p => p.id === selectedProject)?.name}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const project = projects.find(p => p.id === selectedProject);
                        if (project) {
                          handleDeleteProject(project.id, project.name);
                        }
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Project
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Tabs - Only show if project is selected */}
      {settings && selectedProject && (
        <Tabs defaultValue="widget" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="widget">Widget Customization</TabsTrigger>
            <TabsTrigger value="satisfaction">Customer Satisfaction</TabsTrigger>
            <TabsTrigger value="feedback">Product Feedback</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Widget Customization */}
          <TabsContent value="widget" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Widget Customization</span>
                </CardTitle>
                <CardDescription>
                  Customize the appearance and behavior of your feedback widget
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Widget Title */}
                  <div className="space-y-2">
                    <Label htmlFor="widget-title">Widget Title *</Label>
                    <Input
                      id="widget-title"
                      value={settings.widget_title || ''}
                      onChange={(e) => updateSetting('widget_title', e.target.value)}
                      placeholder="We love your feedback!"
                      maxLength={100}
                    />
                    <p className="text-xs text-gray-500">
                      {settings.widget_title.length}/100 characters
                    </p>
                  </div>

                  {/* Widget Color */}
                  <div className="space-y-2">
                    <Label htmlFor="widget-color">Widget Color *</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="widget-color"
                        type="color"
                        value={settings.widget_color || '#3B82F6'}
                        onChange={(e) => updateSetting('widget_color', e.target.value)}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={settings.widget_color || '#3B82F6'}
                        onChange={(e) => updateSetting('widget_color', e.target.value)}
                        placeholder="#3B82F6"
                        className="flex-1"
                        pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                      />
                    </div>
                  </div>

                  {/* Greeting Text */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="greeting-text">Greeting Text *</Label>
                    <Textarea
                      id="greeting-text"
                      value={settings.greeting_text || ''}
                      onChange={(e) => updateSetting('greeting_text', e.target.value)}
                      placeholder="Help us improve by sharing your thoughts"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500">
                      {settings.greeting_text.length}/500 characters
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customer Satisfaction Form Settings */}
          <TabsContent value="satisfaction" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Customer Satisfaction Form</span>
                </CardTitle>
                <CardDescription>
                  Configure your customer satisfaction survey settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Satisfaction Form Title */}
                  <div className="space-y-2">
                    <Label htmlFor="satisfaction-title">Form Title</Label>
                    <Input
                      id="satisfaction-title"
                      value="How satisfied are you with our service?"
                      placeholder="How satisfied are you with our service?"
                      readOnly
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">
                      This title will be displayed on the satisfaction form
                    </p>
                  </div>

                  {/* Rating Scale */}
                  <div className="space-y-2">
                    <Label>Rating Scale</Label>
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">1 - Very Dissatisfied</span>
                        <span className="text-sm font-medium">5 - Very Satisfied</span>
                      </div>
                      <div className="flex justify-center space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div 
                            key={star}
                            className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm"
                            style={{ borderColor: settings.widget_color }}
                          >
                            {star}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Follow-up Questions */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Follow-up Questions</Label>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm font-medium mb-2">What could we improve?</p>
                        <Textarea
                          placeholder="Please share your thoughts..."
                          rows={2}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm font-medium mb-2">Any additional comments?</p>
                        <Textarea
                          placeholder="Tell us more about your experience..."
                          rows={2}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Preview */}
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-3">Form Preview</h4>
                  <div className="space-y-3">
                    <div className="text-center">
                      <h3 className="font-semibold text-lg mb-2">How satisfied are you with our service?</h3>
                      <div className="flex justify-center space-x-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div 
                            key={star}
                            className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm cursor-pointer hover:bg-gray-100"
                            style={{ borderColor: settings.widget_color }}
                          >
                            {star}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mb-4">
                        <span>Very Dissatisfied</span>
                        <span>Very Satisfied</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Feedback Form Settings */}
          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Product Feedback Form</span>
                </CardTitle>
                <CardDescription>
                  Configure your product feedback collection settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Feedback Form Title */}
                  <div className="space-y-2">
                    <Label htmlFor="feedback-title">Form Title</Label>
                    <Input
                      id="feedback-title"
                      value="Share Your Feedback"
                      placeholder="Share Your Feedback"
                      readOnly
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">
                      This title will be displayed on the feedback form
                    </p>
                  </div>

                  {/* Feedback Categories */}
                  <div className="space-y-2">
                    <Label>Feedback Categories</Label>
                    <div className="space-y-2">
                      {['Bug Report', 'Feature Request', 'General Feedback', 'Improvement Suggestion'].map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <span className="text-sm">{category}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feedback Form Fields */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Form Fields</Label>
                    <div className="space-y-3">
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm font-medium mb-2">What's your feedback about?</p>
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bug">Bug Report</SelectItem>
                            <SelectItem value="feature">Feature Request</SelectItem>
                            <SelectItem value="general">General Feedback</SelectItem>
                            <SelectItem value="improvement">Improvement Suggestion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm font-medium mb-2">Describe your feedback</p>
                        <Textarea
                          placeholder="Please provide detailed feedback..."
                          rows={3}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm font-medium mb-2">Contact Information (Optional)</p>
                        <Input
                          placeholder="Your email address"
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Preview */}
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-3">Form Preview</h4>
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Share Your Feedback</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">What's your feedback about?</label>
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Describe your feedback</label>
                          <Textarea
                            placeholder="Please provide detailed feedback..."
                            rows={3}
                            readOnly
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Contact Information (Optional)</label>
                          <Input
                            placeholder="Your email address"
                            readOnly
                            className="bg-white"
                          />
                        </div>
                        <Button 
                          style={{ backgroundColor: settings.widget_color }}
                          className="w-full"
                        >
                          Submit Feedback
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integration */}
          <TabsContent value="integration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Code className="h-5 w-5" />
                  <span>Integration</span>
                </CardTitle>
                <CardDescription>
                  Get embed codes and direct URLs for your feedback forms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Embed Code */}
                <div className="space-y-2">
                  <Label>Embed Code</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={`<script src="https://notex.com.ng/widget.js" data-project-id="${settings.project_id}"></script>`}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyEmbedCode}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Add this script tag to your website to display the feedback widget
                  </p>
                </div>

                {/* Direct Form URLs */}
                <div className="space-y-4">
                  <Label>Direct Form URLs</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        value={getFormUrls().satisfaction}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="sm" asChild>
                        <a href={getFormUrls().satisfaction} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={getFormUrls().feedback}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="sm" asChild>
                        <a href={getFormUrls().feedback} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Use these URLs for email campaigns or direct links to specific forms
                  </p>
                </div>

                {/* API Documentation */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">API Endpoints</h4>
                  <div className="space-y-2 text-sm font-mono">
                    <div>
                      <span className="text-blue-600">GET</span> /api/widget/settings/{settings.project_id}
                    </div>
                    <div>
                      <span className="text-green-600">POST</span> /api/widget/feedback
                    </div>
                    <div>
                      <span className="text-blue-600">GET</span> /api/feedback/stats/{settings.project_id}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Live Preview</span>
                </CardTitle>
                <CardDescription>
                  Preview how your feedback widget will look on different devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Preview Controls */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={previewMode === 'desktop' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('desktop')}
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      Desktop
                    </Button>
                    <Button
                      variant={previewMode === 'mobile' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('mobile')}
                    >
                      <Smartphone className="h-4 w-4 mr-2" />
                      Mobile
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.open(getFormUrls().satisfaction, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>

                {/* Preview Frame */}
                <div className={cn(
                  "border rounded-lg bg-white overflow-hidden shadow-sm",
                  previewMode === 'mobile' ? "max-w-sm mx-auto" : "w-full"
                )}>
                  <div className="h-8 bg-gray-100 border-b flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-center mb-4">
                      <h3 className="font-semibold text-lg" style={{ color: settings.widget_color }}>
                        {settings.widget_title}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {settings.greeting_text}
                      </p>
                    </div>

                    {/* Form Preview */}
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
                          Feedback Form
                        </h4>
                        <Textarea
                          placeholder="Share your feedback with us..."
                          rows={3}
                          className="text-sm"
                          readOnly
                        />
                        <div className="mt-3 flex justify-end">
                          <Button 
                            size="sm" 
                            style={{ backgroundColor: settings.widget_color }}
                          >
                            Submit Feedback
                          </Button>
                        </div>
                      </div>

                      {/* Rating Preview */}
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          Satisfaction Survey
                        </h4>
                        <div className="flex justify-center space-x-2 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div 
                              key={star}
                              className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm cursor-pointer hover:bg-gray-50"
                              style={{ borderColor: settings.widget_color }}
                            >
                              {star}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Very Dissatisfied</span>
                          <span>Very Satisfied</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500">
                        Powered by <span className="font-medium">NoteX</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Create Project Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to start collecting feedback from your users.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name..."
                disabled={creating}
                maxLength={100}
              />
              <p className="text-xs text-gray-500">
                {newProjectName.length}/100 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-logo">Logo (Optional)</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="project-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={creating}
                  className="flex-1"
                />
                {newProjectLogo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewProjectLogo(null)}
                    disabled={creating}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {newProjectLogo && (
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Selected: {newProjectLogo.name}</p>
                  <p>Size: {(newProjectLogo.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateModal(false);
                setNewProjectName('');
                setNewProjectLogo(null);
              }} 
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={creating || !newProjectName.trim()}>
              {creating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
