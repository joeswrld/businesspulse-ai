// src/components/layout/DashboardLayout.tsx - FIXED VERSION
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  LayoutDashboard, 
  FileText, 
  Brain, 
  BarChart3, 
  Menu,
  X,
  Crown,
  Star,
  Zap,
  ChevronLeft,
  ChevronRight,
  Cog,
  CreditCard,
  Users,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TopNav from "@/components/layout/TopNav";

interface PlanInfo {
  planName: string;
  planType: string;
  planColor: string;
  planIcon: JSX.Element;
}

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Load user data
  const loadUserData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        
        // Load profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
        }
        
        // Load subscription using RPC for accuracy
        const { data: billingData } = await supabase
          .rpc('get_user_profile_with_access', { user_uuid: currentUser.id });
        
        if (billingData && billingData.length > 0) {
          setSubscription(billingData[0]);
          console.log('📊 Subscription data loaded:', billingData[0]);
        } else {
          // Fallback to direct query
          const { data: fallbackData } = await supabase
            .from('billing_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          
          if (fallbackData) {
            setSubscription(fallbackData);
            console.log('📊 Fallback subscription data:', fallbackData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount and set up realtime
  useEffect(() => {
    loadUserData();
  }, []);

  // Set up realtime listener when user is available
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`dashboard-subscription-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔔 Subscription updated in dashboard:', payload);
          const newData = payload.new as any;
          
          // Show success toast when business plan is activated
          if (newData?.subscription_status === 'active' && newData?.plan === 'business') {
            toast.success('🎉 Welcome to Business Plan!', {
              description: 'You now have unlimited access to all features',
              duration: 5000,
            });
          }
          
          loadUserData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Get plan info for badge - Shows correct status based on subscription
  const getPlanInfo = (): PlanInfo => {
    if (!subscription) {
      return {
        planName: 'Free Trial',
        planType: 'trial',
        planColor: 'bg-blue-50 text-blue-700 border-blue-200',
        planIcon: <Zap className="h-3 w-3" />
      };
    }

    const plan = subscription.plan?.toLowerCase() || '';
    const status = subscription.subscription_status?.toLowerCase() || '';
    const daysLeft = subscription.days_left || 0;
    const hasAccess = subscription.has_access || false;
    
    console.log('🎯 Subscription Status Check:', { 
      plan, 
      status, 
      daysLeft,
      hasAccess,
      raw_data: subscription
    });

    // 1. BUSINESS PLAN - Check first for active business subscriptions
    if (plan === 'business' && status === 'active') {
      console.log('✅ Displaying: Business Plan (Active)');
      return {
        planName: 'Business Plan',
        planType: 'business',
        planColor: 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-900 border-yellow-300 font-semibold',
        planIcon: <Crown className="h-4 w-4 text-yellow-600" />
      };
    }

    // 2. BUSINESS PLAN - Inactive/Cancelled
    if (plan === 'business' && status !== 'active') {
      console.log('⚠️ Displaying: Business Plan (Inactive)');
      return {
        planName: 'Business (Inactive)',
        planType: 'business',
        planColor: 'bg-gray-100 text-gray-700 border-gray-300',
        planIcon: <Crown className="h-3 w-3 text-gray-500" />
      };
    }

    // 3. FREE TRIAL - Active (has days remaining)
    if (plan === 'trial' && daysLeft > 0) {
      console.log(`✅ Displaying: Free Trial (${daysLeft} days left)`);
      return {
        planName: 'Free Trial',
        planType: 'trial',
        planColor: 'bg-blue-50 text-blue-700 border-blue-200',
        planIcon: <Zap className="h-3 w-3" />
      };
    }

    // 4. TRIAL EXPIRED - No days left
    if (plan === 'trial' && daysLeft <= 0) {
      console.log('❌ Displaying: Trial Expired');
      return {
        planName: 'Trial Expired',
        planType: 'expired',
        planColor: 'bg-red-50 text-red-700 border-red-200',
        planIcon: <X className="h-3 w-3" />
      };
    }

    // 5. CANCELLED SUBSCRIPTION
    if (status === 'cancelled') {
      console.log('⚠️ Displaying: Subscription Cancelled');
      return {
        planName: 'Subscription Cancelled',
        planType: 'cancelled',
        planColor: 'bg-red-50 text-red-700 border-red-200',
        planIcon: <X className="h-3 w-3" />
      };
    }

    // 6. FALLBACK - Unknown status
    console.warn('⚠️ Unknown subscription status, showing Free Trial');
    return {
      planName: 'Free Trial',
      planType: 'trial',
      planColor: 'bg-blue-50 text-blue-700 border-blue-200',
      planIcon: <Zap className="h-3 w-3" />
    };
  };

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Feedback", href: "/feedback", icon: MessageSquare },
    { name: "AI Insights", href: "/insights-simple", icon: Brain },
    { name: "Reports & Analytics", href: "/reports", icon: FileText },
    { name: "Feedback Settings", href: "/feedback-settings", icon: Cog },
    { name: "Pricing & Billing", href: "/billing", icon: CreditCard },
    { name: "Roadmap", href: "/roadmap", icon: BarChart3 },
    { name: "Team Collaboration", href: "/teams", icon: Users },
  ];

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully", {
        description: "You've been logged out of your account.",
      });
      navigate("/");
    } catch (error) {
      toast.error("Error", {
        description: "Failed to sign out. Please try again.",
      });
    }
  };

  const planInfo = getPlanInfo();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-r border-slate-200 dark:border-slate-800 transform transition-all duration-300 ease-in-out lg:translate-x-0 shadow-xl max-h-screen",
        sidebarCollapsed ? "w-16" : "w-72",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-colors">
            <Link to="/dashboard" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <img src="/favicon.ico" alt="NoteX" className="h-6 w-6" />
              </div>
              {!sidebarCollapsed && (
                <div className="transition-opacity duration-300">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">NoteX</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Turn feedback into growth ✨</p>
                </div>
              )}
            </Link>
            <div className="flex items-center space-x-2">
              <button 
                className="hidden lg:flex p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                ) : (
                  <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                )}
              </button>
              <button 
                className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>

          {/* User Profile Section */}
          {!loading && user && !sidebarCollapsed && (
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-950">
              <div className="flex items-center space-x-3 mb-4">
                <Avatar className="h-12 w-12 border-2 border-white shadow-lg">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                    {profile?.first_name?.[0] || user.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {profile?.first_name && profile?.last_name 
                      ? `${profile.first_name} ${profile.last_name}`
                      : user.email?.split('@')[0] || 'User'
                    }
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              
              {/* Plan Badge */}
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className={`px-3 py-1 text-xs font-medium border ${planInfo.planColor}`}
                >
                  <div className="flex items-center space-x-1">
                    {planInfo.planIcon}
                    <span>{planInfo.planName}</span>
                  </div>
                </Badge>
                <Link 
                  to="/profile"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  View Profile →
                </Link>
              </div>
            </div>
          )}

          {/* Collapsed User Avatar */}
          {!loading && user && sidebarCollapsed && (
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-950">
              <Avatar className="h-10 w-10 border-2 border-white shadow-lg mx-auto">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-sm">
                  {profile?.first_name?.[0] || user.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const isComingSoon = false;
              
              return (
                <div key={item.name} className="relative">
                  {isComingSoon ? (
                    <div className={cn(
                      "flex items-center space-x-3 rounded-lg text-sm font-medium text-slate-500 cursor-not-allowed opacity-60 hover:bg-slate-100/50 transition-colors",
                      sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2.5"
                    )}>
                      <div className="p-1 rounded-lg bg-slate-100">
                        <item.icon className="h-4 w-4" />
                      </div>
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.name}</span>
                          <span className="text-xs bg-slate-200 px-2 py-1 rounded-full text-slate-600 font-medium">
                            Soon
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center space-x-3 rounded-lg text-sm font-medium transition-all duration-200 group",
                        sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2.5",
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                      )}
                      onClick={() => setSidebarOpen(false)}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <div className={cn(
                        "p-1 rounded-lg transition-colors relative",
                        isActive 
                          ? "bg-white/20" 
                          : "bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                      )}>
                        <item.icon className={cn(
                          "h-4 w-4",
                          isActive ? "text-white" : "text-slate-600 dark:text-slate-300"
                        )} />
                      </div>
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.name}</span>
                          {isActive && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </>
                      )}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-colors">
            <div className="space-y-1">
              {/* Reserved for future actions */}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        "min-h-screen bg-background transition-all duration-300",
        sidebarCollapsed ? "lg:pl-16" : "lg:pl-72"
      )}>
        {/* Top Navigation Bar */}
        <TopNav />
        
        {/* Mobile menu button */}
        <div className="lg:hidden px-4 pt-2">
          <button
            className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </button>
        </div>
        
        {/* Page content */}
        <main className="p-4 md:p-6 w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
