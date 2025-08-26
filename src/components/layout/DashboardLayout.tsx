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
  Settings, 
  Menu,
  X,
  LogOut,
  User,
  CreditCard,
  Users,
  MessageSquare,
  SlidersHorizontal,
  Crown,
  Star,
  Zap,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
        
        // Load subscription
        const { data: subscriptionData } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();
        
        if (subscriptionData) {
          setSubscription(subscriptionData);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  // Get plan info for badge
  const getPlanInfo = () => {
    if (!subscription) {
      return {
        planName: 'Free Trial',
        planType: 'trial',
        planColor: 'bg-orange-100 text-orange-800 border-orange-200',
        planIcon: <Star className="h-3 w-3" />
      };
    }

    const planName = subscription.plan_name || 'Free Trial';
    const isTrial = subscription.plan_type === 'trial';
    
    if (isTrial) {
      return {
        planName,
        planType: 'trial',
        planColor: 'bg-orange-100 text-orange-800 border-orange-200',
        planIcon: <Star className="h-3 w-3" />
      };
    }

    if (subscription.plan_type === 'pro') {
      return {
        planName: 'Pro',
        planType: 'pro',
        planColor: 'bg-blue-100 text-blue-800 border-blue-200',
        planIcon: <Zap className="h-3 w-3" />
      };
    }

    return {
      planName: 'Business',
      planType: 'business',
      planColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      planIcon: <Crown className="h-3 w-3" />
    };
  };

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Collect Feedback", href: "/feedback", icon: MessageSquare }, 
    { name: "AI Insights", href: "/insights-simple", icon: Brain },
    { name: "Reports & Analytics", href: "/reports", icon: FileText },
    { name: "Business Metrics", href: "/analytics", icon: BarChart3 },
    { name: "Team Collaboration", href: "/teams", icon: Users, comingSoon: true },
    { name: "Pricing & Billing", href: "/billing", icon: CreditCard },
    { name: "Widget Settings", href: "/feedback-settings", icon: SlidersHorizontal },
    { name: "Account Settings", href: "/settings", icon: Settings },
    { name: "My Profile", href: "/profile", icon: User },
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
        "fixed inset-y-0 left-0 z-50 glass-sidebar transform transition-all duration-500 ease-out lg:translate-x-0 shadow-xl max-h-screen",
        sidebarCollapsed ? "w-20" : "w-80",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-primary/20 bg-white/30 backdrop-blur-xl">
            <Link to="/dashboard" className="flex items-center space-x-4 group">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary via-secondary to-neon rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all duration-500 transform group-hover:scale-110">
                  <img src="/favicon.ico" alt="NoteX" className="h-7 w-7" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
              </div>
              {!sidebarCollapsed && (
                <div className="transition-all duration-500 animate-fade-in">
                  <h1 className="text-xl font-black bg-gradient-to-r from-primary via-secondary to-neon bg-clip-text text-transparent">
                    NoteX
                  </h1>
                  <p className="text-xs text-muted-foreground font-medium">Turn feedback into growth ✨</p>
                </div>
              )}
            </Link>
            <div className="flex items-center space-x-2">
              <button 
                className="hidden lg:flex p-2 hover:bg-primary/10 rounded-xl transition-all duration-300 group"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-primary group-hover:text-secondary transition-colors duration-300" />
                ) : (
                  <ChevronLeft className="h-5 w-5 text-primary group-hover:text-secondary transition-colors duration-300" />
                )}
              </button>
              <button 
                className="lg:hidden p-2 hover:bg-primary/10 rounded-xl transition-all duration-300 group"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5 text-primary group-hover:text-secondary transition-colors duration-300" />
              </button>
            </div>
          </div>

          {/* User Profile Section */}
          {!loading && user && !sidebarCollapsed && (
            <div className="p-6 border-b border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="h-14 w-14 border-4 border-white shadow-lg ring-4 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold text-lg">
                    {profile?.first_name?.[0] || user.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">
                    {profile?.first_name && profile?.last_name 
                      ? `${profile.first_name} ${profile.last_name}`
                      : user.email?.split('@')[0] || 'User'
                    }
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              
              {/* Plan Badge */}
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className={`px-4 py-2 text-xs font-bold border-2 ${getPlanInfo().planColor} bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 transition-all duration-300`}
                >
                  <div className="flex items-center space-x-2">
                    {getPlanInfo().planIcon}
                    <span>{getPlanInfo().planName}</span>
                  </div>
                </Badge>
                <Link 
                  to="/profile"
                  className="text-xs text-primary hover:text-secondary font-bold transition-all duration-300 hover:scale-105 flex items-center space-x-1"
                >
                  <span>View Profile</span>
                  <span className="text-lg">→</span>
                </Link>
              </div>
            </div>
          )}

          {/* Collapsed User Avatar */}
          {!loading && user && sidebarCollapsed && (
            <div className="p-4 border-b border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
              <Avatar className="h-12 w-12 border-4 border-white shadow-lg mx-auto ring-4 ring-primary/20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold text-sm">
                  {profile?.first_name?.[0] || user.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center space-x-3 px-4 py-3 rounded-2xl font-semibold transition-all duration-300 relative overflow-hidden",
                    isActive
                      ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg transform scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:scale-105"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-20"></div>
                  )}
                  
                  <div className="relative z-10 flex items-center space-x-3 w-full">
                    <div className={cn(
                      "flex-shrink-0 transition-all duration-300",
                      isActive ? "text-white" : "text-primary group-hover:text-secondary"
                    )}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    
                    {!sidebarCollapsed && (
                      <span className="flex-1">{item.name}</span>
                    )}
                    
                    {item.comingSoon && !sidebarCollapsed && (
                      <Badge variant="outline" className="ml-auto text-xs bg-secondary/10 text-secondary border-secondary/20">
                        Soon
                      </Badge>
                    )}
                  </div>
                  
                  {/* Hover effect */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-primary/20 space-y-3">
            {/* Settings */}
            <Link
              to="/settings"
              className={cn(
                "group flex items-center space-x-3 px-4 py-3 rounded-2xl font-semibold text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-300 hover:scale-105",
                sidebarCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2.5"
              )}
              onClick={() => setSidebarOpen(false)}
            >
              <Settings className="h-5 w-5 text-primary group-hover:text-secondary transition-colors duration-300" />
              {!sidebarCollapsed && <span className="flex-1">Settings</span>}
            </Link>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className={cn(
                "group flex items-center space-x-3 px-4 py-3 rounded-2xl font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300 hover:scale-105 w-full",
                sidebarCollapsed ? "px-2 py-2 justify-center w-full" : "px-3 py-2.5 w-full"
              )}
            >
              <LogOut className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors duration-300" />
              {!sidebarCollapsed && <span className="flex-1">Sign Out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        "min-h-screen bg-background transition-all duration-300",
        sidebarCollapsed ? "lg:pl-16" : "lg:pl-72"
      )}>
        {/* Mobile menu button */}
        <div className="lg:hidden p-4">
          <button
            className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(true)}
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