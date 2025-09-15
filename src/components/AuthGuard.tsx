import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireEmailConfirmation?: boolean;
  requireActiveSubscription?: boolean;
}

const AuthGuard = ({ 
  children, 
  requireEmailConfirmation = true,
  requireActiveSubscription = false 
}: AuthGuardProps) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [accessStatus, setAccessStatus] = useState<any>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("Error getting user:", userError);
          navigate("/login");
          return;
        }

        if (!user) {
          navigate("/login");
          return;
        }

        setUser(user);

        // Check email confirmation if required
        if (requireEmailConfirmation && !user.email_confirmed_at) {
          navigate("/verify-email");
          return;
        }

        // Get user profile from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          // Continue anyway, let the app handle the error
        } else if (profileData) {
          setUserProfile(profileData);
          setAccessStatus(profileData);

          // Check trial expiration
          if (profileData.plan_type === 'trial' && profileData.trial_end) {
            const now = new Date();
            const trialEnd = new Date(profileData.trial_end);
            
            if (now > trialEnd) {
              // Trial expired, redirect to billing page
              navigate("/billing");
              return;
            }
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          navigate("/login");
        } else if (event === 'SIGNED_IN' && session.user) {
          // Re-check access when user signs in
          await checkAuth();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location, requireEmailConfirmation, requireActiveSubscription]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;