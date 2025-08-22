import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Users, Crown, Shield, User, CheckCircle, XCircle, Clock, Mail } from 'lucide-react';

interface InvitationDetails {
  id: string;
  team_id: string;
  team_name: string;
  team_description: string;
  inviter_email: string;
  inviter_name: string;
  email: string;
  role: string;
  personal_message: string;
  status: string;
  expires_at: string;
  created_at: string;
}

const TeamInvitation: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitationDetails();
    }
  }, [token]);

  const loadInvitationDetails = async () => {
    try {
      const { data, error } = await supabase.rpc('get_invitation_details', {
        invitation_token: token
      });

      if (error) {
        console.error('Error loading invitation:', error);
        toast.error('Failed to load invitation details');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setInvitation(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user) {
      toast.error('Please sign in to accept the invitation');
      return;
    }

    if (!token) {
      toast.error('Invalid invitation token');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('accept_team_invitation', {
        invitation_token: token
      });

      if (error) {
        console.error('Error accepting invitation:', error);
        toast.error('Failed to accept invitation');
        return;
      }

      if (data.success) {
        toast.success('Invitation accepted successfully!');
        navigate('/teams');
      } else {
        toast.error(data.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to accept invitation');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineInvitation = async () => {
    if (!user) {
      toast.error('Please sign in to decline the invitation');
      return;
    }

    if (!token) {
      toast.error('Invalid invitation token');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('decline_team_invitation', {
        invitation_token: token
      });

      if (error) {
        console.error('Error declining invitation:', error);
        toast.error('Failed to decline invitation');
        return;
      }

      if (data.success) {
        toast.success('Invitation declined');
        navigate('/teams');
      } else {
        toast.error(data.error || 'Failed to decline invitation');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to decline invitation');
    } finally {
      setProcessing(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'moderator':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isExpired = invitation && new Date(invitation.expires_at) < new Date();
  const isAlreadyMember = invitation?.status === 'accepted';
  const isDeclined = invitation?.status === 'declined';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate('/teams')} className="w-full">
              Go to Teams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <div className="flex items-center justify-center mb-4">
                <Users className="h-12 w-12 mr-3" />
                <div>
                  <CardTitle className="text-2xl">Team Invitation</CardTitle>
                  <CardDescription className="text-blue-100">
                    You've been invited to join a team on NoteX
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Team Information */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{invitation.team_name}</h2>
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(invitation.role)}
                      <Badge className={getRoleColor(invitation.role)}>
                        {invitation.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                {invitation.team_description && (
                  <p className="text-gray-600 mb-4">{invitation.team_description}</p>
                )}
              </div>

              {/* Inviter Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback>
                      {invitation.inviter_name?.charAt(0) || invitation.inviter_email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{invitation.inviter_name || 'Team Member'}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      {invitation.inviter_email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Message */}
              {invitation.personal_message && (
                <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                  <h3 className="font-medium text-blue-900 mb-2">Personal Message:</h3>
                  <p className="text-blue-800 italic">"{invitation.personal_message}"</p>
                </div>
              )}

              {/* Status Information */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Expires: {new Date(invitation.expires_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <span>Invited: {new Date(invitation.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {isExpired && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-700">This invitation has expired</span>
                  </div>
                </div>
              )}

              {isAlreadyMember && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-green-700">You have already accepted this invitation</span>
                  </div>
                </div>
              )}

              {isDeclined && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-gray-700">You have declined this invitation</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                {!isExpired && !isAlreadyMember && !isDeclined && (
                  <>
                    <Button
                      onClick={handleAcceptInvitation}
                      disabled={processing || !user}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {processing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Accept Invitation
                    </Button>
                    <Button
                      onClick={handleDeclineInvitation}
                      disabled={processing || !user}
                      variant="outline"
                      className="flex-1"
                    >
                      {processing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Decline
                    </Button>
                  </>
                )}

                {(isExpired || isAlreadyMember || isDeclined) && (
                  <Button onClick={() => navigate('/teams')} className="w-full">
                    Go to Teams
                  </Button>
                )}
              </div>

              {!user && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    Please sign in to accept or decline this invitation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeamInvitation;