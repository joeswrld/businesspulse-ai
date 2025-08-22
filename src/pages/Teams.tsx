import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import TeamsDebug from '@/components/TeamsDebug';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  User,
  MessageSquare,
  Calendar,
  Clock,
  Activity,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  Star,
  TrendingUp,
  Target,
  Award,
  Zap,
  Globe,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Settings,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Sparkles,
  Rocket,
  Lightbulb,
  BarChart3,
  FileText,
  Share2,
  Copy,
  ExternalLink,
  Download,
  Upload,
  RefreshCw,
  Play,
  Pause,
  Square,
  RotateCcw
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  joined_at: string;
  last_active: string;
  permissions: string[];
  user: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface Team {
  id: string;
  name: string;
  description: string;
  avatar_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  owner_id: string;
  member_count: number;
  analytics_enabled: boolean;
  real_time_collaboration: boolean;
  settings: {
    allow_invites: boolean;
    require_approval: boolean;
    auto_assign_roles: boolean;
    notification_preferences: string[];
  };
}

interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined';
  invited_by: string;
  invited_at: string;
  expires_at: string;
}

const Teams: React.FC = () => {
  const { user } = useAuth();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-teams' | 'invitations' | 'discover'>('my-teams');
  
  // Create team states
  const [createTeamDialog, setCreateTeamDialog] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    is_public: false,
    analytics_enabled: true,
    real_time_collaboration: true
  });
  
  // Invite member states
  const [inviteDialog, setInviteDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member',
    message: ''
  });
  
  // Real-time states
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Test database connection
  const testDatabaseConnection = async () => {
    if (!user) return;
    
    try {
      console.log('Testing database connection...');
      
      // Test basic teams query
      const { data: testTeams, error: testError } = await supabase
        .from('teams')
        .select('count')
        .limit(1);
      
      console.log('Test teams query result:', { data: testTeams, error: testError });
      
      // Test user's own teams
      const { data: userTeams, error: userTeamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id);
      
      console.log('User teams query result:', { data: userTeams, error: userTeamsError });
      
      // Test team members
      const { data: userMembers, error: userMembersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('User members query result:', { data: userMembers, error: userMembersError });
      
    } catch (error) {
      console.error('Database connection test failed:', error);
    }
  };

  // Load teams data
  const loadTeams = useCallback(async () => {
    if (!user) {
      console.log('No user found, skipping teams load');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading teams for user:', user.id);
      
      // First, try to get teams where user is owner
      const { data: ownedTeams, error: ownedError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id);

      if (ownedError) {
        console.error('Owned teams error:', ownedError);
      }

      // Then, try to get teams where user is a member
      const { data: memberTeams, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Member teams error:', memberError);
      }

      // Get the actual team data for member teams
      let memberTeamData: any[] = [];
      if (memberTeams && memberTeams.length > 0) {
        const teamIds = memberTeams.map(m => m.team_id);
        const { data: memberTeamDetails, error: memberTeamError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);

        if (memberTeamError) {
          console.error('Member team details error:', memberTeamError);
        } else {
          memberTeamData = memberTeamDetails || [];
        }
      }

      // Combine owned and member teams, removing duplicates
      const allTeams = [...(ownedTeams || []), ...memberTeamData];
      const uniqueTeams = allTeams.filter((team, index, self) => 
        index === self.findIndex(t => t.id === team.id)
      );

      console.log('Found teams:', uniqueTeams);
      setTeams(uniqueTeams);

      // Load team members for all teams
      if (uniqueTeams.length > 0) {
        const teamIds = uniqueTeams.map(team => team.id);
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select('*')
          .in('team_id', teamIds);

        if (membersError) {
          console.error('Members error:', membersError);
        } else {
          console.log('Found team members:', membersData);
          setTeamMembers(membersData || []);
        }
      }

      // Load invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('email', user.email)
        .eq('status', 'pending');

      if (invitationsError) {
        console.error('Invitations error:', invitationsError);
      } else {
        console.log('Found invitations:', invitationsData);
        setInvitations(invitationsData || []);
      }

    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Failed to load teams data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // Real-time updates
  useEffect(() => {
    if (realTimeMode && autoRefresh) {
      const interval = setInterval(() => {
        loadTeams();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [realTimeMode, autoRefresh, loadTeams]);

  // Create new team
  const createTeam = async () => {
    if (!user || !newTeam.name.trim()) {
      toast.error('Please provide a team name');
      return;
    }

    try {
      // Create team first
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: newTeam.name,
          description: newTeam.description,
          is_public: newTeam.is_public,
          owner_id: user.id,
          analytics_enabled: newTeam.analytics_enabled,
          real_time_collaboration: newTeam.real_time_collaboration,
          settings: {
            allow_invites: true,
            require_approval: false,
            auto_assign_roles: true,
            notification_preferences: ['email', 'push']
          }
        })
        .select()
        .single();

      if (teamError) {
        console.error('Team creation error:', teamError);
        throw teamError;
      }

      // Add owner as team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          permissions: ['all']
        });

      if (memberError) {
        console.error('Member creation error:', memberError);
        // If member creation fails, try to delete the team
        await supabase.from('teams').delete().eq('id', team.id);
        throw memberError;
      }

      toast.success('Team created successfully!');
      setCreateTeamDialog(false);
      setNewTeam({ name: '', description: '', is_public: false, analytics_enabled: true, real_time_collaboration: true });
      loadTeams();

    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
    }
  };

  // Invite member to team
  const inviteMember = async () => {
    if (!selectedTeam || !inviteData.email.trim()) {
      toast.error('Please provide an email address');
      return;
    }

    try {
      const { error } = await supabase
        .from('team_invitations')
        .insert({
          team_id: selectedTeam.id,
          email: inviteData.email,
          role: inviteData.role,
          invited_by: user?.id,
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      if (error) throw error;

      toast.success(`Invitation sent to ${inviteData.email}!`);
      setInviteDialog(false);
      setInviteData({ email: '', role: 'member', message: '' });
      setSelectedTeam(null);

    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to send invitation');
    }
  };

  // Accept invitation
  const acceptInvitation = async (invitation: TeamInvitation) => {
    try {
      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: user?.id,
          role: invitation.role,
          status: 'active',
          permissions: invitation.role === 'admin' ? ['read', 'write', 'admin'] : ['read', 'write']
        });

      if (memberError) throw memberError;

      // Update invitation status
      const { error: inviteError } = await supabase
        .from('team_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      if (inviteError) throw inviteError;

      toast.success('Invitation accepted! Welcome to the team!');
      loadTeams();

    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    }
  };

  // Decline invitation
  const declineInvitation = async (invitation: TeamInvitation) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'declined' })
        .eq('id', invitation.id);

      if (error) throw error;

      toast.success('Invitation declined');
      loadTeams();

    } catch (error) {
      console.error('Error declining invitation:', error);
      toast.error('Failed to decline invitation');
    }
  };

  // Get team members for a specific team
  const getTeamMembers = (teamId: string) => {
    return teamMembers.filter(member => member.team_id === teamId);
  };

  // Get user's role in a team
  const getUserRole = (teamId: string) => {
    const member = teamMembers.find(m => m.team_id === teamId && m.user_id === user?.id);
    return member?.role || 'none';
  };

  // Filter teams based on search and filters
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         team.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || getUserRole(team.id) === filterRole;
    const matchesStatus = filterStatus === 'all' || team.analytics_enabled === (filterStatus === 'enabled');
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'member': return <User className="h-4 w-4 text-green-500" />;
      case 'viewer': return <Eye className="h-4 w-4 text-gray-500" />;
      default: return <User className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'member': return 'bg-green-100 text-green-800 border-green-300';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading teams...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Collaborate with your team in real-time
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={testDatabaseConnection}
          >
            <Settings className="h-4 w-4 mr-2" />
            Debug DB
          </Button>
          <Button
            variant={realTimeMode ? "default" : "outline"}
            size="sm"
            onClick={() => setRealTimeMode(!realTimeMode)}
          >
            {realTimeMode ? <Activity className="h-4 w-4 mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
            {realTimeMode ? 'Real-time' : 'Static'}
          </Button>
          {realTimeMode && (
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Auto-refresh
            </Button>
          )}
          <Dialog open={createTeamDialog} onOpenChange={setCreateTeamDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a new team to collaborate with your colleagues.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Team Name</label>
                  <Input
                    placeholder="Enter team name"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Describe your team's purpose"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={newTeam.is_public}
                    onChange={(e) => setNewTeam(prev => ({ ...prev, is_public: e.target.checked }))}
                  />
                  <label htmlFor="is_public" className="text-sm">Public team (visible to everyone)</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="analytics_enabled"
                    checked={newTeam.analytics_enabled}
                    onChange={(e) => setNewTeam(prev => ({ ...prev, analytics_enabled: e.target.checked }))}
                  />
                  <label htmlFor="analytics_enabled" className="text-sm">Enable team analytics</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="real_time_collaboration"
                    checked={newTeam.real_time_collaboration}
                    onChange={(e) => setNewTeam(prev => ({ ...prev, real_time_collaboration: e.target.checked }))}
                  />
                  <label htmlFor="real_time_collaboration" className="text-sm">Enable real-time collaboration</label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateTeamDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createTeam}>
                  Create Team
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Debug Component */}
      <TeamsDebug />

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'my-teams' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('my-teams')}
        >
          My Teams ({teams.length})
        </button>
        <button
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'invitations' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('invitations')}
        >
          Invitations ({invitations.length})
        </button>
        <button
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'discover' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('discover')}
        >
          Discover
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="enabled">Analytics Enabled</SelectItem>
              <SelectItem value="disabled">Analytics Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'my-teams' && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => {
            const members = getTeamMembers(team.id);
            const userRole = getUserRole(team.id);
            
            return (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(userRole)}
                          <Badge variant="outline" className={getRoleColor(userRole)}>
                            {userRole}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {team.is_public ? (
                        <Globe className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-orange-500" />
                      )}
                      {team.real_time_collaboration && (
                        <Zap className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {team.description || 'No description provided'}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Members</span>
                      <span className="font-medium">{members.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Analytics</span>
                      <div className="flex items-center space-x-1">
                        {team.analytics_enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={team.analytics_enabled ? 'text-green-600' : 'text-red-600'}>
                          {team.analytics_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Real-time</span>
                      <div className="flex items-center space-x-1">
                        {team.real_time_collaboration ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className={team.real_time_collaboration ? 'text-green-600' : 'text-red-600'}>
                          {team.real_time_collaboration ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTeam(team);
                        setInviteDialog(true);
                      }}
                      disabled={!['owner', 'admin'].includes(userRole)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Invite
                    </Button>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === 'invitations' && (
        <div className="space-y-4">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Pending Invitations</h3>
                <p className="text-muted-foreground">
                  You don't have any pending team invitations at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Team Invitation</h3>
                        <p className="text-sm text-muted-foreground">
                          You've been invited to join a team
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{invitation.role}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Expires {new Date(invitation.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => acceptInvitation(invitation)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => declineInvitation(invitation)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'discover' && (
        <Card>
          <CardContent className="text-center py-8">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Discover Public Teams</h3>
            <p className="text-muted-foreground mb-4">
              Find and join public teams to collaborate with others.
            </p>
            <Button variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Browse Public Teams
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member to {selectedTeam?.name}</DialogTitle>
            <DialogDescription>
              Send an invitation to collaborate with your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteData.email}
                onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteData.role} onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Personal Message (Optional)</label>
              <Textarea
                placeholder="Add a personal message to your invitation..."
                value={inviteData.message}
                onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={inviteMember}>
              <UserPlus className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teams;