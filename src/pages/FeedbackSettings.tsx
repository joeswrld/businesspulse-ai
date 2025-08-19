import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  SlidersHorizontal,
  Palette,
  MessageSquare,
  Layout,
  Bell,
  Code,
  Copy,
  Check,
  Eye,
  Settings as SettingsIcon
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackSettings {
  id: string;
  user_id: string;
  brand_colors: {
    primary: string;
    secondary: string;
  };
  greeting_text: string;
  button_placement: 'left' | 'right' | 'bottom';
  widget_enabled: boolean;
  auto_notifications: boolean;
  created_at: string;
  updated_at: string;
}

const FeedbackSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    brand_colors: {
      primary: '#3b82f6',
      secondary: '#1e40af'
    },
    greeting_text: 'How was your experience?',
    button_placement: 'bottom' as 'left' | 'right' | 'bottom',
    widget_enabled: true,
    auto_notifications: true
  });

  // Fetch settings
  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      if (data) {
        setSettings(data);
        setFormData({
          brand_colors: data.brand_colors,
          greeting_text: data.greeting_text,
          button_placement: data.button_placement,
          widget_enabled: data.widget_enabled,
          auto_notifications: data.auto_notifications
        });
      } else {
        // Create default settings
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  // Create default settings
  const createDefaultSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('feedback_settings')
        .insert({
          user_id: user.id,
          brand_colors: formData.brand_colors,
          greeting_text: formData.greeting_text,
          button_placement: formData.button_placement,
          widget_enabled: formData.widget_enabled,
          auto_notifications: formData.auto_notifications
        })
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast.success('Default settings created');
    } catch (error) {
      console.error('Error creating default settings:', error);
      toast.error('Failed to create default settings');
    }
  };

  // Save settings
  const saveSettings = async () => {
    if (!user || !settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('feedback_settings')
        .update({
          brand_colors: formData.brand_colors,
          greeting_text: formData.greeting_text,
          button_placement: formData.button_placement,
          widget_enabled: formData.widget_enabled,
          auto_notifications: formData.auto_notifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Settings saved successfully');
      fetchSettings(); // Refresh data
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Copy embed code
  const copyEmbedCode = () => {
    const embedCode = `<script src="https://notex.com.ng/widget.js" data-user-id="${user?.id}"></script>`;
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Embed code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Preview widget styles
  const getPreviewStyles = () => {
    return {
      backgroundColor: formData.brand_colors.primary,
      color: 'white',
      border: `2px solid ${formData.brand_colors.secondary}`,
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: 'all 0.2s ease'
    };
  };

  // Get placement styles
  const getPlacementStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 9999,
      padding: '12px 16px',
      borderRadius: '8px',
      backgroundColor: formData.brand_colors.primary,
      color: 'white',
      border: `2px solid ${formData.brand_colors.secondary}`,
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '14px',
      fontWeight: '500'
    };

    switch (formData.button_placement) {
      case 'left':
        return { ...baseStyles, left: '20px', bottom: '20px' };
      case 'right':
        return { ...baseStyles, right: '20px', bottom: '20px' };
      case 'bottom':
        return { ...baseStyles, left: '50%', bottom: '20px', transform: 'translateX(-50%)' };
      default:
        return { ...baseStyles, left: '50%', bottom: '20px', transform: 'translateX(-50%)' };
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Feedback Settings</h1>
          <p className="text-muted-foreground">
            Customize your feedback widget appearance and behavior
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <SettingsIcon className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget Customization */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" />
                <span>Brand Colors</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="primary-color"
                      type="color"
                      value={formData.brand_colors.primary}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        brand_colors: { ...prev.brand_colors, primary: e.target.value }
                      }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.brand_colors.primary}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        brand_colors: { ...prev.brand_colors, primary: e.target.value }
                      }))}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={formData.brand_colors.secondary}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        brand_colors: { ...prev.brand_colors, secondary: e.target.value }
                      }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.brand_colors.secondary}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        brand_colors: { ...prev.brand_colors, secondary: e.target.value }
                      }))}
                      placeholder="#1e40af"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Greeting Text</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="greeting-text">Message shown to users</Label>
              <Textarea
                id="greeting-text"
                value={formData.greeting_text}
                onChange={(e) => setFormData(prev => ({ ...prev, greeting_text: e.target.value }))}
                placeholder="How was your experience?"
                className="mt-2"
                rows={3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Layout className="h-5 w-5" />
                <span>Button Placement</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="button-placement">Choose where the feedback button appears</Label>
              <Select
                value={formData.button_placement}
                onValueChange={(value: 'left' | 'right' | 'bottom') => 
                  setFormData(prev => ({ ...prev, button_placement: value }))
                }
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom">Bottom Center</SelectItem>
                  <SelectItem value="left">Bottom Left</SelectItem>
                  <SelectItem value="right">Bottom Right</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="widget-enabled">Enable Widget</Label>
                  <p className="text-sm text-muted-foreground">
                    Show the feedback widget on your website
                  </p>
                </div>
                <Switch
                  id="widget-enabled"
                  checked={formData.widget_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, widget_enabled: checked }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-notifications">Auto Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for new feedback
                  </p>
                </div>
                <Switch
                  id="auto-notifications"
                  checked={formData.auto_notifications}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_notifications: checked }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview and Embed */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Widget Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-gray-50 min-h-[200px] relative">
                <div className="text-sm text-muted-foreground mb-4">
                  Preview of how your feedback widget will appear:
                </div>
                
                {/* Preview button */}
                <div style={getPlacementStyles()}>
                  {formData.greeting_text}
                </div>

                {/* Preview info */}
                <div className="mt-8 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Placement:</span>
                    <Badge variant="outline" className="capitalize">
                      {formData.button_placement}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Status:</span>
                    <Badge variant={formData.widget_enabled ? "default" : "secondary"}>
                      {formData.widget_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Notifications:</span>
                    <Badge variant={formData.auto_notifications ? "default" : "secondary"}>
                      {formData.auto_notifications ? "On" : "Off"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="h-5 w-5" />
                <span>Embed Code</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="embed-code">Add this code to your website</Label>
                <div className="relative mt-2">
                  <Textarea
                    id="embed-code"
                    value={`<script src="https://notex.com.ng/widget.js" data-user-id="${user?.id}"></script>`}
                    readOnly
                    className="font-mono text-sm"
                    rows={2}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={copyEmbedCode}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Installation Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Copy the embed code above</li>
                      <li>Paste it just before the closing &lt;/body&gt; tag on your website</li>
                      <li>The feedback widget will appear automatically</li>
                      <li>Customize the appearance using the settings on the left</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Widget Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Real-time feedback collection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Automatic sentiment analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Priority detection for urgent issues</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Email notifications for new feedback</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Mobile-responsive design</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Customizable branding</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSettings;