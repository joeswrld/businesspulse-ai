import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Settings, 
  Search, 
  Filter,
  Calendar,
  Tag,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Mail,
  Crown,
  Shield,
  User,
  EyeOff,
  Loader2,
  TrendingUp,
  FileText,
  Brain,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Team {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: Record<string, unknown> | null;
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  status: 'invited' | 'active' | 'suspended';
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    full_name: string;
  };
}

interface TeamProject {
  id: string;
  team_id: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'completed';
  created_by: string;
  assigned_to: string | null;
  due_date: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface TeamInsight {
  id: string;
  team_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  key_findings: string[];
  recommendations: string[];
  projected_impact: string | null;
  tags: string[];
  source: string | null;
  created_by: string;
  assigned_to: string | null;
  status: 'draft' | 'review' | 'approved' | 'implemented';
  created_at: string;
  updated_at: string;
}

interface TeamReport {
  id: string;
  team_id: string;
  title: string;
  description: string;
  report_type: 'PDF' | 'CSV' | 'XLSX' | 'Dashboard';
  status: 'draft' | 'review' | 'approved' | 'published';
  file_url: string | null;
  file_size: number | null;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const Teams: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamProjects, setTeamProjects] = useState<TeamProject[]>([]);
  const [teamInsights, setTeamInsights] = useState<TeamInsight[]>([]);
  const [teamReports, setTeamReports] = useState<TeamReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Form state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  // Fetch teams data
  const fetchTeamsData = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching teams data for user:', user.id);
      
      // Fetch user's teams
      const { data: teamsData, error: teamsError } = await supabase
        .rpc('get_user_teams', { p_user_id: user.id });

      if (teamsError) throw teamsError;

      // Fetch team details for user's teams
      if (teamsData && teamsData.length > 0) {
        const teamIds = teamsData.map(t => t.team_id);
        
        const { data: teamDetails, error: teamDetailsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);

        if (teamDetailsError) throw teamDetailsError;
        setTeams(teamDetails || []);

        // Set first team as selected
        if (teamDetails && teamDetails.length > 0) {
          setSelectedTeam(teamDetails[0]);
        }
      }

      console.log('👥 Teams data fetched:', {
        teams: teamsData?.length || 0,
        selectedTeam: selectedTeam?.name || 'None'
      });
      
    } catch (error) {
      console.error('❌ Error fetching teams data:', error);
      toast({
        title: "Error",
        description: "Failed to load teams information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Fetch selected team data
  const fetchTeamData = useCallback(async () => {
    if (!selectedTeam || !user) return;

    try {
      const teamNameForLog = selectedTeam?.name;
      console.log('🔍 Fetching data for team:', teamNameForLog);
      
      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          *,
          user:profiles!team_members_user_id_fkey(email, full_name)
        `)
        .eq('team_id', selectedTeam.id)
        .order('created_at', { ascending: false });

      if (membersError) throw membersError;

      // Fetch team projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('team_projects')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch team insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('team_insights')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('created_at', { ascending: false });

      if (insightsError) throw insightsError;

      // Fetch team reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('team_reports')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      console.log('📊 Team data fetched:', {
        members: membersData?.length || 0,
        projects: projectsData?.length || 0,
        insights: insightsData?.length || 0,
        reports: reportsData?.length || 0
      });
      
      setTeamMembers(membersData || []);
      setTeamProjects(projectsData || []);
      setTeamInsights(insightsData || []);
      setTeamReports(reportsData || []);
      
    } catch (error) {
      console.error('❌ Error fetching team data:', error);
      toast({
        title: "Error",
        description: "Failed to load team information",
        variant: "destructive"
      });
    }
  }, [selectedTeam, selectedTeam?.name, user, toast]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time teams subscriptions for user:', user.id);

    // Subscribe to team changes
    const teamsChannel = supabase
      .channel('teams-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams'
        },
        (payload) => {
          console.log('🔄 Team real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            setTeams(prev => [...prev, payload.new as Team]);
          } else if (payload.eventType === 'UPDATE') {
            setTeams(prev => 
              prev.map(team => 
                team.id === payload.new.id ? payload.new as Team : team
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTeams(prev => prev.filter(team => team.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to team member changes
    const membersChannel = supabase
      .channel('team-members-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members'
        },
        (payload) => {
          console.log('🔄 Team member real-time update:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            setTeamMembers(prev => [...prev, payload.new as TeamMember]);
          } else if (payload.eventType === 'UPDATE') {
            setTeamMembers(prev => 
              prev.map(member => 
                member.id === payload.new.id ? payload.new as TeamMember : member
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTeamMembers(prev => prev.filter(member => member.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time teams subscriptions');
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchTeamsData();
  }, [fetchTeamsData]);

  // Fetch team data when selected team changes
  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Create new team
  const createTeam = async () => {
    if (!user || !newTeamName.trim()) return;

    try {
      const slug = newTeamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: newTeamName.trim(),
          description: newTeamDescription.trim(),
          owner_id: user.id,
          slug: slug
        })
        .select()
        .single();

      if (error) throw error;

      // Add user as owner member
      await supabase
        .from('team_members')
        .insert({
          team_id: data.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          joined_at: new Date().toISOString()
        });

      toast({
        title: "Team Created",
        description: `${newTeamName} team has been created successfully!`,
      });

      setNewTeamName('');
      setNewTeamDescription('');
      setShowCreateTeam(false);
      setSelectedTeam(data);

    } catch (error) {
      console.error('❌ Error creating team:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create team',
        variant: "destructive"
      });
    }
  };

  // Invite team member
  const inviteMember = async () => {
    if (!selectedTeam || !inviteEmail.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('team_invitations')
        .insert({
          team_id: selectedTeam.id,
          email: inviteEmail.trim(),
          role: inviteRole,
          invited_by: user.id,
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (error) throw error;

      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}`,
      });

      setInviteEmail('');
      setInviteRole('member');
      setShowInviteMember(false);

    } catch (error) {
      console.error('❌ Error inviting member:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to send invitation',
        variant: "destructive"
      });
    }
  };

  // Utility functions
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'member':
        return <User className="h-4 w-4 text-green-600" />;
      case 'viewer':
        return <EyeOff className="h-4 w-4 text-gray-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'member':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'invited':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
              <p className="mt-2 text-lg text-gray-600">
                Collaborate with your team on insights, reports, and projects.
              </p>
            </div>
            <Button onClick={() => setShowCreateTeam(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Teams Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {teams.length}
                  </div>
                  <div className="text-sm text-gray-500">Active teams</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <User className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {teamMembers.length}
                  </div>
                  <div className="text-sm text-gray-500">Active members</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {teamProjects.filter(p => p.status === 'active').length}
                  </div>
                  <div className="text-sm text-gray-500">In progress</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Team Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Brain className="h-8 w-8 text-indigo-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {teamInsights.length}
                  </div>
                  <div className="text-sm text-gray-500">Shared insights</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Selection */}
        {teams.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Select Team</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInviteMember(true)}
                disabled={!selectedTeam}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {teams.map((team) => (
                <Button
                  key={team.id}
                  variant={selectedTeam?.id === team.id ? "default" : "outline"}
                  onClick={() => setSelectedTeam(team)}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  {team.name}
                  {team.owner_id === user?.id && (
                    <Crown className="h-3 w-3 text-yellow-500" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Team Content */}
        {selectedTeam ? (
          <div className="space-y-8">
            {/* Team Members */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members ({teamMembers.length})
                </CardTitle>
                <CardDescription>
                  Manage team members and their roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
                    <p className="text-gray-500">
                      Invite team members to start collaborating.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(member.role)}
                            <span className="font-medium text-gray-900">
                              {member.user?.full_name || member.user?.email || 'Unknown User'}
                            </span>
                          </div>
                          <Badge className={getRoleColor(member.role)}>
                            {member.role}
                          </Badge>
                          <Badge className={getStatusColor(member.status)}>
                            {member.status}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          {member.joined_at ? (
                            `Joined ${formatTimeAgo(member.joined_at)}`
                          ) : (
                            `Invited ${formatTimeAgo(member.invited_at)}`
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Projects */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Team Projects ({teamProjects.length})
                </CardTitle>
                <CardDescription>
                  Track collaborative projects and tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                    <p className="text-gray-500">
                      Create your first team project to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamProjects.map((project) => (
                      <div
                        key={project.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{project.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                          </div>
                          <Badge className={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {project.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Due {new Date(project.due_date).toLocaleDateString()}
                            </div>
                          )}
                          {project.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Tag className="h-4 w-4" />
                              {project.tags.join(', ')}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTimeAgo(project.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Insights */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Team Insights ({teamInsights.length})
                </CardTitle>
                <CardDescription>
                  AI insights shared across the team
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamInsights.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No team insights yet</h3>
                    <p className="text-gray-500">
                      Share AI insights with your team for better collaboration.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamInsights.map((insight) => (
                      <div
                        key={insight.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{insight.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(insight.priority)}>
                              {insight.priority}
                            </Badge>
                            <Badge className={getStatusColor(insight.status)}>
                              {insight.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            {insight.category}
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            {insight.confidence}% confidence
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTimeAgo(insight.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Reports */}
            <Card className="bg-white shadow-sm border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Team Reports ({teamReports.length})
                </CardTitle>
                <CardDescription>
                  Collaborative reports and dashboards
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamReports.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No team reports yet</h3>
                    <p className="text-gray-500">
                      Create and share reports with your team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teamReports.map((report) => (
                      <div
                        key={report.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{report.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{report.report_type}</Badge>
                            <Badge className={getStatusColor(report.status)}>
                              {report.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            {report.tags.join(', ')}
                          </div>
                          {report.published_at && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Published {formatTimeAgo(report.published_at)}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatTimeAgo(report.created_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-white shadow-sm border-0">
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {teams.length === 0 ? 'No teams yet' : 'Select a team'}
              </h3>
              <p className="text-gray-500">
                {teams.length === 0 
                  ? 'Create your first team to start collaborating with others.' 
                  : 'Choose a team from the list above to view details and manage members.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Team</CardTitle>
              <CardDescription>
                Set up a new team for collaboration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Team Name</label>
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Enter team name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  placeholder="Describe your team's purpose"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={createTeam}
                  disabled={!newTeamName.trim()}
                  className="flex-1"
                >
                  Create Team
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateTeam(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite Team Member</CardTitle>
              <CardDescription>
                Send an invitation to join {selectedTeam?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Role</label>
                <Select value={inviteRole} onValueChange={(value: 'admin' | 'member' | 'viewer') => setInviteRole(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={inviteMember}
                  disabled={!inviteEmail.trim()}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowInviteMember(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Teams;