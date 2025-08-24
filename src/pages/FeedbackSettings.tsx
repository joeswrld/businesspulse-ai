import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  SlidersHorizontal, 
  Palette, 
  Globe, 
  Bell, 
  Code, 
  Smartphone,
  Monitor,
  Zap,
  Shield,
  Settings,
  Eye,
  Download,
  Copy,
  Check,
  Save,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Mail,
  Tag,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  X,
  Play,
  Square,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackSettings {
  id: string;
  user_id: string;
  project_id: string;
  project_id_locked: boolean;
  title: string;
  show_name: boolean;
  show_email: boolean;
  button_text: string;
  redirect_url: string | null;
  theme: 'light' | 'dark';
  brand_color: string;
  notify_email: string | null;
  created_at: string;
  updated_at: string;
}

interface WidgetSettings {
  id: string;
  user_id: string;
  brand_color: string;
  greeting_text: string;
  widget_position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  widget_location: 'fixed' | 'inline';
  anonymous_feedback: boolean;
  email_notifications: boolean;
  ai_auto_tagging: boolean;
  auto_resolve_after_reply: boolean;
  created_at: string;
  updated_at: string;
}

const FeedbackSettings = () => {
  const { user } = useAuth();
  
  // State management
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectIdStatus, setProjectIdStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [showTestModal, setShowTestModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Load settings and widget settings
  const loadSettings = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load feedback settings
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (feedbackError) {
        console.error('Error loading feedback settings:', feedbackError);
        throw feedbackError;
      }

      if (feedbackData && feedbackData.length > 0) {
        setSettings(feedbackData[0]);
      } else {
        // Create default feedback settings
        const newFeedbackSettings = {
          user_id: user.id,
          project_id: '',
          project_id_locked: false,
          title: 'Share your thoughts with us',
          show_name: true,
          show_email: true,
          button_text: 'Send Feedback',
          theme: 'light',
          brand_color: '#2563eb'
        };
        
        const { data: newFeedbackData, error: createFeedbackError } = await supabase
          .from('feedback_settings')
          .insert(newFeedbackSettings)
          .select()
          .single();

        if (createFeedbackError) {
          throw createFeedbackError;
        }
        
        setSettings(newFeedbackData);
      }

      // Load widget settings
      const { data: widgetData, error: widgetError } = await supabase
        .from('widget_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (widgetError && widgetError.code !== 'PGRST116') {
        console.error('Error loading widget settings:', widgetError);
        // Don't throw error for widget settings, create default ones
      }

      if (widgetData) {
        setWidgetSettings(widgetData);
      } else {
        // Create default widget settings
        const newWidgetSettings = {
          user_id: user.id,
          brand_color: '#2563eb',
          greeting_text: 'We\'d love to hear your feedback!',
          widget_position: 'bottom-right',
          widget_location: 'fixed',
          anonymous_feedback: false,
          email_notifications: true,
          ai_auto_tagging: true,
          auto_resolve_after_reply: false
        };
        
        const { data: newWidgetData, error: createWidgetError } = await supabase
          .from('widget_settings')
          .insert(newWidgetSettings)
          .select()
          .single();

        if (createWidgetError) {
          console.error('Error creating widget settings:', createWidgetError);
          // Continue without widget settings for now
        } else {
          setWidgetSettings(newWidgetData);
        }
      }

    } catch (error) {
      console.error('Error in loadSettings:', error);
      let errorMessage = 'Failed to load settings. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('relation "feedback_settings" does not exist')) {
          errorMessage = 'Database tables not set up. Please run the database setup script first.';
        } else if (error.message.includes('permission denied')) {
          errorMessage = 'Permission denied. Please check your database permissions.';
        } else {
          errorMessage = `Failed to load settings: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const checkProjectIdAvailability = useCallback(async (projectId: string) => {
    if (!user || !projectId || projectId.trim() === '' || projectId.length < 3) {
      setProjectIdStatus('idle');
      return;
    }

    setProjectIdStatus('checking');

    try {
      // Check global uniqueness across all users
      const { data: existingSettings, error: checkError } = await supabase
        .from('feedback_settings')
        .select('id, project_id, user_id')
        .eq('project_id', projectId.trim())
        .neq('id', settings?.id || '');

      if (checkError) {
        console.error('Error checking project ID availability:', checkError);
        setProjectIdStatus('idle');
        return;
      }

      if (existingSettings && existingSettings.length > 0) {
        setProjectIdStatus('taken');
      } else {
        setProjectIdStatus('available');
      }
    } catch (error) {
      console.error('Error checking project ID availability:', error);
      setProjectIdStatus('idle');
    }
  }, [user, settings?.id]);

  // Load settings on component mount
  useEffect(() => {
    setError(null);
    loadSettings();
  }, [user, loadSettings]);

  // Check project ID availability when it changes
  useEffect(() => {
    if (!settings?.project_id_locked && settings?.project_id) {
      const timeoutId = setTimeout(() => {
        checkProjectIdAvailability(settings.project_id);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setProjectIdStatus('idle');
    }
  }, [settings?.project_id, settings?.project_id_locked, checkProjectIdAvailability]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    loadSettings();
  };

  const handleSaveSettings = async () => {
    if (!user || !settings || !widgetSettings) return;
    
    // Validate that Project ID is provided
    if (!settings.project_id || settings.project_id.trim() === '') {
      toast.error('Project ID is required');
      return;
    }
    
    // Validate Project ID length
    if (settings.project_id.trim().length < 3) {
      toast.error('Project ID must be at least 3 characters long');
      return;
    }
    
    // Check if Project ID is available before saving
    if (!settings.project_id_locked) {
      const { data: existingSettings, error: checkError } = await supabase
        .from('feedback_settings')
        .select('id, project_id, user_id')
        .eq('project_id', settings.project_id.trim())
        .neq('id', settings.id);

      if (checkError) {
        toast.error('Failed to validate Project ID');
        return;
      }

      if (existingSettings && existingSettings.length > 0) {
        toast.error('Project ID is already taken by another user');
        return;
      }
    }

    setSaving(true);
    try {
      // Save feedback settings
      const { error: feedbackError } = await supabase
        .from('feedback_settings')
        .update({
          title: settings.title,
          show_name: settings.show_name,
          show_email: settings.show_email,
          button_text: settings.button_text,
          redirect_url: settings.redirect_url,
          theme: settings.theme,
          brand_color: settings.brand_color,
          project_id: settings.project_id,
          project_id_locked: true, // Lock the project ID after first save
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (feedbackError) throw feedbackError;

      // Save widget settings
      const { error: widgetError } = await supabase
        .from('widget_settings')
        .update({
          brand_color: widgetSettings.brand_color,
          greeting_text: widgetSettings.greeting_text,
          widget_position: widgetSettings.widget_position,
          widget_location: widgetSettings.widget_location,
          anonymous_feedback: widgetSettings.anonymous_feedback,
          email_notifications: widgetSettings.email_notifications,
          ai_auto_tagging: widgetSettings.ai_auto_tagging,
          auto_resolve_after_reply: widgetSettings.auto_resolve_after_reply,
          updated_at: new Date().toISOString()
        })
        .eq('id', widgetSettings.id);

      if (widgetError) throw widgetError;

      setLastSaved(new Date().toLocaleString());
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const generateEmbedCode = () => {
    if (!settings?.project_id) return '';
    
    return `<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget.js';
    script.setAttribute('data-project-id', '${settings.project_id}');
    script.setAttribute('data-brand-color', '${widgetSettings?.brand_color || '#2563eb'}');
    script.setAttribute('data-greeting-text', '${widgetSettings?.greeting_text || 'We\'d love to hear your feedback!'}');
    script.setAttribute('data-widget-position', '${widgetSettings?.widget_position || 'bottom-right'}');
    script.setAttribute('data-widget-location', '${widgetSettings?.widget_location || 'fixed'}');
    document.head.appendChild(script);
  })();
</script>`;
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
            <p className="text-gray-600">Please wait while we fetch your configuration.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Error Loading Settings</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button onClick={handleRetry}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Feedback Widget Settings</h1>
        <p className="text-gray-600">Configure your feedback widget and customize its appearance</p>
        {lastSaved && (
          <div className="mt-2 text-sm text-green-600">
            Last updated on {lastSaved}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Settings */}
        <div className="space-y-6">
          {/* Project Configuration */}
          <Card className="rounded-xl shadow-lg border-2 border-blue-100">
            <CardHeader className="bg-blue-50 rounded-t-xl">
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Globe className="h-5 w-5" />
                <span>Project Configuration</span>
              </CardTitle>
              <CardDescription className="text-blue-700">
                Your unique project ID identifies feedback from your website
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="projectId" className="text-sm font-medium">
                  Project ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="projectId"
                  value={settings?.project_id || ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, project_id: e.target.value } : null)}
                  placeholder="Enter your unique project ID"
                  className="mt-1"
                  disabled={settings?.project_id_locked || false}
                  required
                />
                {settings?.project_id_locked && (
                  <p className="text-sm text-blue-600 mt-1 flex items-center">
                    <Lock className="h-4 w-4 mr-1" />
                    Project ID is locked and cannot be changed
                  </p>
                )}
                {!settings?.project_id_locked && projectIdStatus === 'available' && (
                  <p className="text-sm text-green-600 mt-1">✓ Project ID available</p>
                )}
                {!settings?.project_id_locked && projectIdStatus === 'taken' && (
                  <p className="text-sm text-red-600 mt-1">✗ Project ID already taken by another user</p>
                )}
                {!settings?.project_id_locked && projectIdStatus === 'checking' && (
                  <p className="text-sm text-blue-600 mt-1">Checking availability...</p>
                )}
                {!settings?.project_id_locked && projectIdStatus === 'idle' && settings?.project_id && (
                  <p className="text-sm text-gray-600 mt-1">Project ID will be locked after saving</p>
                )}
                {!settings?.project_id_locked && settings?.project_id && settings.project_id.length < 3 && (
                  <p className="text-sm text-red-600 mt-1">Project ID must be at least 3 characters long</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Widget Customization */}
          <Card className="rounded-xl shadow-lg border-2 border-blue-100">
            <CardHeader className="bg-blue-50 rounded-t-xl">
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Palette className="h-5 w-5" />
                <span>Widget Customization</span>
              </CardTitle>
              <CardDescription className="text-blue-700">
                Customize the appearance and behavior of your feedback widget
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="widgetPosition" className="text-sm font-medium">
                  Widget Position
                </Label>
                <Select
                  value={widgetSettings?.widget_position || 'bottom-right'}
                  onValueChange={(value) => setWidgetSettings(prev => prev ? { ...prev, widget_position: value as any } : null)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select widget position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 mt-1">
                  Choose where the widget appears on your website
                </p>
              </div>

              <div>
                <Label htmlFor="widgetLocation" className="text-sm font-medium">
                  Widget Location
                </Label>
                <Select
                  value={widgetSettings?.widget_location || 'fixed'}
                  onValueChange={(value) => setWidgetSettings(prev => prev ? { ...prev, widget_location: value as any } : null)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select widget location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Position (Stays in place when scrolling)</SelectItem>
                    <SelectItem value="inline">Inline (Flows with page content)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-600 mt-1">
                  Fixed position stays visible while scrolling, inline flows with content
                </p>
              </div>

              <div>
                <Label htmlFor="greetingText" className="text-sm font-medium">
                  Greeting Text
                </Label>
                <Textarea
                  id="greetingText"
                  value={widgetSettings?.greeting_text || ''}
                  onChange={(e) => setWidgetSettings(prev => prev ? { ...prev, greeting_text: e.target.value } : null)}
                  placeholder="We'd love to hear your feedback!"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Collection Settings */}
          <Card className="rounded-xl shadow-lg border-2 border-blue-100">
            <CardHeader className="bg-blue-50 rounded-t-xl">
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <SlidersHorizontal className="h-5 w-5" />
                <span>Collection Settings</span>
              </CardTitle>
              <CardDescription className="text-blue-700">
                Configure how feedback is collected and processed
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Anonymous Feedback</Label>
                  <p className="text-xs text-gray-500">Allow users to submit feedback without providing contact information</p>
                </div>
                <Switch
                  checked={widgetSettings?.anonymous_feedback || false}
                  onCheckedChange={(checked) => setWidgetSettings(prev => prev ? { ...prev, anonymous_feedback: checked } : null)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Email Notifications</Label>
                  <p className="text-xs text-gray-500">Receive email alerts when new feedback is submitted</p>
                </div>
                <Switch
                  checked={widgetSettings?.email_notifications || false}
                  onCheckedChange={(checked) => setWidgetSettings(prev => prev ? { ...prev, email_notifications: checked } : null)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">AI Auto-Tagging</Label>
                  <p className="text-xs text-gray-500">Automatically categorize feedback using AI analysis</p>
                </div>
                <Switch
                  checked={widgetSettings?.ai_auto_tagging || false}
                  onCheckedChange={(checked) => setWidgetSettings(prev => prev ? { ...prev, ai_auto_tagging: checked } : null)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Auto-Resolve After Reply</Label>
                  <p className="text-xs text-gray-500">Automatically mark feedback as resolved when you reply</p>
                </div>
                <Switch
                  checked={widgetSettings?.auto_resolve_after_reply || false}
                  onCheckedChange={(checked) => setWidgetSettings(prev => prev ? { ...prev, auto_resolve_after_reply: checked } : null)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSaveSettings}
            disabled={saving || !settings?.project_id || (settings?.project_id && settings.project_id.trim().length < 3)}
            className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {/* Right Column - Preview & Code */}
        <div className="space-y-6">
          {/* Live Widget Preview */}
          <Card className="rounded-xl shadow-lg border-2 border-blue-100">
            <CardHeader className="bg-blue-50 rounded-t-xl">
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Eye className="h-5 w-5" />
                <span>Live Widget Preview</span>
              </CardTitle>
              <CardDescription className="text-blue-700">
                See how your widget will look on your website
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500 mb-4">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Widget Preview</p>
                </div>
                
                {/* Widget Button Preview */}
                <div className="flex justify-center">
                  <div
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-full cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ backgroundColor: widgetSettings?.brand_color || '#2563eb' }}
                  >
                    <MessageSquare className="h-4 w-4 text-white" />
                    <span className="text-white font-medium text-sm">
                      {settings?.button_text || 'Send Feedback'}
                    </span>
                  </div>
                </div>

                {/* Greeting Text Preview */}
                {widgetSettings?.greeting_text && (
                  <div className="mt-4 p-3 bg-white rounded-lg border">
                    <p className="text-sm text-gray-700 text-center">
                      {widgetSettings.greeting_text}
                    </p>
                  </div>
                )}

                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTestModal(true)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Test Widget
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Embed Code Generator */}
          <Card className="rounded-xl shadow-lg border-2 border-blue-100">
            <CardHeader className="bg-blue-50 rounded-t-xl">
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Code className="h-5 w-5" />
                <span>Embed Code Generator</span>
              </CardTitle>
              <CardDescription className="text-blue-700">
                Copy this code to your website to display the feedback widget
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {settings?.project_id && settings.project_id.trim() !== '' ? (
                <>
                  <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                    <pre>{generateEmbedCode()}</pre>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => copyToClipboard(generateEmbedCode())}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy to Clipboard
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowTestModal(true)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Test
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Code className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Enter a Project ID to generate embed code</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Integrations */}
          <Card className="rounded-xl shadow-lg border-2 border-gray-100">
            <CardHeader className="bg-gray-50 rounded-t-xl">
              <CardTitle className="flex items-center space-x-2 text-gray-900">
                <Zap className="h-5 w-5" />
                <span>Integrations</span>
              </CardTitle>
              <CardDescription className="text-gray-700">
                Connect your feedback system with other tools
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <MessageSquare className="h-8 w-8 text-gray-400" />
                  <span className="text-lg font-medium text-gray-600">Slack</span>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Mail className="h-8 w-8 text-gray-400" />
                  <span className="text-lg font-medium text-gray-600">Email</span>
                </div>
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <ExternalLink className="h-8 w-8 text-gray-400" />
                  <span className="text-lg font-medium text-gray-600">Webhooks</span>
                </div>
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  Coming Soon 🚀
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Test Widget Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Test Widget Preview</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTestModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
                <div className="text-center mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Your Website</h4>
                  <p className="text-sm text-gray-500">This is how the widget will appear on your site</p>
                </div>
                
                {/* Simulated Website Content */}
                <div className="bg-white rounded-lg p-4 mb-4">
                  <h5 className="font-medium text-gray-900 mb-2">Welcome to Your Website</h5>
                  <p className="text-gray-600 text-sm">This is sample content to show how the feedback widget integrates with your site.</p>
                </div>
                
                {/* Widget Button */}
                <div className="flex justify-end">
                  <div
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-full cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    style={{ backgroundColor: widgetSettings?.brand_color || '#2563eb' }}
                  >
                    <MessageSquare className="h-4 w-4 text-white" />
                    <span className="text-white font-medium text-sm">
                      {settings?.button_text || 'Send Feedback'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-center mt-4">
                <p className="text-sm text-gray-500">
                  The widget will appear as a floating button on your website
                </p>
              </div>
            </div>
            
            <div className="flex justify-end p-6 border-t bg-gray-50">
              <Button onClick={() => setShowTestModal(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackSettings;