import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const TestFeedbackSettings = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    const testConnection = async () => {
      try {
        setStatus('Testing database connection...');
        
        if (!user) {
          setStatus('No user found');
          return;
        }

        setStatus(`User found: ${user.email}`);

        // Test basic query
        const { data, error } = await supabase
          .from('feedback_settings')
          .select('count')
          .eq('user_id', user.id);

        if (error) {
          setStatus(`Database error: ${error.message}`);
          return;
        }

        setStatus(`Database connection successful. Found ${data?.length || 0} settings.`);
      } catch (err) {
        setStatus(`Exception: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    testConnection();
  }, [user]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Feedback Settings Test</h1>
      <div className="bg-gray-100 p-4 rounded">
        <p><strong>Status:</strong> {status}</p>
        <p><strong>User:</strong> {user ? user.email : 'None'}</p>
        <p><strong>User ID:</strong> {user ? user.id : 'None'}</p>
      </div>
    </div>
  );
};

export default TestFeedbackSettings;