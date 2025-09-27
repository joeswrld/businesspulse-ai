import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useFeedbackSettings } from '@/hooks/useFeedbackSettings';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, MessageSquare, Palette, Type, Eye, Copy, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EnhancedFeedbackWidget from '@/components/forms/EnhancedFeedbackWidget';

const FeedbackSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { 
    settings, 
    loading, 
    error, 
    updateSettings 
  } = useFeedbackSettings();

  const [formData, setFormData] = useState({
    widget_title: '',
    widget_color: '#3B82F6',
    greeting_text: ''
  });

  // Update form data when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData({
        widget_title: settings.widget_title || 'Share your feedback with us!',
        widget_color: settings.widget_color || '#3B82F6',
        greeting_text: settings.greeting_text || 'Welcome, tell us what\'s on your mind'
      });
    }
  }, [settings]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await updateSettings({
        widget_title: formData.widget_title,
        widget_color: formData.widget_color,
        greeting_text: formData.greeting_text
      });

      toast({
        title: 'Settings saved!',
        description: 'Your feedback widget settings have been updated.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyEmbedCode = () => {
    const embedCode = `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/feedback-widget.js';
    script.setAttribute('data-project-id', '${settings?.project_id}');
    script.setAttribute('data-widget-color', '${formData.widget_color}');
    script.setAttribute('data-widget-title', '${formData.widget_title}');
    script.setAttribute('data-greeting-text', '${formData.greeting_text}');
    document.head.appendChild(script);
  })();
</script>`;

    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Embed code copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getWidgetUrl = () => {
    if (!settings) return '';
    return `${window.location.origin}/feedback/${settings.project_id}`;
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

  if (error || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-red-500 mb-4">{error || 'Failed to load settings'}</p>
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
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feedback Widget Settings</h1>
            <p className="text-gray-600 mt-1">
              Customize your feedback widget appearance and behavior
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Type className="h-5 w-5" />
                <span>Widget Configuration</span>
              </CardTitle>
              <CardDescription>
                Customize the appearance and text of your feedback widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="widget_title">Widget Title</Label>
                <Input
                  id="widget_title"
                  value={formData.widget_title}
                  onChange={(e) => handleInputChange('widget_title', e.target.value)}
                  placeholder="Share your feedback with us!"
                />
                <p className="text-sm text-gray-500">
                  This title will appear at the top of your feedback widget
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="greeting_text">Greeting Text</Label>
                <Textarea
                  id="greeting_text"
                  value={formData.greeting_text}
                  onChange={(e) => handleInputChange('greeting_text', e.target.value)}
                  placeholder="Welcome, tell us what's on your mind"
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  This message will appear below the title to welcome users
                </p>
              </div>

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
                  Choose a color that matches your brand
                </p>
              </div>

              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Widget Preview</span>
              </CardTitle>
              <CardDescription>
                See how your feedback widget will appear to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative min-h-[500px] bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-4">
                  This is a preview of how your feedback widget will appear on your website:
                </p>
                <EnhancedFeedbackWidget
                  projectId={settings.project_id}
                  onFeedbackSubmitted={(feedback) => {
                    console.log('Preview feedback submitted:', feedback);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Copy className="h-5 w-5" />
                <span>Embed Code</span>
              </CardTitle>
              <CardDescription>
                Add this code to your website to display the feedback widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Direct Link</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Input
                      value={getWidgetUrl()}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(getWidgetUrl());
                        toast({
                          title: 'Copied!',
                          description: 'Widget URL copied to clipboard.',
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Direct link to your feedback form
                  </p>
                </div>

                <div>
                  <Label>JavaScript Embed Code</Label>
                  <div className="mt-2">
                    <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                      {`<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/feedback-widget.js';
    script.setAttribute('data-project-id', '${settings.project_id}');
    script.setAttribute('data-widget-color', '${formData.widget_color}');
    script.setAttribute('data-widget-title', '${formData.widget_title}');
    script.setAttribute('data-greeting-text', '${formData.greeting_text}');
    document.head.appendChild(script);
  })();
</script>`}
                    </pre>
                  </div>
                  <Button
                    onClick={copyEmbedCode}
                    className="mt-2"
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
                        Copy Embed Code
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-gray-500 mt-1">
                    Add this script tag to your website's HTML
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackSettings;