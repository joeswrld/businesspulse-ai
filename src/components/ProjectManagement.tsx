import React, { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Plus, 
  Copy, 
  Settings, 
  ExternalLink, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Loader2,
  Code,
  Eye
} from 'lucide-react'
import { useUserAccess } from './RouteProtection'

interface Project {
  id: string
  project_id: string
  name: string
  settings: any
  is_active: boolean
  created_at: string
}

export const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProject, setNewProject] = useState({
    name: '',
    project_id: ''
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { userAccess } = useUserAccess()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
        return
      }

      setProjects(data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const generateProjectId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const validateProjectId = (projectId: string) => {
    return /^[a-z0-9\-]{4,30}$/.test(projectId)
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    setSuccess('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        return
      }

      if (!userAccess?.has_access) {
        setError('You need an active subscription to create projects')
        return
      }

      // Validate inputs
      if (!newProject.name.trim()) {
        setError('Project name is required')
        return
      }

      if (!newProject.project_id.trim()) {
        setError('Project ID is required')
        return
      }

      if (!validateProjectId(newProject.project_id)) {
        setError('Project ID must be 4-30 characters, lowercase letters, numbers, and hyphens only')
        return
      }

      // Check if project ID already exists
      const { data: existingProject, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('project_id', newProject.project_id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        setError('Error checking project ID availability')
        return
      }

      if (existingProject) {
        setError('Project ID already taken. Please choose a different one.')
        return
      }

      // Create project
      const { data, error: createError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          project_id: newProject.project_id,
          name: newProject.name.trim(),
          settings: {
            theme: 'light',
            primaryColor: '#3b82f6',
            textColor: '#1f2937',
            backgroundColor: '#ffffff',
            title: 'Share Your Feedback',
            placeholder: 'Tell us what you think...',
            submitText: 'Submit',
            thankYouMessage: 'Thank you for your feedback!',
            position: 'bottom-right',
            showEmailField: true,
            requireEmail: false,
            showLogo: false,
            companyName: newProject.name.trim(),
            allowFileUpload: false,
            maxFileSize: 5,
            allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf'],
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            autoOpen: false,
            autoOpenDelay: 5000,
            closeOnSubmit: true,
            trackEvents: true
          }
        })
        .select()
        .single()

      if (createError) {
        if (createError.code === '23505') {
          setError('Project ID already taken. Please choose a different one.')
        } else {
          setError(createError.message)
        }
        return
      }

      setSuccess('Project created successfully!')
      setNewProject({ name: '', project_id: '' })
      setShowCreateForm(false)
      await fetchProjects()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) {
        setError(error.message)
        return
      }

      setSuccess('Project deleted successfully!')
      await fetchProjects()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      setError('Failed to copy to clipboard')
    }
  }

  const getEmbedCode = (projectId: string) => {
    return `<script src="https://notex.com.ng/feedback-widget.js" data-project-id="${projectId}"></script>`
  }

  const getPreviewUrl = (projectId: string) => {
    return `https://notex.com.ng/widget-preview?project_id=${projectId}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Widget Settings</h1>
          <p className="text-gray-600 mt-2">Manage your feedback widgets and embed codes</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {!userAccess?.has_access && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertDescription className="text-orange-800">
              You need an active subscription to create and manage projects. Upgrade to Business Plan to continue.
            </AlertDescription>
          </Alert>
        )}

        {/* Create Project Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={!userAccess?.has_access}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Project
          </Button>
        </div>

        {/* Create Project Form */}
        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Project</CardTitle>
              <CardDescription>Create a new feedback widget project</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    type="text"
                    placeholder="Enter project name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectId">Project ID</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="projectId"
                      type="text"
                      placeholder="Enter unique project ID"
                      value={newProject.project_id}
                      onChange={(e) => setNewProject({ ...newProject, project_id: e.target.value.toLowerCase() })}
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewProject({ ...newProject, project_id: generateProjectId() })}
                    >
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    4-30 characters, lowercase letters, numbers, and hyphens only
                  </p>
                </div>

                <div className="flex space-x-2">
                  <Button
                    type="submit"
                    disabled={creating}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Project
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewProject({ name: '', project_id: '' })
                      setError('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Badge variant={project.is_active ? "default" : "secondary"}>
                    {project.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription>ID: {project.project_id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Embed Code</Label>
                  <div className="flex space-x-2">
                    <Input
                      value={getEmbedCode(project.project_id)}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(getEmbedCode(project.project_id), project.id)}
                    >
                      {copiedId === project.id ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getPreviewUrl(project.project_id), '_blank')}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {/* TODO: Open settings modal */}}
                  >
                    <Settings className="mr-1 h-3 w-3" />
                    Settings
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteProject(project.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>

                <div className="text-xs text-gray-500">
                  Created: {new Date(project.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {projects.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first project to start collecting feedback
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                disabled={!userAccess?.has_access}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}