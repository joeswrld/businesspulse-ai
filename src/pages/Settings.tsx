import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Palette, 
  Settings as SettingsIcon, 
  Save,
  Eye,
  EyeOff,
  Globe,
  Bell,
  Shield,
  Key,
  Palette as PaletteIcon,
  MessageSquare,
  Zap,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Upload,
  Trash2,
  Mail
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface WidgetSettings {
  id: string;
  user_id: string;
  brand_primary_color: string;
  brand_secondary_color: string;
  logo_url: string | null;
  greeting_text: string;
  widget_position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  widget_size: 'small' | 'medium' | 'large';
  auto_open: boolean;
  show_avatar: boolean;
  show_branding: boolean;
  enable_sound: boolean;
  enable_animations: boolean;
  custom_css: string | null;
  created_at: string;
  updated_at: string;
}

interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_sms: boolean;
  email_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  data_retention_days: number;
  auto_backup: boolean;
  created_at: string;
  updated_at: string;
}

interface FeatureFlag {
  id: string;
  user_id: string;
  feature_name: string;
  is_enabled: boolean;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: ''
  });
  const [widgetForm, setWidgetForm] = useState({
    brand_primary_color: '#0066FF',
    brand_secondary_color: '#007BFF',
    greeting_text: 'How can I help you today?',
    widget_position: 'bottom-right' as const,
    widget_size: 'medium' as const,
    auto_open: false,
    show_avatar: true,
    show_branding: true,
    enable_sound: true,
    enable_animations: true,
    custom_css: ''
  });
  const [preferencesForm, setPreferencesForm] = useState({
    theme: 'light' as const,
    language: 'en',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
    time_format: '12h' as const,
    notifications_email: true,
    notifications_push: true,
    notifications_sms: false,
    email_frequency: 'daily' as const,
    data_retention_days: 365,
    auto_backup: true
  });

  // Fetch settings data
  const fetchSettingsData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching settings data for user:', user.id);
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      // Fetch widget settings
      const { data: widgetData, error: widgetError } = await supabase
        .from('widget_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (widgetError && widgetError.code !== 'PGRST116') throw widgetError;

      // Fetch user preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (preferencesError && preferencesError.code !== 'PGRST116') throw preferencesError;

      // Fetch feature flags
      const { data: flagsData, error: flagsError } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('user_id', user.id);

      if (flagsError) throw flagsError;

      console.log('⚙️ Settings data fetched:', {
        profile: profileData ? 'Yes' : 'No',
        widget: widgetData ? 'Yes' : 'No',
        preferences: preferencesData ? 'Yes' : 'No',
        flags: flagsData?.length || 0
      });
      
      setProfile(profileData);
      setWidgetSettings(widgetData);
      setUserPreferences(preferencesData);
      setFeatureFlags(flagsData || []);

      // Initialize form state
      if (profileData) {
        setProfileForm({
          full_name: profileData.full_name || '',
          email: profileData.email || ''
        });
      }

      if (widgetData) {
        setWidgetForm({
          brand_primary_color: widgetData.brand_primary_color,
          brand_secondary_color: widgetData.brand_secondary_color,
          greeting_text: widgetData.greeting_text,
          widget_position: widgetData.widget_position,
          widget_size: widgetData.widget_size,
          auto_open: widgetData.auto_open,
          show_avatar: widgetData.show_avatar,
          show_branding: widgetData.show_branding,
          enable_sound: widgetData.enable_sound,
          enable_animations: widgetData.enable_animations,
          custom_css: widgetData.custom_css || ''
        });
      }

      if (preferencesData) {
        setPreferencesForm({
          theme: preferencesData.theme,
          language: preferencesData.language,
          timezone: preferencesData.timezone,
          date_format: preferencesData.date_format,
          time_format: preferencesData.time_format,
          notifications_email: preferencesData.notifications_email,
          notifications_push: preferencesData.notifications_push,
          notifications_sms: preferencesData.notifications_sms,
          email_frequency: preferencesData.email_frequency,
          data_retention_days: preferencesData.data_retention_days,
          auto_backup: preferencesData.auto_backup
        });
      }
      
    } catch (error) {
      console.error('❌ Error fetching settings data:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time settings subscriptions for user:', user.id);

    // Subscribe to profile changes
    const profileChannel = supabase
      .channel('profile-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Profile real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setProfile(payload.new as UserProfile);
          }
        }
      )
      .subscribe();

    // Subscribe to widget settings changes
    const widgetChannel = supabase
      .channel('widget-settings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'widget_settings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Widget settings real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setWidgetSettings(payload.new as WidgetSettings);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time settings subscriptions');
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(widgetChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  // Save profile
  const saveProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profileForm.full_name,
          email: profileForm.email,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully!",
      });

    } catch (error) {
      console.error('❌ Error saving profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Save widget settings
  const saveWidgetSettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('widget_settings')
        .upsert({
          user_id: user.id,
          ...widgetForm,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Widget Settings Updated",
        description: "Your widget settings have been saved!",
      });

    } catch (error) {
      console.error('❌ Error saving widget settings:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save widget settings',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Save user preferences
  const saveUserPreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferencesForm,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Preferences Updated",
        description: "Your preferences have been saved!",
      });

    } catch (error) {
      console.error('❌ Error saving preferences:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save preferences',
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle feature flag
  const toggleFeatureFlag = async (featureName: string, enabled: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('feature_flags')
        .upsert({
          user_id: user.id,
          feature_name: featureName,
          is_enabled: enabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id, feature_name'
        });

      if (error) throw error;

      toast({
        title: "Feature Updated",
        description: `${featureName} has been ${enabled ? 'enabled' : 'disabled'}`,
      });

    } catch (error) {
      console.error('❌ Error toggling feature flag:', error);
      toast({
        title: "Error",
        description: 'Failed to update feature setting',
        variant: "destructive"
      });
    }
  };

  // Utility functions
  const getFeatureIcon = (featureName: string) => {
    switch (featureName) {
      case 'ai_insights':
        return <Zap className="h-4 w-4" />;
      case 'advanced_reports':
        return <SettingsIcon className="h-4 w-4" />;
      case 'custom_branding':
        return <PaletteIcon className="h-4 w-4" />;
      case 'api_access':
        return <Key className="h-4 w-4" />;
      case 'webhook_integrations':
        return <Globe className="h-4 w-4" />;
      default:
        return <SettingsIcon className="h-4 w-4" />;
    }
  };

  const getFeatureDescription = (featureName: string) => {
    switch (featureName) {
      case 'ai_insights':
        return 'Generate AI-powered business insights';
      case 'advanced_reports':
        return 'Create comprehensive reports and dashboards';
      case 'custom_branding':
        return 'Customize your widget appearance';
      case 'api_access':
        return 'Access NoteX via API';
      case 'webhook_integrations':
        return 'Connect with external services';
      default:
        return 'Custom feature setting';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage your account, preferences, and widget customization.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile Settings */}
        <Card className="bg-white shadow-sm border-0 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Update your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Widget Customization */}
        <Card className="bg-white shadow-sm border-0 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Widget Customization
            </CardTitle>
            <CardDescription>
              Customize the appearance and behavior of your NoteX widget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Brand Colors */}
            <div>
              <Label className="text-base font-medium">Brand Colors</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="primary_color">Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="primary_color"
                      type="color"
                      value={widgetForm.brand_primary_color}
                      onChange={(e) => setWidgetForm(prev => ({ ...prev, brand_primary_color: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={widgetForm.brand_primary_color}
                      onChange={(e) => setWidgetForm(prev => ({ ...prev, brand_primary_color: e.target.value }))}
                      placeholder="#0066FF"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary_color">Secondary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={widgetForm.brand_secondary_color}
                      onChange={(e) => setWidgetForm(prev => ({ ...prev, brand_secondary_color: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={widgetForm.brand_secondary_color}
                      onChange={(e) => setWidgetForm(prev => ({ ...prev, brand_secondary_color: e.target.value }))}
                      placeholder="#007BFF"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Widget Behavior */}
            <div>
              <Label className="text-base font-medium">Widget Behavior</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="greeting_text">Greeting Message</Label>
                  <Input
                    id="greeting_text"
                    value={widgetForm.greeting_text}
                    onChange={(e) => setWidgetForm(prev => ({ ...prev, greeting_text: e.target.value }))}
                    placeholder="How can I help you today?"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="widget_position">Position</Label>
                  <Select 
                    value={widgetForm.widget_position} 
                    onValueChange={(value: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left') => setWidgetForm(prev => ({ ...prev, widget_position: value }))}
                  >
                    <SelectTrigger className="mt-1">
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
                <div>
                  <Label htmlFor="widget_size">Size</Label>
                  <Select 
                    value={widgetForm.widget_size} 
                    onValueChange={(value: 'small' | 'medium' | 'large') => setWidgetForm(prev => ({ ...prev, widget_size: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Widget Options */}
            <div>
              <Label className="text-base font-medium">Widget Options</Label>
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-gray-500" />
                    <span>Auto-open widget</span>
                  </div>
                  <Switch
                    checked={widgetForm.auto_open}
                    onCheckedChange={(checked) => setWidgetForm(prev => ({ ...prev, auto_open: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>Show avatar</span>
                  </div>
                  <Switch
                    checked={widgetForm.show_avatar}
                    onCheckedChange={(checked) => setWidgetForm(prev => ({ ...prev, show_avatar: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-gray-500" />
                    <span>Show branding</span>
                  </div>
                  <Switch
                    checked={widgetForm.show_branding}
                    onCheckedChange={(checked) => setWidgetForm(prev => ({ ...prev, show_branding: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-gray-500" />
                    <span>Enable sound</span>
                  </div>
                  <Switch
                    checked={widgetForm.enable_sound}
                    onCheckedChange={(checked) => setWidgetForm(prev => ({ ...prev, enable_sound: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-gray-500" />
                    <span>Enable animations</span>
                  </div>
                  <Switch
                    checked={widgetForm.enable_animations}
                    onCheckedChange={(checked) => setWidgetForm(prev => ({ ...prev, enable_animations: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Custom CSS */}
            <div>
              <Label htmlFor="custom_css">Custom CSS</Label>
              <Textarea
                id="custom_css"
                value={widgetForm.custom_css}
                onChange={(e) => setWidgetForm(prev => ({ ...prev, custom_css: e.target.value }))}
                placeholder="Add custom CSS styles..."
                className="mt-1"
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={saveWidgetSettings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Widget Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Preferences */}
        <Card className="bg-white shadow-sm border-0 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              User Preferences
            </CardTitle>
            <CardDescription>
              Configure your app experience and notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Appearance */}
            <div>
              <Label className="text-base font-medium">Appearance</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <Select 
                    value={preferencesForm.theme} 
                    onValueChange={(value: 'light' | 'dark' | 'system') => setPreferencesForm(prev => ({ ...prev, theme: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={preferencesForm.language} 
                    onValueChange={(value: string) => setPreferencesForm(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={preferencesForm.timezone} 
                    onValueChange={(value: string) => setPreferencesForm(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <Label className="text-base font-medium">Notifications</Label>
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>Email notifications</span>
                  </div>
                  <Switch
                    checked={preferencesForm.notifications_email}
                    onCheckedChange={(checked) => setPreferencesForm(prev => ({ ...prev, notifications_email: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-gray-500" />
                    <span>Push notifications</span>
                  </div>
                  <Switch
                    checked={preferencesForm.notifications_push}
                    onCheckedChange={(checked) => setPreferencesForm(prev => ({ ...prev, notifications_push: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <span>SMS notifications</span>
                  </div>
                  <Switch
                    checked={preferencesForm.notifications_sms}
                    onCheckedChange={(checked) => setPreferencesForm(prev => ({ ...prev, notifications_sms: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Data & Privacy */}
            <div>
              <Label className="text-base font-medium">Data & Privacy</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="data_retention">Data Retention (days)</Label>
                  <Input
                    id="data_retention"
                    type="number"
                    value={preferencesForm.data_retention_days}
                    onChange={(e) => setPreferencesForm(prev => ({ ...prev, data_retention_days: parseInt(e.target.value) || 365 }))}
                    min="30"
                    max="3650"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <span>Auto backup</span>
                  </div>
                  <Switch
                    checked={preferencesForm.auto_backup}
                    onCheckedChange={(checked) => setPreferencesForm(prev => ({ ...prev, auto_backup: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveUserPreferences} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Feature Management
            </CardTitle>
            <CardDescription>
              Enable or disable specific features for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {featureFlags.map((flag) => (
                <div key={flag.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFeatureIcon(flag.feature_name)}
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {flag.feature_name.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getFeatureDescription(flag.feature_name)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={flag.is_enabled ? "default" : "secondary"}>
                      {flag.is_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <Switch
                      checked={flag.is_enabled}
                      onCheckedChange={(checked) => toggleFeatureFlag(flag.feature_name, checked)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;