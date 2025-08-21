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
  AlertCircle
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
  console.log('FeedbackSettings component rendering...');
  const { user } = useAuth();
  console.log('User from AuthContext:', user);
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectIdStatus, setProjectIdStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const loadSettings = useCallback(async () => {
    console.log('loadSettings called, user:', user);
    if (!user) {
      console.log('No user, returning early');
      return;
    }

    try {
      console.log('Loading settings for user:', user.id);
      
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      console.log('Query result:', { data, error });

      if (error) {
        console.error('Error loading settings:', error);
        throw error;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        console.log('Settings loaded successfully:', data[0]);
        setSettings(data[0]);
      } else {
        // No settings found, create default ones with blank project_id
        console.log('No settings found, creating default settings...');
        
        const newSettingsData = {
          user_id: user.id,
          project_id: '', // Leave blank for user input
          project_id_locked: false,
          title: 'Share your thoughts with us',
          show_name: true,
          show_email: true,
          button_text: 'Send Feedback',
          theme: 'light',
          brand_color: '#2563eb'
        };
        
        console.log('Creating settings with data:', newSettingsData);
        
        const { data: newSettings, error: createError } = await supabase
          .from('feedback_settings')
          .insert(newSettingsData)
          .select()
          .single();

        console.log('Create result:', { newSettings, createError });

        if (createError) {
          console.error('Error creating settings:', createError);
          throw createError;
        }
        
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error in loadSettings:', error);
      
      // Provide more specific error messages
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
      const { data: existingSettings, error: checkError } = await supabase
        .from('feedback_settings')
        .select('id, project_id')
        .eq('user_id', user.id)
        .eq('project_id', projectId.trim())
        .neq('id', settings?.id || ''); // Exclude current settings

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
    console.log('useEffect for loadSettings triggered, user:', user);
    setError(null); // Clear any previous errors
    loadSettings();
  }, [user, loadSettings]);

  // Check project ID availability when it changes
  useEffect(() => {
    if (!settings?.project_id_locked && settings?.project_id) {
      const timeoutId = setTimeout(() => {
        checkProjectIdAvailability(settings.project_id);
      }, 500); // Debounce for 500ms

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

  const handleSave = async () => {
    if (!settings || !user) return;

    // Validate project ID if not locked
    if (!settings.project_id_locked) {
      if (!settings.project_id || settings.project_id.trim() === '') {
        toast.error('Please enter a Project ID before saving');
        return;
      }
      
      if (settings.project_id.length < 3) {
        toast.error('Project ID must be at least 3 characters long');
        return;
      }
      
      // Check for valid characters (alphanumeric, hyphens, underscores)
      if (!/^[a-zA-Z0-9_-]+$/.test(settings.project_id)) {
        toast.error('Project ID can only contain letters, numbers, hyphens, and underscores');
        return;
      }

      // Check if project ID is already used by this user
      const { data: existingSettings, error: checkError } = await supabase
        .from('feedback_settings')
        .select('id, project_id')
        .eq('user_id', user.id)
        .eq('project_id', settings.project_id.trim())
        .neq('id', settings.id); // Exclude current settings

      if (checkError) {
        console.error('Error checking project ID uniqueness:', checkError);
        toast.error('Failed to validate Project ID. Please try again.');
        return;
      }

      if (existingSettings && existingSettings.length > 0) {
        toast.error('This Project ID is already used by you. Please choose a different one.');
        return;
      }
    }

    setSaving(true);
    try {
      console.log('Saving settings:', settings);
      
      // Prepare update data
      const updateData = {
        title: settings.title,
        show_name: settings.show_name,
        show_email: settings.show_email,
        button_text: settings.button_text,
        theme: settings.theme,
        brand_color: settings.brand_color,
        notify_email: settings.notify_email,
        redirect_url: settings.redirect_url
      };

      // Only update project_id if it's not locked yet
      if (!settings.project_id_locked) {
        updateData.project_id = settings.project_id;
        updateData.project_id_locked = true;
      }

      const { error } = await supabase
        .from('feedback_settings')
        .update(updateData)
        .eq('id', settings.id);

      if (error) {
        console.error('Error updating settings:', error);
        throw error;
      }

      // Update local state to reflect the locked status
      if (!settings.project_id_locked) {
        setSettings(prev => ({ ...prev, project_id_locked: true }));
      }

      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('relation "feedback_settings" does not exist')) {
          toast.error('Database tables not set up. Please run the database setup script first.');
        } else if (error.message.includes('permission denied')) {
          toast.error('Permission denied. Please check your database permissions.');
        } else if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          toast.error('This Project ID is already used by you. Please choose a different one.');
        } else {
          toast.error(`Failed to save settings: ${error.message}`);
        }
      } else {
        toast.error('Failed to save settings. Please try again.');
      }
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

  console.log('Render conditions - loading:', loading, 'error:', error, 'settings:', settings);
  
  if (loading) {
    console.log('Rendering loading state');
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

  if (error) {
    console.log('Rendering error state');
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Settings</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
              {error.includes('Database tables not set up') && (
                <div className="text-sm text-gray-500">
                  <p>To fix this, run the database setup script in your Supabase SQL Editor:</p>
                  <code className="block mt-2 p-2 bg-gray-100 rounded text-xs">
                    setup-feedback-system.sql
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    console.log('Rendering no settings state');
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">Failed to load settings. Please try again.</p>
        </div>
      </div>
    );
  }

  console.log('Rendering main content');
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
                  <div className="relative flex-1">
                    <Input
                      id="project-id"
                      value={settings.project_id}
                      onChange={(e) => setSettings({ ...settings, project_id: e.target.value })}
                      disabled={settings.project_id_locked}
                      className={`font-mono ${
                        !settings.project_id_locked && settings.project_id && settings.project_id.length >= 3
                          ? projectIdStatus === 'available'
                            ? 'border-green-500 focus:border-green-500'
                            : projectIdStatus === 'taken'
                            ? 'border-red-500 focus:border-red-500'
                            : ''
                          : ''
                      }`}
                      placeholder={settings.project_id_locked ? settings.project_id : "e.g., my-website-2024, company-feedback"}
                    />
                    {!settings.project_id_locked && settings.project_id && settings.project_id.length >= 3 && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {projectIdStatus === 'checking' && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                        {projectIdStatus === 'available' && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        {projectIdStatus === 'taken' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    )}
                  </div>
                  {settings.project_id_locked && (
                    <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                      <Check className="h-3 w-3" />
                      Locked
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">
                    {settings.project_id_locked 
                      ? "✅ Project ID is locked and cannot be changed. This ensures consistent feedback collection."
                      : "⚠️ Enter a unique project ID before saving. It will be permanently locked after the first save."
                    }
                  </p>
                  {!settings.project_id_locked && (
                    <>
                      <p className="text-xs text-amber-600">
                        💡 Choose a unique, memorable ID using letters, numbers, hyphens, and underscores only
                      </p>
                      {settings.project_id && settings.project_id.length >= 3 && (
                        <p className={`text-xs ${
                          projectIdStatus === 'available' 
                            ? 'text-green-600' 
                            : projectIdStatus === 'taken' 
                            ? 'text-red-600' 
                            : 'text-gray-500'
                        }`}>
                          {projectIdStatus === 'checking' && '🔄 Checking availability...'}
                          {projectIdStatus === 'available' && '✅ This Project ID is available'}
                          {projectIdStatus === 'taken' && '❌ This Project ID is already used by you'}
                        </p>
                      )}
                    </>
                  )}
                </div>
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
            disabled={saving || (!settings.project_id_locked && projectIdStatus === 'taken')}
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
                {settings.project_id_locked ? 'Update Settings' : 'Save & Lock Project ID'}
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