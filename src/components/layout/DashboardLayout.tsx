import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [userProjectIds, setUserProjectIds] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch user's project IDs
  const fetchUserProjectIds = async () => {
    if (!user) return;

    try {
      const { data: projectData, error: projectError } = await supabase
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id);

      if (projectError) {
        console.error('Error loading project IDs:', projectError);
        return;
      }

      if (projectData && projectData.length > 0) {
        const projectIds = projectData.map(p => p.project_id);
        setUserProjectIds(projectIds);
        return projectIds;
      }
    } catch (error) {
      console.error('Error fetching project IDs:', error);
    }
    return [];
  };

  // Fetch new feedback count
  const fetchNewFeedbackCount = async () => {
    if (!user || userProjectIds.length === 0) return;

    try {
      // Count feedback that hasn't been marked as read/reviewed
      const { count, error: feedbackError } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', userProjectIds)
        .eq('status', 'new');

      if (feedbackError) {
        console.error('Error loading feedback count:', feedbackError);
        return;
      }

      setNewFeedbackCount(count || 0);
    } catch (error) {
      console.error('Error fetching feedback count:', error);
    }
  };

  // Fetch project IDs and feedback count on mount
  useEffect(() => {
    if (user) {
      fetchUserProjectIds().then((projectIds) => {
        if (projectIds.length > 0) {
          fetchNewFeedbackCount();
        }
      });
    }
  }, [user]);

  // Set up real-time subscription for new feedback
  useEffect(() => {
    if (user && userProjectIds.length > 0) {
      console.log('Setting up real-time subscription for projects:', userProjectIds);

      // Set up real-time subscription for new feedback with more specific events
      const channel = supabase
        .channel('feedback-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'feedbacks',
            filter: `project_id=in.(${userProjectIds.join(',')})`
          },
          (payload) => {
            console.log('New feedback received:', payload);
            // Immediately increment the count for new feedback
            setNewFeedbackCount(prev => prev + 1);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'feedbacks',
            filter: `project_id=in.(${userProjectIds.join(',')})`
          },
          (payload) => {
            console.log('Feedback updated:', payload);
            // Refresh count when feedback status changes
            fetchNewFeedbackCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'feedbacks',
            filter: `project_id=in.(${userProjectIds.join(',')})`
          },
          (payload) => {
            console.log('Feedback deleted:', payload);
            // Refresh count when feedback is deleted
            fetchNewFeedbackCount();
          }
        )
        .subscribe((status) => {
          console.log('Real-time subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to feedback updates');
          }
        });

      return () => {
        console.log('Cleaning up real-time subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [user, userProjectIds]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { 
      name: "Feedback", 
      href: "/feedback", 
      icon: MessageSquare,
      badge: newFeedbackCount > 0 ? newFeedbackCount : undefined
    }, 
    { name: "AI Analytics", href: "/insights-simple", icon: Brain },
    { name: "Executive Reports", href: "/reports", icon: FileText },
    { name: "Business Intelligence", href: "/analytics", icon: BarChart3 },
    { name: "Teams", href: "/teams", icon: Users, comingSoon: true },
    { name: "Usage & Billing", href: "/billing", icon: CreditCard },
    { name: "Feedback Settings", href: "/feedback-settings", icon: SlidersHorizontal },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Profile", href: "/profile", icon: User },
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
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <img src="/favicon.ico" alt="NoteX BI" className="h-8 w-8" />
            </Link>
            <button 
              className="lg:hidden p-1"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const isComingSoon = item.comingSoon;
              
              return (
                <div key={item.name} className="relative">
                  {isComingSoon ? (
                    <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground cursor-not-allowed opacity-60">
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                      <span className="ml-auto text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                        Coming Soon
                      </span>
                    </div>
                  ) : (
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-soft"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                      
                      {/* Notification Badge */}
                      {item.badge && (
                        <Badge 
                          variant="destructive" 
                          className="ml-auto h-5 min-w-5 px-1.5 text-xs font-medium"
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      )}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="p-4 border-t border-border space-y-2">
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile menu button */}
        <div className="lg:hidden p-4">
          <button
            className="p-2 -ml-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        
        {/* Page content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;