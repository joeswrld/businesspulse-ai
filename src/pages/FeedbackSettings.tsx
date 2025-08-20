import { useState, useEffect } from "react";
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
  Save
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

const FeedbackSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // Create default settings
        const defaultProjectId = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
        const { data: newSettings, error: createError } = await supabase
          .from('feedback_settings')
          .insert({
            user_id: user.id,
            project_id: defaultProjectId,
            project_id_locked: false,
            title: 'Share your thoughts with us',
            show_name: true,
            show_email: true,
            button_text: 'Send Feedback',
            theme: 'light',
            brand_color: '#2563eb'
          })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('feedback_settings')
        .update({
          ...settings,
          project_id_locked: true
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyEmbedCode = async () => {
    if (!settings) return;

    const embedCode = `<script src="https://notex.com.ng/feedback-widget.js" data-project-id="${settings.project_id}"></script>`;
    
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success('Embed code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy embed code');
    }
  };

  const generateEmbedCode = () => {
    if (!settings) return '';

    return `<script src="https://notex.com.ng/feedback-widget.js" data-project-id="${settings.project_id}"></script>`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading feedback settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Failed to load settings. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mr-4">
            <SlidersHorizontal className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Feedback Settings</h1>
            <Badge variant="secondary" className="mt-2">
              Live
            </Badge>
          </div>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Customize your feedback widget and configure how you receive feedback from your website visitors.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Project ID Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Project Configuration
            </CardTitle>
            <CardDescription>
              Your unique project ID is used to identify feedback from your website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-id">Project ID</Label>
              <div className="flex gap-2">
                <Input
                  id="project-id"
                  value={settings.project_id}
                  onChange={(e) => setSettings({ ...settings, project_id: e.target.value })}
                  disabled={settings.project_id_locked}
                  className="font-mono"
                />
                {settings.project_id_locked && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {settings.project_id_locked 
                  ? "Project ID is locked and cannot be changed after saving."
                  : "Edit your project ID before saving. It will be locked after the first save."
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Widget Customization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Widget Customization
            </CardTitle>
            <CardDescription>
              Customize the appearance and behavior of your feedback widget.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Widget Title</Label>
                <Input
                  id="title"
                  value={settings.title}
                  onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                  placeholder="Share your thoughts with us"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="button-text">Button Text</Label>
                <Input
                  id="button-text"
                  value={settings.button_text}
                  onChange={(e) => setSettings({ ...settings, button_text: e.target.value })}
                  placeholder="Send Feedback"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select 
                  value={settings.theme} 
                  onValueChange={(value: 'light' | 'dark') => setSettings({ ...settings, theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand-color">Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="brand-color"
                    type="color"
                    value={settings.brand_color}
                    onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.brand_color}
                    onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                    placeholder="#2563eb"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Name Field</Label>
                  <p className="text-sm text-gray-500">Display name input field in the feedback form</p>
                </div>
                <Switch
                  checked={settings.show_name}
                  onCheckedChange={(checked) => setSettings({ ...settings, show_name: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Email Field</Label>
                  <p className="text-sm text-gray-500">Display email input field in the feedback form</p>
                </div>
                <Switch
                  checked={settings.show_email}
                  onCheckedChange={(checked) => setSettings({ ...settings, show_email: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive notifications for new feedback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notify-email">Email Notifications</Label>
              <Input
                id="notify-email"
                type="email"
                value={settings.notify_email || ''}
                onChange={(e) => setSettings({ ...settings, notify_email: e.target.value || null })}
                placeholder="your@email.com"
              />
              <p className="text-sm text-gray-500">
                Receive email notifications when new feedback is submitted (optional)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="redirect-url">Redirect URL</Label>
              <Input
                id="redirect-url"
                type="url"
                value={settings.redirect_url || ''}
                onChange={(e) => setSettings({ ...settings, redirect_url: e.target.value || null })}
                placeholder="https://your-website.com/thank-you"
              />
              <p className="text-sm text-gray-500">
                URL to redirect users after submitting feedback (optional)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving || settings.project_id_locked}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {/* Embed Code */}
        {settings.project_id_locked && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Embed Code
              </CardTitle>
              <CardDescription>
                Copy and paste this code into your website to display the feedback widget.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  value={generateEmbedCode()}
                  readOnly
                  rows={3}
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyEmbedCode}
                  className="absolute top-2 right-2"
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to use:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Copy the embed code above</li>
                  <li>2. Paste it into your website's HTML (before the closing &lt;/body&gt; tag)</li>
                  <li>3. The feedback widget will appear as a floating button on your website</li>
                  <li>4. All feedback will be collected and displayed in your Feedback page</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FeedbackSettings;