import { useState, useEffect } from 'react'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Crown,
  Shield,
  User,
  Eye,
  Trash2,
  Edit
} from 'lucide-react'
import { supabase, TeamMember, Profile } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus'
import toast from 'react-hot-toast'

export const TeamPage = () => {
  const { user } = useAuth()
  const { isPaidActive } = useSubscriptionStatus()
  const [teamMembers, setTeamMembers] = useState<(TeamMember & { profile: Profile })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [isInviting, setIsInviting] = useState(false)

  useEffect(() => {
    if (user && isPaidActive) {
      fetchTeamMembers()
    }
  }, [user, isPaidActive])

  const fetchTeamMembers = async () => {
    try {
      // Get user's workspaces first
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user?.id)

      if (!workspaces || workspaces.length === 0) {
        setIsLoading(false)
        return
      }

      const workspaceId = workspaces[0].id

      // Fetch team members with profile data
      const { data: members, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('workspace_id', workspaceId)

      if (error) throw error

      setTeamMembers(members || [])
    } catch (error) {
      console.error('Error fetching team members:', error)
      toast.error('Failed to load team members')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail || !user) return

    setIsInviting(true)

    try {
      // Get user's workspace
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!workspaces) {
        throw new Error('No workspace found')
      }

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail)
        .single()

      if (!existingUser) {
        toast.error('User not found. They need to sign up first.')
        return
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('workspace_id', workspaces.id)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMember) {
        toast.error('User is already a team member')
        return
      }

      // Add team member
      const { error } = await supabase
        .from('team_members')
        .insert({
          workspace_id: workspaces.id,
          user_id: existingUser.id,
          role: inviteRole
        })

      if (error) throw error

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: existingUser.id,
          workspace_id: workspaces.id,
          type: 'team_invite',
          title: 'You\'ve been added to a team',
          message: `You've been added to a team with ${inviteRole} role.`
        })

      toast.success('Team member added successfully!')
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole('member')
      fetchTeamMembers()
    } catch (error) {
      console.error('Error inviting team member:', error)
      toast.error('Failed to add team member')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      toast.success('Team member removed successfully!')
      fetchTeamMembers()
    } catch (error) {
      console.error('Error removing team member:', error)
      toast.error('Failed to remove team member')
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      toast.success('Role updated successfully!')
      fetchTeamMembers()
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Failed to update role')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'member':
        return <User className="h-4 w-4 text-green-600" />
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'member':
        return 'bg-green-100 text-green-800'
      case 'viewer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isPaidActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Team Management</h3>
          <p className="mt-1 text-sm text-gray-500">
            Team management is available with Pro plan
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
              <p className="mt-2 text-gray-600">
                Manage your team members and their permissions
              </p>
            </div>
            
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </button>
          </div>
        </div>

        {/* Team Members List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Team Members ({teamMembers.length})
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {teamMembers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start by inviting team members to collaborate.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite First Member
                  </button>
                </div>
              </div>
            ) : (
              teamMembers.map((member) => (
                <div key={member.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary-600" />
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {member.profile?.full_name || 'Unknown User'}
                          </p>
                          {member.role === 'owner' && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Owner
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{member.profile?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        {getRoleIcon(member.role)}
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          disabled={member.role === 'owner'}
                          className="ml-2 px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </div>

                      {member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Role Descriptions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Role Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center mb-2">
                <Crown className="h-5 w-5 text-yellow-600 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">Owner</h4>
              </div>
              <p className="text-sm text-gray-500">
                Full access to all features, billing, and team management.
              </p>
            </div>
            
            <div>
              <div className="flex items-center mb-2">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">Admin</h4>
              </div>
              <p className="text-sm text-gray-500">
                Can manage feedback, invite members, and access most features.
              </p>
            </div>
            
            <div>
              <div className="flex items-center mb-2">
                <User className="h-5 w-5 text-green-600 mr-2" />
                <h4 className="text-sm font-medium text-gray-900">Member</h4>
              </div>
              <p className="text-sm text-gray-500">
                Can view and manage feedback, but cannot invite team members.
              </p>
            </div>
          </div>
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Team Member</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail || isInviting}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isInviting ? 'Inviting...' : 'Send Invite'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}