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
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching settings for user:', user.id);
      
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.log('Error fetching settings:', error);
        
        // If table doesn't exist, create default settings
        if (error.code === '42P01') {
          console.log('Feedback settings table does not exist. Creating default settings...');
          await createDefaultSettings();
          return;
        }
        
        // If no record found, create default settings
        if (error.code === 'PGRST116') {
          console.log('No settings found. Creating default settings...');
          await createDefaultSettings();
          return;
        }
        
        // For other errors, show message but continue with defaults
        console.error('Database error:', error);
        toast.error('Database connection issue. Using default settings.');
        await createDefaultSettings();
        return;
      }

      if (data) {
        console.log('Settings loaded successfully:', data);
        setSettings(data);
        setFormData({
          brand_colors: data.brand_colors || { primary: '#3b82f6', secondary: '#1e40af' },
          greeting_text: data.greeting_text || 'How was your experience?',
          button_placement: data.button_placement || 'bottom',
          widget_enabled: data.widget_enabled !== undefined ? data.widget_enabled : true,
          auto_notifications: data.auto_notifications !== undefined ? data.auto_notifications : true
        });
      } else {
        console.log('No settings data returned, creating defaults');
        await createDefaultSettings();
      }
    } catch (error) {
      console.error('Error in fetchSettings:', error);
      
      // Provide more specific error messages
      if (error.code === '42501') {
        toast.error('Access denied. Please check your permissions.');
      } else if (error.code === '42P01') {
        toast.error('Database not set up. Using local defaults.');
      } else {
        toast.error('Failed to load settings. Using local defaults.');
      }
      
      // Create default settings as fallback
      await createDefaultSettings();
    } finally {
      setLoading(false);
    }
  };

  // Create default settings
  const createDefaultSettings = async () => {
    if (!user) return;

    try {
      console.log('Creating default settings for user:', user.id);
      
      // First check if table exists
      const { error: checkError } = await supabase
        .from('feedback_settings')
        .select('id')
        .limit(1);

      if (checkError && checkError.code === '42P01') {
        console.log('Feedback settings table does not exist. Using local defaults.');
        // Use local defaults if table doesn't exist
        const localSettings = {
          id: 'local-default',
          user_id: user.id,
          brand_colors: formData.brand_colors,
          greeting_text: formData.greeting_text,
          button_placement: formData.button_placement,
          widget_enabled: formData.widget_enabled,
          auto_notifications: formData.auto_notifications,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setSettings(localSettings);
        console.log('Local settings created:', localSettings);
        return;
      }

      // Try to insert default settings
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

      if (error) {
        console.log('Insert error:', error);
        
        // If insert fails due to duplicate, try to get existing settings
        if (error.code === '23505') { // Unique violation
          console.log('Duplicate settings found, fetching existing...');
          const { data: existingData, error: fetchError } = await supabase
            .from('feedback_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (fetchError) {
            console.error('Error fetching existing settings:', fetchError);
            throw fetchError;
          }
          
          console.log('Existing settings found:', existingData);
          setSettings(existingData);
          setFormData({
            brand_colors: existingData.brand_colors || formData.brand_colors,
            greeting_text: existingData.greeting_text || formData.greeting_text,
            button_placement: existingData.button_placement || formData.button_placement,
            widget_enabled: existingData.widget_enabled !== undefined ? existingData.widget_enabled : formData.widget_enabled,
            auto_notifications: existingData.auto_notifications !== undefined ? existingData.auto_notifications : formData.auto_notifications
          });
          return;
        }
        
        // For other errors, use local defaults
        console.error('Insert error, using local defaults:', error);
        throw error;
      }

      console.log('Default settings created successfully:', data);
      setSettings(data);
    } catch (error) {
      console.error('Error creating default settings:', error);
      
      // Use local defaults as fallback
      const localSettings = {
        id: 'local-default',
        user_id: user.id,
        brand_colors: formData.brand_colors,
        greeting_text: formData.greeting_text,
        button_placement: formData.button_placement,
        widget_enabled: formData.widget_enabled,
        auto_notifications: formData.auto_notifications,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setSettings(localSettings);
      console.log('Using local default settings:', localSettings);
    }
  };

  // Save settings
  const saveSettings = async () => {
    if (!user || !settings) return;

    setSaving(true);
    try {
      // If using local defaults, just update local state
      if (settings.id === 'local-default') {
        setSettings({
          ...settings,
          brand_colors: formData.brand_colors,
          greeting_text: formData.greeting_text,
          button_placement: formData.button_placement,
          widget_enabled: formData.widget_enabled,
          auto_notifications: formData.auto_notifications,
          updated_at: new Date().toISOString()
        });
        toast.success('Settings saved locally (database not available)');
        setSaving(false);
        return;
      }

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
      
      // Provide more specific error messages
      if (error.code === '42501') {
        toast.error('Access denied. Please check your permissions.');
      } else if (error.code === '42P01') {
        toast.error('Database not available. Settings saved locally.');
        // Save locally as fallback
        setSettings({
          ...settings,
          brand_colors: formData.brand_colors,
          greeting_text: formData.greeting_text,
          button_placement: formData.button_placement,
          widget_enabled: formData.widget_enabled,
          auto_notifications: formData.auto_notifications,
          updated_at: new Date().toISOString()
        });
      } else {
        toast.error('Failed to save settings. Please try again.');
      }
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
    if (user) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Manual database setup function
  const setupDatabase = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Try to create the feedback_settings table manually
      const { error } = await supabase.rpc('setup_feedback_tables');
      
      if (error) {
        console.log('Manual setup failed, trying direct insert...');
        // Try direct insert
        const { data, error: insertError } = await supabase
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

        if (insertError) {
          console.error('Direct insert failed:', insertError);
          toast.error('Database setup failed. Please run the SQL setup script.');
        } else {
          console.log('Direct insert successful:', data);
          setSettings(data);
          toast.success('Database setup completed!');
        }
      } else {
        console.log('Manual setup successful');
        toast.success('Database setup completed!');
        fetchSettings(); // Refresh settings
      }
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Setup failed. Please check console for details.');
    } finally {
      setSaving(false);
    }
  };

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
        <div className="flex items-center space-x-2">
          {settings?.id === 'local-default' && (
            <Button onClick={setupDatabase} variant="outline" disabled={saving}>
              <SettingsIcon className="h-4 w-4 mr-2" />
              Setup Database
            </Button>
          )}
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
            <CardContent className="space-y-6">
              {/* Basic Embed Code */}
              <div>
                <Label htmlFor="embed-code">Basic Embed Code (Legacy)</Label>
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
                <p className="text-sm text-muted-foreground mt-2">
                  Basic script tag approach (works everywhere but less secure).
                </p>
              </div>

              {/* NPM Package */}
              <div>
                <Label>NPM Package (Recommended)</Label>
                <div className="bg-muted p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">npm</Badge>
                      <code className="text-sm">npm install notex-feedback-widget</code>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Best for React, Vue, Angular, and modern frameworks
                    </div>
                  </div>
                </div>
              </div>

              {/* React Usage */}
              <div>
                <Label>React/Next.js Usage</Label>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`import { useNoteXWidget } from 'notex-feedback-widget/react';

function App() {
  const { toggle } = useNoteXWidget({
    userId: '${user?.id || 'your-user-id'}',
    supabaseUrl: '${import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url'}',
    supabaseKey: '${import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'your-anon-key'}',
    position: '${formData.button_placement}',
    greeting: '${formData.greeting_text}',
    primaryColor: '${formData.brand_colors.primary}'
  });

  return <button onClick={toggle}>Open Feedback</button>;
}`}
                  </pre>
                </div>
              </div>

              {/* Vue Usage */}
              <div>
                <Label>Vue 3 Usage</Label>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`<template>
  <button @click="toggle">Open Feedback</button>
</template>

<script setup>
import { useNoteXWidget } from 'notex-feedback-widget/vue';

const { toggle } = useNoteXWidget({
  userId: '${user?.id || 'your-user-id'}',
  supabaseUrl: '${import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url'}',
  supabaseKey: '${import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'your-anon-key'}',
  position: '${formData.button_placement}',
  greeting: '${formData.greeting_text}',
  primaryColor: '${formData.brand_colors.primary}'
});
</script>`}
                  </pre>
                </div>
              </div>

              {/* Vanilla JS */}
              <div>
                <Label>Vanilla JavaScript</Label>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`import { initNoteXWidget } from 'notex-feedback-widget';

const widget = initNoteXWidget({
  userId: '${user?.id || 'your-user-id'}',
  supabaseUrl: '${import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url'}',
  supabaseKey: '${import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'your-anon-key'}',
  position: '${formData.button_placement}',
  greeting: '${formData.greeting_text}',
  primaryColor: '${formData.brand_colors.primary}',
  secondaryColor: '${formData.brand_colors.secondary}'
});

// Control the widget
widget.open();
widget.close();
widget.toggle();`}
                  </pre>
                </div>
              </div>

              {/* CDN Option */}
              <div>
                <Label>CDN Option (Static Sites)</Label>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`<script>
  window.NoteXConfig = {
    userId: '${user?.id || 'your-user-id'}',
    supabaseUrl: '${import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url'}',
    supabaseKey: '${import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...' || 'your-anon-key'}',
    position: '${formData.button_placement}',
    greeting: '${formData.greeting_text}',
    primaryColor: '${formData.brand_colors.primary}'
  };
</script>
<script src="https://cdn.notex.com.ng/widget-v2.js" async></script>`}
                  </pre>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>NPM Package:</strong> Best for modern frameworks with TypeScript support</li>
                  <li>• <strong>CDN:</strong> Simplest for static sites and quick setup</li>
                  <li>• <strong>API Key:</strong> More secure than exposing user IDs directly</li>
                  <li>• <strong>Customization:</strong> All methods support your brand colors and settings</li>
                </ul>
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