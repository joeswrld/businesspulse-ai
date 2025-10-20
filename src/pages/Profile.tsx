import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Building, 
  Crown, 
  Trophy, 
  Star,
  MessageSquare, 
  FileText, 
  Users, 
  Settings, 
  Clock,
  CheckCircle,
  Sparkles,
  Target,
  RefreshCw,
  Loader2,
  Zap
} from 'lucide-react';

// Types
interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
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
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

interface ActivityStats {
  totalFeedback: number;
  totalReports: number;
  teamMembers: number;
  lastActive: string | null;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export default function EnhancedProfilePage() {
  const { user } = useAuth();
  
  // State management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats>({
    totalFeedback: 0,
    totalReports: 0,
    teamMembers: 0,
    lastActive: null
  });
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
      }

      // FIXED: Try billing_profiles first, then fall back to user_subscriptions
      console.log('🔍 Fetching subscription from billing_profiles...');
      
      const { data: billingData, error: billingError } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (billingError && billingError.code !== 'PGRST116') {
        console.error('⚠️ Error loading billing_profiles:', billingError);
      }

      if (billingData) {
        console.log('✅ Billing profile found:', billingData);
        
        // Convert billing_profiles format to subscription format
        const subscriptionData: UserSubscription = {
          id: billingData.id,
          user_id: billingData.id,
          plan_name: billingData.plan_type || 'business',
          plan_type: billingData.plan_type || 'business',
          status: billingData.subscription_status || 'active',
          current_period_start: billingData.subscription_start || new Date().toISOString(),
          current_period_end: billingData.subscription_end || new Date().toISOString(),
          trial_ends_at: billingData.trial_ends_at,
          created_at: billingData.created_at,
          updated_at: billingData.updated_at
        };
        
        console.log('📊 Converted subscription data:', subscriptionData);
        setSubscription(subscriptionData as any);
      } else {
        // Fallback to user_subscriptions table
        console.log('⚠️ No billing_profiles, trying user_subscriptions...');
        
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subscriptionError && subscriptionError.code !== 'PGRST116') {
          console.error('Error loading subscription:', subscriptionError);
        }

        if (subscriptionData) {
          console.log('📊 User subscription found:', subscriptionData);
          setSubscription(subscriptionData as any);
        } else {
          console.log('❌ No subscription data found in either table');
        }
      }

      // Fetch activity stats
      await loadActivityStats();

    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load activity statistics
  const loadActivityStats = async () => {
    if (!user) return;

    try {
      // Get last login from session
      const { data: { session } } = await supabase.auth.getSession();
      const lastActive = session?.user?.last_sign_in_at;

      // Get user's project IDs
      const { data: settingsData } = await supabase
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = settingsData?.map(s => s.project_id) || [];

      // Count feedback entries
      let feedbackCount = 0;
      if (projectIds.length > 0) {
        const { count } = await supabase
          .from('feedback')
          .select('*', { count: 'exact', head: true })
          .in('project_id', projectIds);
        feedbackCount = count || 0;
      }

      // Count reports
      const { count: reportsCount } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Count team members (placeholder for now)
      const teamMembers = 0; // This would come from a teams table

      setActivityStats({
        totalFeedback: feedbackCount,
        totalReports: reportsCount || 0,
        teamMembers,
        lastActive: lastActive ? new Date(lastActive).toLocaleString() : null
      });

    } catch (error) {
      console.error('Error loading activity stats:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!user || !file) return;

    try {
      setUploading(true);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;

      toast.success('Avatar uploaded successfully!');
      loadUserData(); // Reload profile data

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  // FIXED: Get plan info with correct logic - BUSINESS PLAN PRIORITY
  const getPlanInfo = () => {
    console.log('🔍 RAW Subscription Data:', JSON.stringify(subscription, null, 2));

    // No subscription record = Free Trial
    if (!subscription) {
      console.log('❌ No subscription found - showing Free Trial');
      return {
        planName: 'Free Trial',
        planType: 'trial',
        isTrial: true,
        daysLeft: 8,
        planIcon: <Star className="h-4 w-4" />,
        badgeColor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      };
    }

    const status = (subscription.status || '').toLowerCase().trim();
    const planType = (subscription.plan_type || '').toLowerCase().trim();
    const planName = (subscription.plan_name || '').toLowerCase().trim();

    console.log('📋 Parsed Plan Details:');
    console.log('  - status:', status);
    console.log('  - plan_type:', planType);
    console.log('  - plan_name:', planName);
    console.log('  - trial_ends_at:', subscription.trial_ends_at);

    // PRIORITY 1: Check for Business Plan FIRST (if status is active)
    if (status === 'active') {
      console.log('✅ Status is ACTIVE');
      
      // Check if explicitly Business plan
      if (planType === 'business' || planName.includes('business')) {
        console.log('👑 BUSINESS PLAN DETECTED');
        return {
          planName: 'Business Plan',
          planType: 'business',
          isTrial: false,
          daysLeft: 0,
          planIcon: <Crown className="h-4 w-4" />,
          badgeColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      }

      // Check if Pro plan
      if (planType === 'pro' || planName.includes('pro') || planName.includes('premium')) {
        console.log('⚡ PRO PLAN DETECTED');
        return {
          planName: 'Pro Plan',
          planType: 'pro',
          isTrial: false,
          daysLeft: 0,
          planIcon: <Zap className="h-4 w-4" />,
          badgeColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        };
      }

      // Check trial_ends_at only if no explicit plan type
      const trialEnd = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
      const now = new Date();
      
      if (trialEnd && trialEnd > now) {
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log('⏰ Trial active with', daysLeft, 'days left');
        return {
          planName: 'Free Trial',
          planType: 'trial',
          isTrial: true,
          daysLeft: Math.max(0, daysLeft),
          planIcon: <Star className="h-4 w-4" />,
          badgeColor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
        };
      }

      // Active but no plan type specified and trial expired = Business Plan (default paid)
      console.log('🎯 Active subscription with expired/no trial - defaulting to Business Plan');
      return {
        planName: 'Business Plan',
        planType: 'business',
        isTrial: false,
        daysLeft: 0,
        planIcon: <Crown className="h-4 w-4" />,
        badgeColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      };
    }

    // PRIORITY 2: Check if status is trialing
    if (status === 'trialing') {
      const trialEnd = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
      const now = new Date();
      const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 8;

      console.log('⏰ Status TRIALING with', daysLeft, 'days left');
      return {
        planName: 'Free Trial',
        planType: 'trial',
        isTrial: true,
        daysLeft: Math.max(0, daysLeft),
        planIcon: <Star className="h-4 w-4" />,
        badgeColor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      };
    }

    // PRIORITY 3: Explicit plan_type checking (for non-active statuses)
    if (planType === 'business' || planName.includes('business')) {
      console.log('👑 Business plan detected from plan_type/name');
      return {
        planName: 'Business Plan',
        planType: 'business',
        isTrial: false,
        daysLeft: 0,
        planIcon: <Crown className="h-4 w-4" />,
        badgeColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      };
    }

    if (planType === 'pro' || planName.includes('pro') || planName.includes('premium')) {
      console.log('⚡ Pro plan detected from plan_type/name');
      return {
        planName: 'Pro Plan',
        planType: 'pro',
        isTrial: false,
        daysLeft: 0,
        planIcon: <Zap className="h-4 w-4" />,
        badgeColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      };
    }

    // Default fallback
    console.log('⚠️ No matching plan found - defaulting to Free Trial');
    console.log('   Status was:', status, '| Plan type was:', planType, '| Plan name was:', planName);
    return {
      planName: 'Free Trial',
      planType: 'trial',
      isTrial: true,
      daysLeft: 0,
      planIcon: <Star className="h-4 w-4" />,
      badgeColor: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-800'
    };
  };

  // Generate achievements based on user activity
  const generateAchievements = (): Achievement[] => {
    const achievements: Achievement[] = [
      {
        id: 'first-feedback',
        title: 'First Feedback',
        description: 'Submit your first piece of feedback',
        icon: <MessageSquare className="h-5 w-5" />,
        unlocked: activityStats.totalFeedback >= 1,
        progress: Math.min(activityStats.totalFeedback, 1),
        maxProgress: 1
      },
      {
        id: 'feedback-collector',
        title: 'Feedback Collector',
        description: 'Collect 10 pieces of feedback',
        icon: <MessageSquare className="h-5 w-5" />,
        unlocked: activityStats.totalFeedback >= 10,
        progress: Math.min(activityStats.totalFeedback, 10),
        maxProgress: 10
      },
      {
        id: 'first-report',
        title: 'First Report',
        description: 'Generate your first insights report',
        icon: <FileText className="h-5 w-5" />,
        unlocked: activityStats.totalReports >= 1,
        progress: Math.min(activityStats.totalReports, 1),
        maxProgress: 1
      },
      {
        id: 'report-master',
        title: 'Report Master',
        description: 'Generate 5 insights reports',
        icon: <FileText className="h-5 w-5" />,
        unlocked: activityStats.totalReports >= 5,
        progress: Math.min(activityStats.totalReports, 5),
        maxProgress: 5
      },
      {
        id: 'team-player',
        title: 'Team Player',
        description: 'Invite your first team member',
        icon: <Users className="h-5 w-5" />,
        unlocked: activityStats.teamMembers >= 1,
        progress: Math.min(activityStats.teamMembers, 1),
        maxProgress: 1
      },
      {
        id: 'power-user',
        title: 'Power User',
        description: 'Use all major features',
        icon: <Trophy className="h-5 w-5" />,
        unlocked: activityStats.totalFeedback >= 5 && activityStats.totalReports >= 2,
        progress: Math.min(activityStats.totalFeedback + activityStats.totalReports, 7),
        maxProgress: 7
      }
    ];

    return achievements;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-8 max-w-md">
          <div className="text-center">
            <User className="h-12 w-12 text-blue-500 dark:text-blue-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Authentication Required</h2>
            <p className="text-gray-600 dark:text-gray-400">Please log in to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-500 dark:text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Loading Profile...</h2>
          <p className="text-gray-600 dark:text-gray-400">Please wait while we fetch your information.</p>
        </div>
      </div>
    );
  }

  const planInfo = getPlanInfo();
  const achievements = generateAchievements();
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 transition-colors duration-300">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Your Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome back! Here's your activity overview and achievements.</p>
        </div>

        {/* User Info Card */}
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-colors">
            <div className="p-8">
              <div className="text-center space-y-6">
                {/* Profile Picture */}
                <div className="relative mx-auto group w-32 h-32">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center overflow-hidden border-4 border-blue-200 dark:border-blue-800 shadow-lg transition-all duration-200 group-hover:border-blue-300 dark:group-hover:border-blue-600 group-hover:shadow-xl">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                    )}
                    {/* Upload Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium">Change Photo</span>
                      </div>
                    </div>
                  </div>
                  {/* Status Indicator */}
                  <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-full shadow-lg">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Upload Button */}
                <label className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white font-semibold rounded-xl cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploading ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Upload Logo
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        handleFileUpload(file);
                      }
                    }}
                  />
                </label>

                {/* Upload Instructions */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {profile?.avatar_url ? 'Logo uploaded successfully!' : 'Click the button above to upload your logo'}
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
                    <span>• JPG, PNG, GIF up to 5MB</span>
                  </div>
                </div>

                {/* Name and Email */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {profile?.first_name && profile?.last_name
                      ? `${profile.first_name} ${profile.last_name}`
                      : 'Your Name'
                    }
                  </h2>
                  <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  {profile?.company_name && (
                    <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
                      <Building className="h-4 w-4" />
                      <span>{profile.company_name}</span>
                    </div>
                  )}
                </div>

                {/* Plan Badge - FIXED */}
                <div className="flex flex-col items-center space-y-2">
                  <div className={`px-4 py-2 ${planInfo.badgeColor} border-2 rounded-full text-sm font-medium flex items-center space-x-2`}>
                    {planInfo.planIcon}
                    <span>{planInfo.planName}</span>
                  </div>
                  {planInfo.isTrial && planInfo.daysLeft > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {planInfo.daysLeft} day{planInfo.daysLeft !== 1 ? 's' : ''} remaining
                    </p>
                  )}
                </div>

                {/* Edit Button */}
                <a href="/settings" className="inline-flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors">
                  <Settings className="h-4 w-4" />
                  <span>Edit Profile</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Overview */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Activity Overview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Feedback */}
            <div className="rounded-xl border-2 border-blue-100 dark:border-blue-900 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-colors text-center">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Total Feedback</h4>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{activityStats.totalFeedback}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">pieces collected</p>
              </div>
            </div>

            {/* Total Reports */}
            <div className="rounded-xl border-2 border-blue-100 dark:border-blue-900 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-colors text-center">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full mx-auto mb-4">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Reports Generated</h4>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{activityStats.totalReports}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">insights created</p>
              </div>
            </div>

            {/* Team Members */}
            <div className="rounded-xl border-2 border-blue-100 dark:border-blue-900 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-colors text-center">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-full mx-auto mb-4">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Team Members</h4>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{activityStats.teamMembers}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">collaborators</p>
              </div>
            </div>
          </div>

          {/* Last Active */}
          {activityStats.lastActive && (
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700">
                <Clock className="h-4 w-4" />
                <span>Last active: {activityStats.lastActive}</span>
              </div>
            </div>
          )}
        </div>

        {/* Achievements Section */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Your Achievements</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement) => (
              <div 
                key={achievement.id}
                className={`rounded-xl border-2 shadow-lg transition-all duration-200 ${
                  achievement.unlocked 
                    ? 'border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-950/30' 
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50'
                } backdrop-blur-sm`}
              >
                <div className="p-6 text-center">
                  <div className={`flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 ${
                    achievement.unlocked 
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}>
                    {achievement.icon}
                  </div>
                  
                  <h4 className={`font-semibold mb-2 ${
                    achievement.unlocked ? 'text-green-900 dark:text-green-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {achievement.title}
                  </h4>
                  
                  <p className={`text-sm mb-4 ${
                    achievement.unlocked ? 'text-green-700 dark:text-green-300' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {achievement.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className={achievement.unlocked ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
                        Progress
                      </span>
                      <span className={achievement.unlocked ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
                        {achievement.progress}/{achievement.maxProgress}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          achievement.unlocked 
                            ? 'bg-gradient-to-r from-green-600 to-green-400' 
                            : 'bg-gray-400 dark:bg-gray-600'
                        }`}
                        style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-4">
                    {achievement.unlocked ? (
                      <div className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-full text-xs font-medium">
                        <CheckCircle className="h-3 w-3" />
                        <span>Unlocked</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-full text-xs font-medium">
                        Locked
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Achievement Summary */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-6 py-3 rounded-full">
              <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-800 dark:text-blue-300 font-medium">
                {unlockedCount} of {achievements.length} achievements unlocked
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Quick Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="/feedback" className="h-16 text-lg border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center space-x-2 text-gray-900 dark:text-gray-100">
              <MessageSquare className="h-5 w-5" />
              <span>View Feedback</span>
            </a>
            
            <a href="/insights-simple" className="h-16 text-lg border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center space-x-2 text-gray-900 dark:text-gray-100">
              <Sparkles className="h-5 w-5" />
              <span>Generate Insights</span>
            </a>
            
            <a href="/reports" className="h-16 text-lg border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center space-x-2 text-gray-900 dark:text-gray-100">
              <FileText className="h-5 w-5" />
              <span>View Reports</span>
            </a>
            
            <a href="/billing" className="h-16 text-lg border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center space-x-2 text-gray-900 dark:text-gray-100">
              <Crown className="h-5 w-5" />
              <span>Manage Plan</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
