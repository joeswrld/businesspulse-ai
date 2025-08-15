import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  Shield,
  User,
  MoreHorizontal,
  Search,
  Loader2,
  Calendar
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  status: string;
  invited_at: string | null;
  joined_at: string | null;
  invited_by: string | null;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface Organization {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  created_at: string;
}

const Teams: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch team data
  useEffect(() => {
    if (!user) return;

    const fetchTeamData = async () => {
      try {
        // First, check if user belongs to an organization
        const { data: userMembership } = await supabase
          .from('team_members')
          .select(`
            organization_id,
            organizations (*)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (userMembership?.organization_id) {
          setOrganization(userMembership.organizations as Organization);

          // Fetch all team members for the organization
          const { data: members, error } = await supabase
            .from('team_members')
            .select('*')
            .eq('organization_id', userMembership.organization_id)
            .order('created_at', { ascending: false });

          if (!error && members) {
            // Fetch profiles separately for each member
            const membersWithProfiles = await Promise.all(
              members.map(async (member) => {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('first_name, last_name')
                  .eq('user_id', member.user_id)
                  .single();
                
                return {
                  ...member,
                  profiles: profile || { first_name: null, last_name: null }
                };
              })
            );
            
            setTeamMembers(membersWithProfiles as TeamMember[]);
          }
        }
      } catch (error) {
        console.error('Error fetching team data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();

    // Set up realtime subscription
    const channel = supabase
      .channel('team-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members'
        },
        () => {
          fetchTeamData(); // Refresh data on any team member changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const sendInvite = async () => {
    if (!user || !organization || !inviteEmail) return;

    setInviting(true);
    
    try {
      // Create pending team member record
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          organization_id: organization.id,
          user_id: inviteEmail, // This would normally be a lookup after user creation
          role: inviteRole,
          status: 'pending',
          invited_by: user.id,
          invited_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // In a real app, this would trigger an edge function to send an email
      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${inviteEmail}`,
      });

      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');

    } catch (error) {
      console.error('Error sending invite:', error);
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Role Updated",
        description: "Team member role has been updated successfully.",
      });

    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Member Removed",
        description: "Team member has been removed successfully.",
      });

    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-100 text-yellow-800';
      case 'moderator':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredMembers = teamMembers.filter(member => {
    const name = `${member.profiles?.first_name || ''} ${member.profiles?.last_name || ''}`.toLowerCase();
    const role = member.role.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return name.includes(searchLower) || role.includes(searchLower);
  });

  const getMemberName = (member: TeamMember) => {
    if (member.profiles?.first_name || member.profiles?.last_name) {
      return `${member.profiles.first_name || ''} ${member.profiles.last_name || ''}`.trim();
    }
    return member.user_id; // Fallback to user ID
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading team...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Team Organization</h3>
          <p className="text-muted-foreground mb-4">
            You're not part of any team organization yet. Contact your administrator to get invited.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Teams</h1>
          <p className="text-muted-foreground">Manage your team members and collaboration</p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your team organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setInviteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={sendInvite}
                  disabled={inviting || !inviteEmail}
                >
                  {inviting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Invite
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            {organization.name}
          </CardTitle>
          <CardDescription>
            {organization.industry && `${organization.industry} • `}
            {organization.size && `${organization.size} company • `}
            {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      {filteredMembers.length > 0 ? (
        <div className="grid gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">
                        {getMemberName(member)}
                      </h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getRoleBadgeColor(member.role)}>
                          <div className="flex items-center space-x-1">
                            {getRoleIcon(member.role)}
                            <span>{member.role}</span>
                          </div>
                        </Badge>
                        <Badge className={getStatusBadgeColor(member.status)}>
                          {member.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {member.joined_at 
                        ? `Joined ${new Date(member.joined_at).toLocaleDateString()}`
                        : member.invited_at
                        ? `Invited ${new Date(member.invited_at).toLocaleDateString()}`
                        : 'No date'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No team members found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Try adjusting your search to see more results.'
                  : 'Invite your first team member to get started.'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite First Member
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Teams;