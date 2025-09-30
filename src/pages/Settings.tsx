import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Bell,
  Shield,
  CreditCard,
  Settings as SettingsIcon,
  Save,
  Eye,
  EyeOff,
  Trash2,
  Camera,
  Mail,
  Lock,
  AlertTriangle,
  Crown,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Upload,
  Download,
  ExternalLink,
  Zap,
  Key,
  Smartphone,
  Building,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedAuthFlow } from "@/hooks/useUnifiedAuthFlow";

interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_name: string;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  created_at: string;
  updated_at: string;
}

interface NotificationPreferences {
  id: string;
  user_id: string;
  feedback_alerts: boolean;
  weekly_reports: boolean;
  system_updates: boolean;
  created_at: string;
  updated_at: string;
}

const Settings = () => {
  const { user } = useAuth();
  const { deleteAccount } = useUnifiedAuthFlow();
  
  // State management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  
  // Form states
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Load user data
  const loadUserData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
      }

      if (profileData) {
        setProfile(profileData);
      } else {
        // Create default profile
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            first_name: '',
            last_name: ''
          })
          .select()
          .single();
        
        if (newProfile) {
          setProfile(newProfile);
        }
      }

      // Fetch subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('Error loading subscription:', subscriptionError);
      }

      if (subscriptionData) {
        setSubscription(subscriptionData as any);
      }

      // Fetch notification preferences
      const { data: notificationsData, error: notificationsError } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (notificationsError && notificationsError.code !== 'PGRST116') {
        console.error('Error loading notifications:', notificationsError);
      }

      if (notificationsData) {
        setNotifications(notificationsData as any);
      } else {
        // Create default notification preferences
        const { data: newNotifications } = await (supabase as any)
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            feedback_alerts: true,
            weekly_reports: true,
            system_updates: true
          })
          .select()
          .single();
        
        if (newNotifications) {
          setNotifications(newNotifications as any);
        }
      }

      // Get last login from session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.last_sign_in_at) {
        setLastLogin(new Date(session.user.last_sign_in_at).toLocaleString());
      }

    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load data on mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Handle avatar file selection
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPG, PNG, GIF, or WebP)');
        event.target.value = '';
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        toast.error('File size must be less than 5MB');
        event.target.value = '';
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      toast.success('File selected successfully! Click Upload to save.');
    }
  };

  // Upload avatar to Supabase storage
  const uploadAvatar = async () => {
    if (!avatarFile || !user) return;

    try {
      setUploadingAvatar(true);
      
      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (avatarFile.size > maxSize) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(avatarFile.type)) {
        toast.error('Please select a valid image file (JPG, PNG, GIF, or WebP)');
        return;
      }

      const fileExt = avatarFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      console.log('Attempting to upload to path:', filePath);

      // First, check if the avatars bucket exists
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.error('Error checking buckets:', bucketError);
        toast.error('Storage service unavailable. Please try again later.');
        return;
      }

      const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');
      if (!avatarsBucket) {
        console.error('Avatars bucket not found');
        toast.error('Avatar storage not configured. Please contact support.');
        return;
      }

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        
        // Provide specific error messages
        if (uploadError.message.includes('bucket')) {
          toast.error('Storage bucket not found. Please contact support.');
        } else if (uploadError.message.includes('policy')) {
          toast.error('Upload permission denied. Please contact support.');
        } else if (uploadError.message.includes('size')) {
          toast.error('File size too large. Please select a smaller image.');
        } else {
          toast.error(`Upload failed: ${uploadError.message}`);
        }
        return;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        toast.error('Avatar uploaded but profile update failed. Please try again.');
        return;
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      setAvatarFile(null);
      setAvatarPreview(null);

      toast.success('Profile picture updated successfully!');
      
      // Refresh the page data
      await loadUserData();
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          toast.error('Network error. Please check your connection and try again.');
        } else if (error.message.includes('timeout')) {
          toast.error('Upload timeout. Please try again with a smaller image.');
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
      } else {
        toast.error('An unexpected error occurred. Please try again.');
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          company_name: profile.company_name,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!user) return;

    if (!passwordForm.current_password || !passwordForm.new_password) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New password and confirmation do not match');
      return;
    }

    if (passwordForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new_password
      });

      if (error) throw error;

      toast.success('Password changed successfully!');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Save notification preferences
  const handleSaveNotifications = async () => {
    if (!user || !notifications) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('notification_preferences')
        .update({
          feedback_alerts: notifications.feedback_alerts,
          weekly_reports: notifications.weekly_reports,
          system_updates: notifications.system_updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Notification preferences updated!');
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  // Delete account - Safe implementation
  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeletingAccount(true);
    try {
      console.log('🗑️ Starting account deletion process for:', user.email);
      
      // Call the unified auth flow delete function
      await deleteAccount();
      
      console.log('✅ Account deletion completed successfully');
      // User will be redirected to auth page by the unified auth flow
    } catch (error) {
      console.error('❌ Error deleting account:', error);
      toast.error('Failed to delete account. Please contact support if this issue persists.');
      // Error handling is done in the unified auth flow
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  // Get plan info for display
  const getPlanInfo = () => {
    // No subscription: treat as Free Trial based on account creation date
    if (!subscription) {
      const createdAt = user?.created_at ? new Date(user.created_at) : null;
      let daysLeft = 0;
      if (createdAt) {
        const trialEnd = new Date(createdAt);
        trialEnd.setDate(trialEnd.getDate() + 8);
        const now = new Date();
        daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }
      return {
        planName: 'Free Trial',
        planType: 'trial',
        isTrial: true,
        daysLeft,
        upgradeText: 'Upgrade to Pro',
        upgradeLink: '/billing?plan=pro'
      };
    }

    // With subscription: show trial badge if status is trialing, else show paid plan
    const isTrialing = subscription.status === 'trialing';
    if (isTrialing) {
      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
      const now = new Date();
      const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
      return {
        planName: 'Free Trial',
        planType: 'trial',
        isTrial: true,
        daysLeft,
        upgradeText: 'Upgrade to Pro',
        upgradeLink: '/billing?plan=pro'
      };
    }

    // Determine paid plan label
    const planType = (subscription.plan_type || '').toLowerCase();
    if (planType === 'pro') {
      return {
        planName: 'Pro',
        planType: 'pro',
        isTrial: false,
        daysLeft: 0,
        upgradeText: 'Upgrade to Business',
        upgradeLink: '/billing?plan=business'
      };
    }

    return {
      planName: 'Business',
      planType: 'business',
      isTrial: false,
      daysLeft: 0,
      upgradeText: 'Manage Subscription',
      upgradeLink: '/billing'
    };
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <SettingsIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to access your settings.</p>
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

  const planInfo = getPlanInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <SettingsIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Account Settings
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Manage your profile, security, and preferences to customize your NoteX experience
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Profile Settings */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-lg">
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <span>Profile Settings</span>
                    <Badge variant="outline" className="ml-3 bg-blue-100 text-blue-700 border-blue-200">
                      <User className="h-3 w-3 mr-1" />
                      Personal
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {/* Avatar Upload */}
                <div className="flex items-center space-x-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center overflow-hidden border-4 border-blue-200 dark:border-blue-800 shadow-lg transition-all duration-200 group-hover:shadow-xl">
                      {profile?.avatar_url || avatarPreview ? (
                        <img
                          src={avatarPreview || profile?.avatar_url}
                          alt="Profile"
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <User className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-1">Profile Picture</p>
                      <p className="text-xs text-muted-foreground">Upload a professional photo for your profile</p>
                    </div>
                    {avatarFile && (
                      <Button
                        size="sm"
                        onClick={uploadAvatar}
                        disabled={uploadingAvatar}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {uploadingAvatar ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-semibold text-muted-foreground">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={profile?.first_name || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                      className="border-2 focus:border-blue-500 transition-colors"
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-semibold text-muted-foreground">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={profile?.last_name || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                      className="border-2 focus:border-blue-500 transition-colors"
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-semibold text-muted-foreground">
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    value={profile?.company_name || ''}
                    onChange={(e) => setProfile(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                    className="border-2 focus:border-blue-500 transition-colors"
                    placeholder="Enter your company name (optional)"
                  />
                </div>

                {/* Email Display */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Email Address</Label>
                  <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg border-2 border-muted">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground font-medium">{user.email}</span>
                    <Badge variant="outline" className="ml-auto bg-blue-100 text-blue-700 border-blue-200">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Email address cannot be changed for security reasons</p>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 py-3"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-3" />
                      Save Profile Changes
                    </>
                  )}
                </Button>
            </CardContent>
          </Card>

            {/* Password & Security */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-t-lg">
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <span>Password & Security</span>
                    <Badge variant="outline" className="ml-3 bg-green-100 text-green-700 border-green-200">
                      <Lock className="h-3 w-3 mr-1" />
                      Secure
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Last Login */}
              {lastLogin && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Last login: {lastLogin}</span>
                </div>
              )}

              {/* Change Password Form */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Change Password</h4>
                
                <div className="relative">
                  <Label htmlFor="currentPassword" className="text-sm font-medium">
                    Current Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Label htmlFor="newPassword" className="text-sm font-medium">
                    New Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm New Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {changingPassword ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>

              {/* 2FA Toggle (Placeholder) */}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                  <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
                </div>
                <Switch disabled />
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Preferences */}
          <Card className="rounded-xl shadow-lg border-2 border-blue-100">
            <CardHeader className="bg-blue-50 rounded-t-xl">
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Bell className="h-5 w-5" />
                <span>Notifications Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Feedback Alerts</Label>
                  <p className="text-xs text-gray-500">Get notified when new feedback is submitted</p>
                </div>
                <Switch
                  checked={notifications?.feedback_alerts ?? true}
                  onCheckedChange={(checked) => setNotifications(prev => prev ? { ...prev, feedback_alerts: checked } : null)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Weekly Report Emails</Label>
                  <p className="text-xs text-gray-500">Receive weekly summaries of your feedback analytics</p>
                </div>
                <Switch
                  checked={notifications?.weekly_reports ?? true}
                  onCheckedChange={(checked) => setNotifications(prev => prev ? { ...prev, weekly_reports: checked } : null)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">System Updates & News</Label>
                  <p className="text-xs text-gray-500">Stay informed about new features and improvements</p>
                </div>
                <Switch
                  checked={notifications?.system_updates ?? true}
                  onCheckedChange={(checked) => setNotifications(prev => prev ? { ...prev, system_updates: checked } : null)}
                />
              </div>

              <Button
                onClick={handleSaveNotifications}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Subscription & Billing */}
          <Card className="rounded-xl shadow-lg border-2 border-blue-100">
            <CardHeader className="bg-blue-50 rounded-t-xl">
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <CreditCard className="h-5 w-5" />
                <span>Subscription & Billing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Current Plan */}
              <div className="text-center p-4 bg-white rounded-lg border">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {planInfo.planType === 'business' && <Crown className="h-5 w-5 text-yellow-500" />}
                  <h3 className="text-lg font-semibold text-gray-900">{planInfo.planName}</h3>
                </div>
                
                {planInfo.isTrial && planInfo.daysLeft > 0 && (
                  <div className="mb-3">
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      <Calendar className="h-3 w-3 mr-1" />
                      {planInfo.daysLeft} days left in trial
                    </Badge>
                  </div>
                )}
                
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <a href={planInfo.upgradeLink}>
                    {planInfo.upgradeText}
                  </a>
                </Button>
              </div>

              {/* Plan Features */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Current Plan Features:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {planInfo.planType === 'trial' && (
                    <>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Basic feedback collection</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Up to 100 feedback entries</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Basic analytics</span>
                      </li>
                    </>
                  )}
                  {planInfo.planType === 'pro' && (
                    <>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Unlimited feedback collection</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Advanced analytics & insights</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Custom branding</span>
                      </li>
                    </>
                  )}
                  {planInfo.planType === 'business' && (
                    <>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Everything in Pro</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Team collaboration</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Priority support</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="rounded-xl shadow-lg border-2 border-red-100">
            <CardHeader className="bg-red-50 rounded-t-xl">
              <CardTitle className="flex items-center space-x-2 text-red-900">
                <AlertTriangle className="h-5 w-5" />
                <span>Danger Zone</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <h4 className="font-medium text-red-900 mb-2">Delete Account</h4>
                <p className="text-sm text-red-700 mb-4">
                  This action cannot be undone. This will permanently delete your account and all associated data.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center mb-6">
                <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Delete Account</h3>
                <p className="text-gray-600">
                  Are you absolutely sure? This action cannot be undone and will permanently delete:
                </p>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Your account and profile</li>
                  <li>• All feedback data</li>
                  <li>• Settings and preferences</li>
                  <li>• Subscription information</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {deletingAccount ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Yes, Delete Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Settings;