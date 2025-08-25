import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AuthTest = () => {
  const { user, session, loading } = useAuth();
  const [testResult, setTestResult] = useState<string>("");

  const testAuth = async () => {
    try {
      setTestResult("Testing authentication...");
      
      // Test 1: Check current session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      console.log("Current session:", currentSession);
      console.log("Session error:", sessionError);
      
      if (sessionError) {
        setTestResult(`Session error: ${sessionError.message}`);
        return;
      }

      // Test 2: Check user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      console.log("Current user:", currentUser);
      console.log("User error:", userError);
      
      if (userError) {
        setTestResult(`User error: ${userError.message}`);
        return;
      }

      // Test 3: Test database access
      if (currentUser) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .limit(1);
          
          console.log("Database test result:", data);
          console.log("Database error:", error);
          
          if (error) {
            setTestResult(`Database error: ${error.message}`);
          } else {
            setTestResult(`✅ Auth working! User: ${currentUser.email}, Profile records: ${data?.length || 0}`);
          }
        } catch (dbError) {
          setTestResult(`Database exception: ${dbError}`);
        }
      } else {
        setTestResult("❌ No user found");
      }
      
    } catch (error) {
      setTestResult(`Test failed: ${error}`);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setTestResult("Signed out successfully");
    } catch (error) {
      setTestResult(`Sign out error: ${error}`);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50">
      <CardHeader>
        <CardTitle className="text-sm">Auth Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs space-y-1">
          <div>Loading: {loading ? "Yes" : "No"}</div>
          <div>User: {user ? user.email : "None"}</div>
          <div>Session: {session ? "Valid" : "None"}</div>
        </div>
        
        <div className="space-y-2">
          <Button size="sm" onClick={testAuth} className="w-full">
            Test Auth
          </Button>
          <Button size="sm" onClick={signOut} variant="outline" className="w-full">
            Sign Out
          </Button>
        </div>
        
        {testResult && (
          <div className="text-xs bg-gray-100 p-2 rounded">
            {testResult}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthTest;