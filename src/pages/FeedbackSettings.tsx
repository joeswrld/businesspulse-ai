import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, MessageSquare, Palette, Type, Eye, Copy, Check, Settings, Globe } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CustomerSatisfactionForm from '@/components/forms/CustomerSatisfactionForm';
import ProductFeedbackForm from '@/components/forms/ProductFeedbackForm';

interface FeedbackSettings {
  id: string;
  project_id: string;
  widget_title: string;
  widget_color: string;
  greeting_text: string;
  customer_satisfaction_enabled: boolean;
  product_feedback_enabled: boolean;
  widget_position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  show_branding: boolean;
  custom_css: string | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  project_id: string;
  name: string;
}

const FeedbackSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  
  const [formData, setFormData] = useState({
    widget_title: 'We love your feedback!',
    widget_color: '#3B82F6',
    greeting_text: 'Help us improve by sharing your thoughts',
    customer_satisfaction_enabled: true,
    product_feedback_enabled: true,
    widget_position: 'bottom-left' as const,
    show_branding: true,
    custom_css: ''
  });

  useEffect(() => {
    if (user?.id) {
      loadProject();
    }
  }, [user?.id]);

  useEffect(() => {
    if (project?.id) {
      loadSettings();
    }
  }, [project?.id]);

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_id, name')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading project:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project information',
          variant: 'destructive'
        });
        return;
      }

      if (data) {
        setProject(data);
      } else {
        toast({
          title: 'No Project Found',
          description: 'Please create a project first',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const loadSettings = async () => {
    if (!project?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('project_id', project.project_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        toast({
          title: 'Error',
          description: 'Failed to load feedback settings',
          variant: 'destructive'
        });
        return;
      }

      if (data) {
        setSettings(data);
        setFormData({
          widget_title: data.widget_title,
          widget_color: data.widget_color,
          greeting_text: data.greeting_text,
          customer_satisfaction_enabled: data.customer_satisfaction_enabled,
          product_feedback_enabled: data.product_feedback_enabled,
          widget_position: data.widget_position,
          show_branding: data.show_branding,
          custom_css: data.custom_css || ''
        });
      } else {
        // Create default settings
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!project) return;

    try {
      const defaultSettings = {
        project_id: project.project_id,
        widget_title: formData.widget_title,
        widget_color: formData.widget_color,
        greeting_text: formData.greeting_text,
        customer_satisfaction_enabled: formData.customer_satisfaction_enabled,
        product_feedback_enabled: formData.product_feedback_enabled,
        widget_position: formData.widget_position,
        show_branding: formData.show_branding,
        custom_css: null
      };

      const { data, error } = await supabase
        .from('feedback_settings')
        .insert([defaultSettings])
        .select()
        .single();

      if (error) {
        console.error('Error creating default settings:', error);
        return;
      }

      setSettings(data);
      toast({
        title: 'Settings Created',
        description: 'Default feedback settings have been created for your project',
      });
    } catch (error) {
      console.error('Error creating default settings:', error);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!settings || !project) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('feedback_settings')
        .update({
          widget_title: formData.widget_title,
          widget_color: formData.widget_color,
          greeting_text: formData.greeting_text,
          customer_satisfaction_enabled: formData.customer_satisfaction_enabled,
          product_feedback_enabled: formData.product_feedback_enabled,
          widget_position: formData.widget_position,
          show_branding: formData.show_branding,
          custom_css: formData.custom_css || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) {
        throw error;
      }

      toast({
        title: 'Settings Saved!',
        description: 'Your feedback widget settings have been updated successfully.',
      });

      // Reload settings to get updated data
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const copyEmbedCode = () => {
    if (!project) return;

    const embedCode = `<script src="${window.location.origin}/widget.js" data-project-id="${project.project_id}"></script>`;

    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Embed code copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getWidgetUrls = () => {
    if (!project) return { csat: '', product: '' };
    
    return {
      csat: `${window.location.origin}/forms/csat/${project.project_id}`,
      product: `${window.location.origin}/forms/product/${project.project_id}`
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading feedback settings...</p>
        </div>
      </div>
    );
  }

  if (!project || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Settings Not Found</h3>
          <p className="text-red-500 mb-4">Failed to load or create feedback settings</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feedback Widget Settings</h1>
            <p className="text-gray-600 mt-1">
              Customize your feedback forms and widget appearance
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="forms" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Form Configuration</span>
              </CardTitle>
              <CardDescription>
                Enable or disable specific feedback forms and customize their behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Customer Satisfaction Survey</h4>
                    <p className="text-sm text-gray-600">Simple rating-based satisfaction survey</p>
                  </div>
                  <Switch
                    checked={formData.customer_satisfaction_enabled}
                    onCheckedChange={(checked) => handleInputChange('customer_satisfaction_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Product Feedback Form</h4>
                    <p className="text-sm text-gray-600">Detailed feedback form for bug reports and feature requests</p>
                  </div>
                  <Switch
                    checked={formData.product_feedback_enabled}
                    onCheckedChange={(checked) => handleInputChange('product_feedback_enabled', checked)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="widget_title">Widget Button Text</Label>
                <Input
                  id="widget_title"
                  value={formData.widget_title}
                  onChange={(e) => handleInputChange('widget_title', e.target.value)}
                  placeholder="We love your feedback!"
                />
                <p className="text-sm text-gray-500">
                  Text that appears on the floating widget button
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="greeting_text">Greeting Message</Label>
                <Textarea
                  id="greeting_text"
                  value={formData.greeting_text}
                  onChange={(e) => handleInputChange('greeting_text', e.target.value)}
                  placeholder="Help us improve by sharing your thoughts"
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  Welcome message shown when users open the feedback widget
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Widget Appearance</span>
              </CardTitle>
              <CardDescription>
                Customize the visual appearance of your feedback widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="widget_color">Widget Color</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    id="widget_color"
                    type="color"
                    value={formData.widget_color}
                    onChange={(e) => handleInputChange('widget_color', e.target.value)}
                    className="w-20 h-10 p-1 border rounded"
                  />
                  <Input
                    value={formData.widget_color}
                    onChange={(e) => handleInputChange('widget_color', e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Primary color for the widget button and accents
                </p>
              </div>

              <div className="space-y-2">
                <Label>Widget Position</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'bottom-left', label: 'Bottom Left' },
                    { value: 'bottom-right', label: 'Bottom Right' },
                    { value: 'top-left', label: 'Top Left' },
                    { value: 'top-right', label: 'Top Right' }
                  ].map((position) => (
                    <button
                      key={position.value}
                      type="button"
                      className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                        formData.widget_position === position.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleInputChange('widget_position', position.value)}
                    >
                      {position.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Choose where the widget appears on your website
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">Show NoteX Branding</h4>
                  <p className="text-sm text-gray-600">Display "Powered by NoteX" in the widget footer</p>
                </div>
                <Switch
                  checked={formData.show_branding}
                  onCheckedChange={(checked) => handleInputChange('show_branding', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom_css">Custom CSS (Advanced)</Label>
                <Textarea
                  id="custom_css"
                  value={formData.custom_css}
                  onChange={(e) => handleInputChange('custom_css', e.target.value)}
                  placeholder="/* Add custom CSS to override widget styles */&#10;.notex-widget-button {&#10;  /* Custom styles here */&#10;}"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  Advanced: Add custom CSS to further customize the widget appearance
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Form Previews</span>
              </CardTitle>
              <CardDescription>
                Preview how your feedback forms will appear to users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {formData.customer_satisfaction_enabled && (
                <div>
                  <h4 className="font-medium mb-4">Customer Satisfaction Survey</h4>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <CustomerSatisfactionForm 
                      projectId={project.project_id}
                      previewMode={true}
                    />
                  </div>
                </div>
              )}

              {formData.product_feedback_enabled && (
                <div>
                  <h4 className="font-medium mb-4">Product Feedback Form</h4>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <ProductFeedbackForm 
                      projectId={project.project_id}
                      previewMode={true}
                    />
                  </div>
                </div>
              )}

              {!formData.customer_satisfaction_enabled && !formData.product_feedback_enabled && (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>No forms are currently enabled. Enable forms in the Forms tab to see previews.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Embed Code & Direct Links</span>
              </CardTitle>
              <CardDescription>
                Add the feedback widget to your website or share direct form links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">JavaScript Embed Code (Recommended)</Label>
                  <p className="text-sm text-gray-600 mb-3">
                    Add this script to your website to display the interactive feedback widget
                  </p>
                  <div className="relative">
                    <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto pr-16">
{`<script src="${window.location.origin}/widget.js" data-project-id="${project.project_id}"></script>`}
                    </pre>
                    <Button
                      onClick={copyEmbedCode}
                      className="absolute top-2 right-2"
                      size="sm"
                      variant="outline"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-base font-medium">Customer Satisfaction Survey Link</Label>
                    <p className="text-sm text-gray-600 mb-2">Direct link to the satisfaction survey</p>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={getWidgetUrls().csat}
                        readOnly
                        className="flex-1 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(getWidgetUrls().csat);
                          toast({ title: 'Copied!', description: 'CSAT survey URL copied to clipboard.' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Product Feedback Form Link</Label>
                    <p className="text-sm text-gray-600 mb-2">Direct link to the product feedback form</p>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={getWidgetUrls().product}
                        readOnly
                        className="flex-1 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(getWidgetUrls().product);
                          toast({ title: 'Copied!', description: 'Product feedback URL copied to clipboard.' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">Integration Instructions</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Add the embed script to your website's HTML (before closing &lt;/body&gt; tag)</li>
                    <li>• The widget will automatically appear based on your position settings</li>
                    <li>• Direct links can be shared via email, social media, or embedded as buttons</li>
                    <li>• All feedback submissions will appear in your Feedback dashboard in real-time</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          size="lg"
          className="min-w-[200px]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save All Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default FeedbackSettings;
