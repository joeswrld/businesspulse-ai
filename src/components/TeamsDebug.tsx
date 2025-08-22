import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const TeamsDebug: React.FC = () => {
  const { user } = useAuth();
  const [debugResults, setDebugResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testDatabaseConnection = async () => {
    setLoading(true);
    const results: any = {};

    try {
      console.log('=== Starting Database Debug ===');
      console.log('User:', user);

      // Test 1: Check if user is authenticated
      results.user = {
        id: user?.id,
        email: user?.email,
        authenticated: !!user
      };

      // Test 2: Check if tables exist
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['teams', 'team_members', 'team_invitations', 'team_activities']);

      results.tables = {
        data: tables,
        error: tablesError
      };

      // Test 3: Try to select from teams table
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .limit(1);

      results.teamsQuery = {
        data: teamsData,
        error: teamsError
      };

      // Test 4: Try to create a test team
      const { data: createData, error: createError } = await supabase
        .from('teams')
        .insert({
          name: 'Debug Test Team',
          description: 'Test team for debugging',
          owner_id: user?.id
        })
        .select()
        .single();

      results.createTeam = {
        data: createData,
        error: createError
      };

      // Test 5: If team was created, try to add member
      if (createData) {
        const { data: memberData, error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: createData.id,
            user_id: user?.id,
            role: 'owner',
            status: 'active'
          })
          .select()
          .single();

        results.addMember = {
          data: memberData,
          error: memberError
        };

        // Clean up - delete the test team
        await supabase.from('teams').delete().eq('id', createData.id);
      }

      // Test 6: Check RLS policies
      const { data: policies, error: policiesError } = await supabase
        .rpc('get_policies', { table_names: ['teams', 'team_members'] })
        .catch(() => ({ data: null, error: 'RPC function not available' }));

      results.policies = {
        data: policies,
        error: policiesError
      };

    } catch (error) {
      console.error('Debug error:', error);
      results.generalError = error;
    }

    setDebugResults(results);
    console.log('=== Debug Results ===', results);
    setLoading(false);
  };

  const testSimpleTeamCreation = async () => {
    setLoading(true);
    try {
      console.log('Testing simple team creation...');
      
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: 'Simple Test Team',
          description: 'Simple test',
          owner_id: user?.id
        })
        .select()
        .single();

      console.log('Simple team creation result:', { data, error });
      
      if (error) {
        toast.error(`Team creation failed: ${error.message}`);
      } else {
        toast.success('Team created successfully!');
        // Clean up
        await supabase.from('teams').delete().eq('id', data.id);
      }
    } catch (error) {
      console.error('Simple team creation error:', error);
      toast.error('Team creation failed');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Teams System Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={testDatabaseConnection} disabled={loading}>
              {loading ? 'Testing...' : 'Run Full Debug'}
            </Button>
            <Button onClick={testSimpleTeamCreation} disabled={loading} variant="outline">
              Test Simple Team Creation
            </Button>
          </div>

          {Object.keys(debugResults).length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Debug Results:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(debugResults, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamsDebug;