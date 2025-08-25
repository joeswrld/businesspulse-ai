import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const AuthDebugger = () => {
  const { user, session, loading } = useAuth();

  useEffect(() => {
    console.log("=== AUTH DEBUG INFO ===");
    console.log("Loading:", loading);
    console.log("User:", user);
    console.log("Session:", session);
    console.log("User ID:", user?.id);
    console.log("User Email:", user?.email);
    console.log("Session Access Token:", session?.access_token ? "Present" : "Missing");
    console.log("Session Refresh Token:", session?.refresh_token ? "Present" : "Missing");
    console.log("Session Expires At:", session?.expires_at);
    console.log("Current Time:", Date.now());
    console.log("Session Valid:", session?.expires_at ? Date.now() < session.expires_at * 1000 : "No session");
    console.log("=======================");
  }, [user, session, loading]);

  if (loading) {
    return (
      <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded z-50">
        🔄 Auth Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded z-50">
        ❌ No User (Redirecting to /auth)
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded z-50">
      ✅ Authenticated: {user.email}
    </div>
  );
};

export default AuthDebugger;