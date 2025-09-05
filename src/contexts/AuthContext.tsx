import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  error: null,
});

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [seededSettingsFor, setSeededSettingsFor] = useState<string | null>(null);

  // Helper function to ensure feedback settings exist (non-blocking)
  const ensureFeedbackSettings = async (userId: string) => {
    try {
      if (seededSettingsFor === userId) return;

      // Probe if row exists
      const { data: existing } = await (supabase as any)
        .from('feedback_settings')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!existing || existing.length === 0) {
        // Create row idempotently
        await (supabase as any)
          .from('feedback_settings')
          .upsert({ user_id: userId }, { onConflict: 'user_id' });
      }
      setSeededSettingsFor(userId);
    } catch (e) {
      console.warn('Non-fatal: could not seed feedback_settings:', e);
    }
  };


  useEffect(() => {
    let mounted = true;

    console.log("🔐 AuthProvider: Initializing authentication...");

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔐 Auth state changed:", event, session?.user?.email);

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          setError(null);
          
          if (event === 'SIGNED_IN') {
            console.log("✅ User signed in successfully:", session?.user?.email);
          } else if (event === 'SIGNED_OUT') {
            console.log("🚪 User signed out");
          } else if (event === 'TOKEN_REFRESHED') {
            console.log("🔄 Token refreshed");
          }
        }

        // Defer feedback_settings creation to avoid blocking auth flow
        if (session?.user?.id && !seededSettingsFor) {
          // Defer this operation to avoid blocking the auth state change
          setTimeout(() => {
            ensureFeedbackSettings(session.user.id);
          }, 1000);
        }
      }
    );

    // THEN check for existing session
    const getInitialSession = async () => {
      try {
        console.log("🔐 Checking for existing session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) {
            console.error("❌ Error getting session:", error);
            setError(error.message);
            setLoading(false);
            return;
          }
          
          console.log("🔐 Initial session check:", session ? "Found" : "None");
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Error in getInitialSession:", error);
        if (mounted) {
          setError(error instanceof Error ? error.message : "Unknown error");
          setLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading authentication...</p>
          {error && (
            <p className="text-red-500 text-sm mt-2">Error: {error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

