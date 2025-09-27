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
  X
} from 'lucide-react';

// Types
interface FeedbackSettings {
  id: string;
  user_id: string;
  project_id: string;
  widget_title: string;
  widget_color: string;
  greeting_text: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  user_id: string;
  logo_url?: string;
  created_at: string;
}

export default function FeedbackSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
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

  // Load user projects
  const loadProjects = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error loading projects:', projectsError);
        
        // Handle case where projects table doesn't exist
        if (projectsError.code === '42P01' || projectsError.message?.includes('relation "projects" does not exist')) {
          console.log('Projects table does not exist');
          setProjects([]);
          return;
        }
        throw projectsError;
      }

      const currentProjects = projectsData || [];
      setProjects(currentProjects);

      // Auto-select first project if available
      if (currentProjects.length > 0 && !selectedProject) {
        setSelectedProject(currentProjects[0].id);
      }

    } catch (error) {
      console.error('Error loading projects:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while loading projects');
    } finally {
      setLoading(false);
    }
  }, [user, selectedProject]);

  // Load feedback settings for selected project
  const loadFeedbackSettings = useCallback(async (projectId: string) => {
    if (!user || !projectId) return;

    try {
      // Try to load existing settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error loading settings:', settingsError);
        
        // Handle case where feedback_settings table doesn't exist
        if (settingsError.code === '42P01' || settingsError.message?.includes('relation "feedback_settings" does not exist')) {
          console.log('feedback_settings table does not exist, creating fallback');
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
          return;
        }
      }

      if (settingsData) {
        setSettings(settingsData);
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          project_id: projectId,
          user_id: user.id,
          widget_title: 'We love your feedback!',
          widget_color: '#3B82F6',
          greeting_text: 'Help us improve by sharing your thoughts'
        };

        try {
          const { data: newSettings, error: createError } = await supabase
            .from('feedback_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (createError) {
            console.error('Error creating default settings:', createError);
            // Use fallback settings
            const fallbackSettings: FeedbackSettings = {
              id: `fallback-${projectId}`,
              user_id: user.id,
              project_id: projectId,
              widget_title: defaultSettings.widget_title,
              widget_color: defaultSettings.widget_color,
              greeting_text: defaultSettings.greeting_text,
              created_at: new Date().toISOString()
            };
            setSettings(fallbackSettings);
          } else {
            setSettings(newSettings);
          }
        } catch (createError) {
          console.error('Failed to create settings, using fallback:', createError);
          const fallbackSettings: FeedbackSettings = {
            id: `fallback-${projectId}`,
            user_id: user.id,
            project_id: projectId,
            widget_title: defaultSettings.widget_title,
            widget_color: defaultSettings.widget_color,
            greeting_text: defaultSettings.greeting_text,
            created_at: new Date().toISOString()
          };
          setSettings(fallbackSettings);
        }
      }
    } catch (error) {
      console.error('Error loading feedback settings:', error);
      toast.error('Failed to load settings for this project');
    }
  }, [user]);

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

  // Create new project
  const createProject = async () => {
    if (!user || !newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      setCreating(true);

      let logoUrl = null;
      
      // Upload logo if provided
      if (newProjectLogo) {
        const fileExt = newProjectLogo.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-logos')
          .upload(fileName, newProjectLogo);

        if (uploadError) {
          console.error('Error uploading logo:', uploadError);
          toast.error('Failed to upload logo, but project will be created without it');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('project-logos')
            .getPublicUrl(fileName);
          logoUrl = publicUrl;
        }
      }

      // Create project
      const projectData = {
        user_id: user.id,
        name: newProjectName.trim(),
        logo_url: logoUrl
      };

      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (projectError) {
        console.error('Error creating project:', projectError);
        throw projectError;
      }

      // Create default feedback settings for the new project
      const defaultSettings = {
        project_id: newProject.id,
        user_id: user.id,
        widget_title: 'We love your feedback!',
        widget_color: '#3B82F6',
        greeting_text: 'Help us improve by sharing your thoughts'
      };

      try {
        await supabase
          .from('feedback_settings')
          .insert(defaultSettings);
      } catch (settingsError) {
        console.error('Error creating default settings:', settingsError);
        // Continue even if settings creation fails
      }

      // Refresh projects and select the new one
      await loadProjects();
      setSelectedProject(newProject.id);

      // Reset modal state
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectLogo(null);

      toast.success('Project created successfully!');

    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    if (!settings || !selectedProject) return;

    try {
      setSaving(true);

      // If it's a fallback settings, just show success (can't save to database)
      if (settings.id.startsWith('fallback-')) {
        toast.success('Settings saved locally! Note: Database not available.');
        return;
      }

      const settingsToSave = {
        widget_title: settings.widget_title,
        widget_color: settings.widget_color,
        greeting_text: settings.greeting_text
      };

      const { error } = await supabase
        .from('feedback_settings')
        .update(settingsToSave)
        .eq('id', settings.id);

      if (error) {
        console.error('Error saving settings:', error);
        throw error;
      }

      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Update setting
  const updateSetting = (key: keyof FeedbackSettings, value: any) => {
    if (!settings) return;
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  // Copy embed code
  const copyEmbedCode = async () => {
    if (!selectedProject || !settings) return;

    const embedCode = `<script src="${window.location.origin}/widget.js" data-project-id="${settings.project_id}"></script>`;
    
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
    return `${window.location.origin}/widget.js?project_id=${settings.project_id}`;
  };

  // Get direct form URLs
  const getFormUrls = () => {
    if (!selectedProject || !settings) return { satisfaction: '', feedback: '' };
    const baseUrl = window.location.origin;
    return {
      satisfaction: `${baseUrl}/forms/satisfaction?project_id=${settings.project_id}`,
      feedback: `${baseUrl}/forms/feedback?project_id=${settings.project_id}`
    };
  };

  // Handle logo file selection
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
            <Button onClick={loadProjects}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
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
            // Projects exist - show dropdown
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
          )}
        </CardContent>
      </Card>

      {/* Settings Tabs - Only show if project is selected */}
      {settings && selectedProject && (
        <Tabs defaultValue="widget" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="widget">Widget Customization</TabsTrigger>
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
                    <Label htmlFor="widget-title">Widget Title</Label>
                    <Input
                      id="widget-title"
                      value={settings.widget_title || ''}
                      onChange={(e) => updateSetting('widget_title', e.target.value)}
                      placeholder="We love your feedback!"
                    />
                  </div>

                  {/* Widget Color */}
                  <div className="space-y-2">
                    <Label htmlFor="widget-color">Widget Color</Label>
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
                      />
                    </div>
                  </div>

                  {/* Greeting Text */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="greeting-text">Greeting Text</Label>
                    <Textarea
                      id="greeting-text"
                      value={settings.greeting_text || ''}
                      onChange={(e) => updateSetting('greeting_text', e.target.value)}
                      placeholder="Help us improve by sharing your thoughts"
                      rows={3}
                    />
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
                      value={`<script src="${getEmbedUrl()}" data-project-id="${settings.project_id}"></script>`}
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
                  "border rounded-lg bg-white overflow-hidden",
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
              />
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
                <p className="text-xs text-gray-500">
                  Selected: {newProjectLogo.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={createProject} disabled={creating || !newProjectName.trim()}>
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
