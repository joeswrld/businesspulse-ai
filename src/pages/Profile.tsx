import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Calendar,
  Crown,
  Trophy,
  Star,
  Award,
  Target,
  TrendingUp,
  Users,
  FileText,
  MessageSquare,
  Settings,
  ExternalLink,
  Clock,
  Activity,
  Zap,
  Shield,
  Building,
  Globe,
  RefreshCw,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

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
  trial_end?: string;
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

const Profile: React.FC = () => {
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

      // Count feedback entries
      const { count: feedbackCount } = await (supabase as any)
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', user.id); // Using user.id as project_id for now

      // Count insights history (reports)
      const { count: reportsCount } = await (supabase as any)
        .from('insights_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Count team members (placeholder for now)
      const teamMembers = 0; // This would come from a teams table

      setActivityStats({
        totalFeedback: feedbackCount || 0,
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

  // Get plan info for display
  const getPlanInfo = () => {
    if (!subscription) {
      return {
        planName: 'Free Trial',
        planType: 'trial',
        isTrial: true,
        daysLeft: 0,
        upgradeText: 'Upgrade to Pro',
        upgradeLink: '/billing?plan=pro',
        planColor: 'bg-orange-100 text-orange-800 border-orange-200',
        planIcon: <Star className="h-4 w-4" />
      };
    }

    const planName = (subscription as any)?.plan_name?.toLowerCase?.() || (subscription as any)?.plan_type?.toLowerCase?.() || '';
    const planType = planName.includes('business') ? 'business'
      : (planName.includes('pro') || planName.includes('premium')) ? 'pro'
      : (subscription as any).plan_type || 'free';
    const isTrial = planType === 'trial' || (subscription as any).status === 'trialing';
    
    if (isTrial && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      const now = new Date();
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        planName: 'Free Trial',
        planType: 'trial',
        isTrial: true,
        daysLeft: Math.max(0, daysLeft),
        upgradeText: 'Upgrade to Pro',
        upgradeLink: '/billing?plan=pro',
        planColor: 'bg-orange-100 text-orange-800 border-orange-200',
        planIcon: <Star className="h-4 w-4" />
      };
    }

    if (planType === 'pro') {
      return {
        planName: 'Pro',
        planType: 'pro',
        isTrial: false,
        daysLeft: 0,
        upgradeText: 'Upgrade to Business',
        upgradeLink: '/billing?plan=business',
        planColor: 'bg-blue-100 text-blue-800 border-blue-200',
        planIcon: <Zap className="h-4 w-4" />
      };
    }

    return {
      planName: 'Business',
      planType: 'business',
      isTrial: false,
      daysLeft: 0,
      upgradeText: 'Enterprise Support',
      upgradeLink: '/support',
      planColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      planIcon: <Crown className="h-4 w-4" />
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
        description: 'Use all major features of the platform',
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
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <User className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">Please log in to view your profile.</p>
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
            <h2 className="text-xl font-semibold mb-2">Loading Profile...</h2>
            <p className="text-gray-600">Please wait while we fetch your information.</p>
          </div>
        </div>
      </div>
    );
  }

  const planInfo = getPlanInfo();
  const achievements = generateAchievements();
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Your Profile
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Welcome back! Here's your activity overview and achievements.
          </p>
        </div>

        {/* User Info Section */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm max-w-2xl mx-auto">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              {/* Profile Picture */}
              <div className="relative mx-auto group">
                <div className="w-36 h-36 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center overflow-hidden border-4 border-blue-200 dark:border-blue-800 shadow-xl transition-all duration-300 group-hover:border-blue-300 dark:group-hover:border-blue-700 group-hover:shadow-2xl group-hover:scale-105">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        // Fallback to default icon if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const userIcon = target.parentElement?.querySelector('.user-icon');
                        if (userIcon) {
                          userIcon.classList.remove('hidden');
                        }
                      }}
                    />
                  ) : null}
                  <User className={`user-icon h-20 w-20 text-blue-600 dark:text-blue-400 ${profile?.avatar_url ? 'hidden' : ''}`} />
                  
                  {/* Upload Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-full flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium">Change Photo</span>
                    </div>
                  </div>
                </div>
                
                {/* Avatar Status Indicator */}
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg border-4 border-white dark:border-slate-800">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            
              {/* Upload Button */}
              <div className="text-center mb-6">
                <label className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl cursor-pointer transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Upload Profile Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Handle file upload - you can implement this or redirect to settings
                        window.location.href = '/settings';
                      }
                    }}
                  />
                </label>
              </div>
              
              {/* Avatar Instructions */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {profile?.avatar_url ? 'Profile photo uploaded successfully!' : 'Click the button above to upload your profile photo'}
                </p>
                <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
                  <span>• JPG, PNG, GIF up to 5MB</span>
                  <span>•</span>
                  <a href="/settings" className="text-blue-600 hover:text-blue-700 underline font-medium">
                    Advanced editing in Settings
                  </a>
                </div>
              </div>

            {/* Name and Email */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {profile?.first_name && profile?.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : 'Your Name'
                }
              </h2>
              <div className="flex items-center justify-center space-x-2 text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              {profile?.company_name && (
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <Building className="h-4 w-4" />
                  <span>{profile.company_name}</span>
                </div>
              )}
            </div>

            {/* Subscription Badge */}
            <div className="flex items-center justify-center">
              <Badge 
                variant="outline" 
                className={`px-4 py-2 text-sm font-medium border-2 ${planInfo.planColor}`}
              >
                <div className="flex items-center space-x-2">
                  {planInfo.planIcon}
                  <span>{planInfo.planName}</span>
                </div>
              </Badge>
            </div>

            {/* Edit Profile Button */}
            <Button asChild className="bg-blue-600 hover:bg-blue-700 px-6 py-2">
              <a href="/settings">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

        {/* Activity Overview */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Activity Overview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Total Feedback */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-center hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <CardContent className="p-8">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl mx-auto mb-6 shadow-lg">
                  <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-3">Total Feedback</h4>
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">{activityStats.totalFeedback}</p>
                <p className="text-sm text-muted-foreground">pieces collected</p>
              </CardContent>
            </Card>

            {/* Total Reports */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-center hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <CardContent className="p-8">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl mx-auto mb-6 shadow-lg">
                  <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-3">Reports Generated</h4>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">{activityStats.totalReports}</p>
                <p className="text-sm text-muted-foreground">insights created</p>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-center hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
              <CardContent className="p-8">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl mx-auto mb-6 shadow-lg">
                  <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-3">Team Members</h4>
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent mb-2">{activityStats.teamMembers}</p>
                <p className="text-sm text-muted-foreground">collaborators</p>
              </CardContent>
            </Card>
          </div>

        {/* Last Active */}
        {activityStats.lastActive && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
              <Clock className="h-4 w-4" />
              <span>Last active: {activityStats.lastActive}</span>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Status */}
      <div className="max-w-2xl mx-auto">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Subscription Status</h3>
        
        <Card className="rounded-xl shadow-lg border-2 border-blue-100">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              {/* Current Plan */}
              <div className="flex items-center justify-center space-x-3 mb-4">
                {planInfo.planIcon}
                <h4 className="text-xl font-semibold text-gray-900">{planInfo.planName}</h4>
                {planInfo.planType === 'business' && <Crown className="h-5 w-5 text-yellow-500" />}
              </div>

              {/* Trial Countdown */}
              {planInfo.isTrial && planInfo.daysLeft > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center space-x-2 text-orange-800 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Trial Expires Soon</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    {planInfo.daysLeft} day{planInfo.daysLeft !== 1 ? 's' : ''} left in your free trial
                  </p>
                </div>
              )}

              {/* Action Button */}
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <a href={planInfo.upgradeLink}>
                  {planInfo.upgradeText}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>

              {/* Plan Features */}
              <div className="text-left mt-6">
                <h5 className="font-medium text-gray-900 mb-3">Current Plan Features:</h5>
                <ul className="space-y-2 text-sm text-gray-600">
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements Section */}
      <div className="max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Your Achievements</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((achievement) => (
            <Card 
              key={achievement.id} 
              className={`rounded-xl shadow-lg border-2 transition-all duration-200 ${
                achievement.unlocked 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <CardContent className="p-6 text-center">
                <div className={`flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 ${
                  achievement.unlocked 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {achievement.icon}
                </div>
                
                <h4 className={`font-semibold mb-2 ${
                  achievement.unlocked ? 'text-green-900' : 'text-gray-500'
                }`}>
                  {achievement.title}
                </h4>
                
                <p className={`text-sm mb-4 ${
                  achievement.unlocked ? 'text-green-700' : 'text-gray-400'
                }`}>
                  {achievement.description}
                </p>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className={achievement.unlocked ? 'text-green-600' : 'text-gray-400'}>
                      Progress
                    </span>
                    <span className={achievement.unlocked ? 'text-green-600' : 'text-gray-400'}>
                      {achievement.progress}/{achievement.maxProgress}
                    </span>
                  </div>
                  <Progress 
                    value={(achievement.progress / achievement.maxProgress) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Status Badge */}
                <div className="mt-4">
                  {achievement.unlocked ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Unlocked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      Locked
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Achievement Summary */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-200 px-6 py-3 rounded-full">
            <Trophy className="h-5 w-5 text-blue-600" />
            <span className="text-blue-800 font-medium">
              {unlockedAchievements.length} of {achievements.length} achievements unlocked
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-2xl mx-auto" data-tour="navigation-sidebar">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Quick Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button asChild variant="outline" className="h-16 text-lg border-2 border-blue-200 hover:border-blue-300">
            <a href="/feedback">
              <MessageSquare className="h-5 w-5 mr-2" />
              View Feedback
            </a>
          </Button>
          
          <Button asChild variant="outline" className="h-16 text-lg border-2 border-blue-200 hover:border-blue-300">
            <a href="/insights-simple">
              <Sparkles className="h-5 w-5 mr-2" />
              Generate Insights
            </a>
          </Button>
          
          <Button asChild variant="outline" className="h-16 text-lg border-2 border-blue-200 hover:border-blue-300">
            <a href="/reports">
              <FileText className="h-5 w-5 mr-2" />
              View Reports
            </a>
          </Button>
          
          <Button asChild variant="outline" className="h-16 text-lg border-2 border-blue-200 hover:border-blue-300">
            <a href="/billing">
              <Crown className="h-5 w-5 mr-2" />
              Manage Plan
            </a>
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Profile;