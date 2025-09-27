import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import {
  Settings,
  Palette,
  Eye,
  Copy,
  Check,
  MessageSquare,
  Star,
  Bug,
  Lightbulb,
  Globe,
  Smartphone,
  Monitor,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Code,
  Share2
} from 'lucide-react';

// Types
interface FeedbackSettings {
  id: string;
  project_id: string;
  customer_satisfaction_enabled: boolean;
  product_feedback_enabled: boolean;
  widget_title: string;
  widget_color: string;
  greeting_text: string;
  widget_position: string;
  show_branding: boolean;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  user_id: string;
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

  // Load user projects and settings
  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load user's projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Error loading projects:', projectsError);
        throw projectsError;
      }

      setProjects(projectsData || []);

      if (projectsData && projectsData.length > 0) {
        const firstProject = projectsData[0];
        setSelectedProject(firstProject.id);

        // Load settings for the first project
        const { data: settingsData, error: settingsError } = await supabase
          .from('feedback_settings')
          .select('*')
          .eq('project_id', firstProject.id)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error('Error loading settings:', settingsError);
          throw settingsError;
        }

        if (settingsData) {
          setSettings(settingsData);
        } else {
          // Create default settings
          const defaultSettings: Omit<FeedbackSettings, 'id' | 'created_at' | 'updated_at'> = {
            project_id: firstProject.id,
            customer_satisfaction_enabled: true,
            product_feedback_enabled: true,
            widget_title: 'We love your feedback!',
            widget_color: '#3B82F6',
            greeting_text: 'Help us improve by sharing your thoughts',
            widget_position: 'bottom-right',
            show_branding: true
          };

          const { data: newSettings, error: createError } = await supabase
            .from('feedback_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (createError) {
            console.error('Error creating settings:', createError);
            throw createError;
          }

          setSettings(newSettings);
        }
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data on component mount
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [loadData, user]);

  // Load settings when project changes
  useEffect(() => {
    if (selectedProject && user) {
      loadProjectSettings(selectedProject);
    }
  }, [selectedProject, user]);

  const loadProjectSettings = async (projectId: string) => {
    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error loading settings:', settingsError);
        throw settingsError;
      }

      if (settingsData) {
        setSettings(settingsData);
      } else {
        // Create default settings for this project
        const defaultSettings: Omit<FeedbackSettings, 'id' | 'created_at' | 'updated_at'> = {
          project_id: projectId,
          customer_satisfaction_enabled: true,
          product_feedback_enabled: true,
          widget_title: 'We love your feedback!',
          widget_color: '#3B82F6',
          greeting_text: 'Help us improve by sharing your thoughts',
          widget_position: 'bottom-right',
          show_branding: true
        };

        const { data: newSettings, error: createError } = await supabase
          .from('feedback_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) {
          console.error('Error creating settings:', createError);
          throw createError;
        }

        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error loading project settings:', error);
      toast.error('Failed to load settings for this project');
    }
  };

  // Save settings
  const saveSettings = async () => {
    if (!settings || !selectedProject) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('feedback_settings')
        .upsert({
          ...settings,
          project_id: selectedProject,
          updated_at: new Date().toISOString()
        });

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
    if (!selectedProject) return;

    const embedCode = `<script src="${window.location.origin}/widget.js" data-project-id="${selectedProject}"></script>`;
    
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
    if (!selectedProject) return '';
    return `${window.location.origin}/widget.js?project_id=${selectedProject}`;
  };

  // Get direct form URLs
  const getFormUrls = () => {
    if (!selectedProject) return { satisfaction: '', feedback: '' };
    const baseUrl = window.location.origin;
    return {
      satisfaction: `${baseUrl}/forms/satisfaction?project_id=${selectedProject}`,
      feedback: `${baseUrl}/forms/feedback?project_id=${selectedProject}`
    };
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
            <Button onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Globe className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Projects Found</h2>
            <p className="text-gray-600 mb-4">
              You need to create a project first to configure feedback settings.
            </p>
            <Button asChild>
              <a href="/dashboard">Go to Dashboard</a>
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
          <div className="space-y-2">
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
        </CardContent>
      </Card>

      {settings && (
        <Tabs defaultValue="forms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="forms">Form Management</TabsTrigger>
            <TabsTrigger value="widget">Widget Customization</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Form Management */}
          <TabsContent value="forms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Form Management</span>
                </CardTitle>
                <CardDescription>
                  Enable or disable different types of feedback forms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Customer Satisfaction Form */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Star className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Customer Satisfaction Form</h3>
                      <p className="text-sm text-gray-500">
                        5-star rating with optional comments
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.customer_satisfaction_enabled}
                    onCheckedChange={(checked) => updateSetting('customer_satisfaction_enabled', checked)}
                  />
                </div>

                {/* Product Feedback Form */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Bug className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">Product Feedback Form</h3>
                      <p className="text-sm text-gray-500">
                        Bug reports, feature requests, and general feedback
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.product_feedback_enabled}
                    onCheckedChange={(checked) => updateSetting('product_feedback_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                      value={settings.widget_title}
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
                        value={settings.widget_color}
                        onChange={(e) => updateSetting('widget_color', e.target.value)}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        value={settings.widget_color}
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
                      value={settings.greeting_text}
                      onChange={(e) => updateSetting('greeting_text', e.target.value)}
                      placeholder="Help us improve by sharing your thoughts"
                      rows={3}
                    />
                  </div>

                  {/* Widget Position */}
                  <div className="space-y-2">
                    <Label htmlFor="widget-position">Widget Position</Label>
                    <Select
                      value={settings.widget_position}
                      onValueChange={(value) => updateSetting('widget_position', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="top-left">Top Left</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Show Branding */}
                  <div className="space-y-2">
                    <Label htmlFor="show-branding">Show Branding</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="show-branding"
                        checked={settings.show_branding}
                        onCheckedChange={(checked) => updateSetting('show_branding', checked)}
                      />
                      <span className="text-sm text-gray-500">
                        Show "Powered by NoteX" in the widget
                      </span>
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
                      value={`<script src="${getEmbedUrl()}" data-project-id="${selectedProject}"></script>`}
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
                      <span className="text-blue-600">GET</span> /api/widget/settings/{selectedProject}
                    </div>
                    <div>
                      <span className="text-green-600">POST</span> /api/widget/feedback
                    </div>
                    <div>
                      <span className="text-blue-600">GET</span> /api/feedback/stats/{selectedProject}
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
                      {settings.customer_satisfaction_enabled && (
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2 flex items-center">
                            <Star className="h-4 w-4 mr-2 text-yellow-500" />
                            Customer Satisfaction
                          </h4>
                          <div className="flex items-center space-x-1 mb-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className="h-5 w-5 text-gray-300" />
                            ))}
                          </div>
                          <Textarea
                            placeholder="Tell us more about your experience (optional)"
                            rows={3}
                            className="text-sm"
                          />
                        </div>
                      )}

                      {settings.product_feedback_enabled && (
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-2 flex items-center">
                            <Bug className="h-4 w-4 mr-2 text-blue-500" />
                            Product Feedback
                          </h4>
                          <Select>
                            <SelectTrigger className="mb-3">
                              <SelectValue placeholder="Select feedback type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bug">Bug Report</SelectItem>
                              <SelectItem value="feature">Feature Request</SelectItem>
                              <SelectItem value="general">General Feedback</SelectItem>
                            </SelectContent>
                          </Select>
                          <Textarea
                            placeholder="Describe your feedback in detail"
                            rows={3}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {settings.show_branding && (
                      <div className="text-center mt-4 pt-4 border-t">
                        <p className="text-xs text-gray-500">
                          Powered by <span className="font-medium">NoteX</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}