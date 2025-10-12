import { useState, useEffect } from 'react'
import { 
  Settings as SettingsIcon, 
  User, 
  Building, 
  Palette,
  Code,
  Save,
  Eye,
  Copy
} from 'lucide-react'
import { supabase, Workspace } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export const SettingsPage = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)

      // Fetch workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user?.id)
        .single()

      if (workspaceError && workspaceError.code !== 'PGRST116') {
        throw workspaceError
      }

      setWorkspace(workspaceData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          company_name: profile.company_name
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleWorkspaceUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSaving(true)

    try {
      if (workspace) {
        // Update existing workspace
        const { error } = await supabase
          .from('workspaces')
          .update({
            name: workspace.name,
            widget_color: workspace.widget_color,
            widget_greeting: workspace.widget_greeting,
            widget_position: workspace.widget_position
          })
          .eq('id', workspace.id)

        if (error) throw error
      } else {
        // Create new workspace
        const { data, error } = await supabase
          .from('workspaces')
          .insert({
            owner_id: user.id,
            name: workspace?.name || `${profile?.full_name || 'My'}'s Workspace`,
            slug: `${profile?.full_name || 'my'}-workspace-${Date.now()}`,
            widget_color: workspace?.widget_color || '#3B82F6',
            widget_greeting: workspace?.widget_greeting || 'How can we help you today?',
            widget_position: workspace?.widget_position || 'bottom-right'
          })
          .select()
          .single()

        if (error) throw error
        setWorkspace(data)
      }

      toast.success('Workspace updated successfully!')
    } catch (error) {
      console.error('Error updating workspace:', error)
      toast.error('Failed to update workspace')
    } finally {
      setIsSaving(false)
    }
  }

  const copyWidgetCode = () => {
    if (!workspace) return

    const widgetCode = `
<!-- NoteX Feedback Widget -->
<script>
  (function() {
    var notex = document.createElement('script');
    notex.type = 'text/javascript';
    notex.async = true;
    notex.src = '${window.location.origin}/widget.js';
    notex.setAttribute('data-workspace', '${workspace.slug}');
    notex.setAttribute('data-color', '${workspace.widget_color}');
    notex.setAttribute('data-greeting', '${workspace.widget_greeting}');
    notex.setAttribute('data-position', '${workspace.widget_position}');
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(notex, s);
  })();
</script>
    `.trim()

    navigator.clipboard.writeText(widgetCode)
    toast.success('Widget code copied to clipboard!')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'workspace', name: 'Workspace', icon: Building },
    { id: 'widget', name: 'Widget', icon: Code }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your account and workspace settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Profile Settings</h2>
                  
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profile?.full_name || ''}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Email cannot be changed
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={profile?.company_name || ''}
                        onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Workspace Tab */}
              {activeTab === 'workspace' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Workspace Settings</h2>
                  
                  <form onSubmit={handleWorkspaceUpdate} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Workspace Name
                      </label>
                      <input
                        type="text"
                        value={workspace?.name || ''}
                        onChange={(e) => setWorkspace({ ...workspace, name: e.target.value } as Workspace)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="My Company Workspace"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Widget Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={workspace?.widget_color || '#3B82F6'}
                          onChange={(e) => setWorkspace({ ...workspace, widget_color: e.target.value } as Workspace)}
                          className="h-10 w-20 border border-gray-300 rounded-md"
                        />
                        <input
                          type="text"
                          value={workspace?.widget_color || '#3B82F6'}
                          onChange={(e) => setWorkspace({ ...workspace, widget_color: e.target.value } as Workspace)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Widget Greeting
                      </label>
                      <input
                        type="text"
                        value={workspace?.widget_greeting || ''}
                        onChange={(e) => setWorkspace({ ...workspace, widget_greeting: e.target.value } as Workspace)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        placeholder="How can we help you today?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Widget Position
                      </label>
                      <select
                        value={workspace?.widget_position || 'bottom-right'}
                        onChange={(e) => setWorkspace({ ...workspace, widget_position: e.target.value } as Workspace)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="top-left">Top Left</option>
                      </select>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Widget Tab */}
              {activeTab === 'widget' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-6">Widget Integration</h2>
                  
                  {workspace ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Installation Code</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Copy and paste this code into your website's HTML, preferably before the closing &lt;/body&gt; tag.
                        </p>
                        
                        <div className="bg-gray-900 rounded-lg p-4 relative">
                          <pre className="text-sm text-green-400 overflow-x-auto">
                            <code>{`
<!-- NoteX Feedback Widget -->
<script>
  (function() {
    var notex = document.createElement('script');
    notex.type = 'text/javascript';
    notex.async = true;
    notex.src = '${window.location.origin}/widget.js';
    notex.setAttribute('data-workspace', '${workspace.slug}');
    notex.setAttribute('data-color', '${workspace.widget_color}');
    notex.setAttribute('data-greeting', '${workspace.widget_greeting}');
    notex.setAttribute('data-position', '${workspace.widget_position}');
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(notex, s);
  })();
</script>
                            `}</code>
                          </pre>
                          
                          <button
                            onClick={copyWidgetCode}
                            className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Widget Preview</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          This is how your feedback widget will appear on your website.
                        </p>
                        
                        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: workspace.widget_color }}
                              ></div>
                              <span className="text-sm font-medium text-gray-900">
                                {workspace.widget_greeting}
                              </span>
                            </div>
                            <button className="text-sm text-gray-500 hover:text-gray-700">
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Need Help?</h4>
                        <p className="text-sm text-blue-700">
                          If you need help integrating the widget or have any questions, 
                          contact our support team at{' '}
                          <a href="mailto:support@notex.com" className="underline">
                            support@notex.com
                          </a>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Code className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No Workspace</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Create a workspace first to get your widget code.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}