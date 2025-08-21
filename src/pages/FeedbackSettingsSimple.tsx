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
  Bell, 
  Code, 
  Copy,
  Check,
  Save,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { dbPerformance } from "@/utils/performance";
import { optimizedQueries, queryCache } from "@/utils/optimizedQueries";

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

const FeedbackSettingsSimple = () => {
  console.log('FeedbackSettingsSimple component rendering...');
  const { user } = useAuth();
  console.log('User from AuthContext:', user);
  
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const loadSettings = async () => {
    console.log('loadSettings called, user:', user);
    if (!user) {
      console.log('No user, returning early');
      return;
    }

    console.log('Starting loadSettings for user:', user.id);
    setError(null);

    try {
      console.log('Loading settings for user:', user.id);
      
      // Check cache first
      const cacheKey = queryCache.keys.userSettings(user.id);
      const cachedData = queryCache.get(cacheKey);
      
      if (cachedData) {
        console.log('Using cached settings data');
        setSettings(cachedData);
        return;
      }

      // Fetch from database with fallback
      let data, error;
      try {
        const result = await optimizedQueries.getUserSettings(user.id);
        data = result.data;
        error = result.error;
      } catch (optError) {
        console.log('Optimized query failed, using fallback:', optError);
        // Fallback to direct query
        const result = await supabase
          .from('feedback_settings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        data = result.data;
        error = result.error;
      }

      console.log('Query result:', { data, error });

      if (error) {
        console.error('Error loading settings:', error);
        throw error;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        console.log('Settings loaded successfully:', data[0]);
        
        // Cache the result
        queryCache.set(cacheKey, data[0], 120000); // Cache for 2 minutes
        
        setSettings(data[0]);
        setIsInitializing(false);
      } else {
        // No settings found, create default ones
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
        
        const { data: newSettings, error: createError } = await optimizedQueries.createSettings(newSettingsData);

        console.log('Create result:', { newSettings, createError });

        if (createError) {
          console.error('Error creating settings:', createError);
          throw createError;
        }
        
        // Cache the new settings
        queryCache.set(cacheKey, newSettings, 120000);
        
        setSettings(newSettings);
        setIsInitializing(false);
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
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    console.log('FeedbackSettings useEffect triggered - user:', user?.id, 'isInitializing:', isInitializing, 'settings:', settings);
    if (user) {
      loadSettings();
    }
  }, [user]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    loadSettings();
  };

  const handleSave = async () => {
    if (!settings || !user) return;

    // Basic validation
    if (!settings.project_id_locked) {
      if (!settings.project_id || settings.project_id.trim() === '') {
        toast.error('Please enter a Project ID before saving');
        return;
      }
      
      if (settings.project_id.length < 3) {
        toast.error('Project ID must be at least 3 characters long');
        return;
      }
    }

    setSaving(true);
    try {
      console.log('Saving settings:', settings);
      
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
        if (error.code === '23505' || (error.message && error.message.includes('duplicate'))) {
          throw new Error('This Project ID is already used by you. Please choose a different one.');
        }
        throw new Error(error.message || 'Unknown database error while saving settings');
      }

      if (!settings.project_id_locked) {
        setSettings(prev => ({ ...prev, project_id_locked: true }));
      }

      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      if (error instanceof Error) {
        if (error.message.includes('already used by you') || error.message.includes('duplicate')) {
          toast.error('This Project ID is already used by you. Please choose a different one.');
        } else if (error.message.includes('permission denied')) {
          toast.error('Permission denied. Please check your database permissions.');
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

  console.log('Render conditions - error:', error, 'settings:', settings);
  


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
            <Button onClick={handleRetry} className="w-full">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while initializing
  if (isInitializing || !settings) {
    console.log('Rendering loading state - isInitializing:', isInitializing, 'settings:', settings);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-4">Loading settings...</p>
            <p className="text-sm text-gray-500 mb-4">
              User: {user?.id ? 'Logged in' : 'Not logged in'} | 
              Settings: {settings ? 'Loaded' : 'Not loaded'}
            </p>
            <Button 
              onClick={() => {
                console.log('Debug: Force loading settings');
                loadSettings();
              }}
              variant="outline"
              size="sm"
            >
              Debug: Retry Load
            </Button>
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering main content - settings:', settings);
  
  // Fallback - show main content even if there are issues
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
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  Live
                </Badge>
                {isInitializing && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-spin"></div>
                    Loading...
                  </Badge>
                )}
              </div>
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
                  placeholder="e.g., my-website-2024, company-feedback"
                />
                {settings.project_id_locked && (
                  <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                    <Check className="h-3 w-3" />
                    Locked
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {settings.project_id_locked 
                  ? "✅ Project ID is locked and cannot be changed."
                  : "⚠️ Enter a unique project ID before saving. It will be permanently locked after the first save."
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
            disabled={saving}
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FeedbackSettingsSimple;