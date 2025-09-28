import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  getUserProjects, 
  getFeedbackSettings, 
  createDefaultFeedbackSettings,
  updateFeedbackSettings,
  ensureUserHasProject,
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
  Lock
} from 'lucide-react';

export default function FeedbackSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Load user's auto-generated project and settings
  const loadUserProject = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('Loading user project for:', user.id);

      // Ensure user has a project (auto-generated)
      const userProject = await ensureUserHasProject(user.id);
      console.log('User project loaded:', userProject);
      setProject(userProject);

      // Load feedback settings for this project
      let settingsData = await getFeedbackSettings(userProject.id, user.id);

      if (settingsData) {
        console.log('Loaded existing settings:', settingsData);
        setSettings(settingsData);
      } else {
        // Create default settings if none exist
        console.log('No settings found, creating default settings');
        try {
          settingsData = await createDefaultFeedbackSettings(userProject.id, user.id);
          console.log('Created new settings:', settingsData);
          setSettings(settingsData);
        } catch (createError) {
          console.error('Failed to create settings, using fallback:', createError);
          const fallbackSettings: FeedbackSettings = {
            id: `fallback-${userProject.id}`,
            user_id: user.id,
            project_id: userProject.id,
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
      console.error('Error loading user project:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while loading your project';
      setError(errorMessage);
      toast.error(`Failed to load project: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Enhanced save settings with validation
  const saveSettings = async () => {
    if (!settings || !project) {
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
      loadUserProject();
    }
  }, [loadUserProject, user]);

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
    if (!project || !settings) return;

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
    if (!project || !settings) return '';
    return `https://notex.com.ng/widget.js?project_id=${settings.project_id}`;
  };

  // Get direct form URLs
  const getFormUrls = () => {
    if (!project || !settings) return { satisfaction: '', feedback: '' };
    const baseUrl = 'https://notex.com.ng';
    return {
      satisfaction: `${baseUrl}/forms/satisfaction?project_id=${settings.project_id}`,
      feedback: `${baseUrl}/forms/feedback?project_id=${settings.project_id}`
    };
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
              <Button onClick={loadUserProject}>
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

      {/* Project Information - Read Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>Your Project</span>
          </CardTitle>
          <CardDescription>
            Your project is automatically generated and cannot be modified
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={project?.name || 'My Project'}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-id">Project ID</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="project-id"
                    value={project?.id || ''}
                    readOnly
                    className="bg-gray-50 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (project?.id) {
                        navigator.clipboard.writeText(project.id);
                        toast.success('Project ID copied to clipboard!');
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Globe className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Auto-Generated Project</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Every user automatically gets a project when they sign up. This project ID is permanent and cannot be changed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs - Only show if project and settings are loaded */}
      {settings && project && (
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
                        <div className="p-2 border rounded bg-gray-50">
                          <span className="text-sm text-gray-500">Select a category</span>
                        </div>
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
                          <div className="p-2 border rounded bg-white mt-1">
                            <span className="text-sm text-gray-500">Select a category</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Describe your feedback</label>
                          <Textarea
                            placeholder="Please provide detailed feedback..."
                            rows={3}
                            readOnly
                            className="bg-white mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Contact Information (Optional)</label>
                          <Input
                            placeholder="Your email address"
                            readOnly
                            className="bg-white mt-1"
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
    </div>
  );
}