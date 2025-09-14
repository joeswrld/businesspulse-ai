import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw, Search, MessageSquare, Mail, Calendar, Filter } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface FeedbackEntry {
  id: string
  project_id: string
  email: string | null
  message: string
  created_at: string
}

const Feedback: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEmail, setFilterEmail] = useState('all')
  const [projectId, setProjectId] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadProjectId()
    }
  }, [user?.id])

  useEffect(() => {
    if (projectId) {
      loadFeedback()
    }
  }, [projectId])

  const loadProjectId = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_feedback_settings', { p_user_id: user?.id! })
      
      if (error) {
        console.error('Error loading project ID:', error)
        return
      }

      if (data && data.length > 0) {
        setProjectId(data[0].project_id)
      }
    } catch (error) {
      console.error('Error loading project ID:', error)
    }
  }

  const loadFeedback = async () => {
    if (!projectId) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading feedback:', error)
        toast({
          title: 'Error',
          description: 'Failed to load feedback entries',
          variant: 'destructive'
        })
        return
      }

      setFeedback(data || [])
    } catch (error) {
      console.error('Error loading feedback:', error)
      toast({
        title: 'Error',
        description: 'Failed to load feedback entries',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadFeedback()
    setRefreshing(false)
  }

  const filteredFeedback = feedback.filter(entry => {
    const matchesSearch = entry.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (entry.email && entry.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesEmailFilter = filterEmail === 'all' || 
                              (filterEmail === 'with_email' && entry.email) ||
                              (filterEmail === 'without_email' && !entry.email)
    
    return matchesSearch && matchesEmailFilter
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading feedback...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Feedback</h1>
            <p className="text-muted-foreground">
              View and manage feedback from your widget
            </p>
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Select value={filterEmail} onValueChange={setFilterEmail}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by email" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All feedback</SelectItem>
                  <SelectItem value="with_email">With email</SelectItem>
                  <SelectItem value="without_email">Without email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{feedback.length}</p>
                <p className="text-sm text-muted-foreground">Total Feedback</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {feedback.filter(f => f.email).length}
                </p>
                <p className="text-sm text-muted-foreground">With Email</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {feedback.filter(f => {
                    const today = new Date()
                    const feedbackDate = new Date(f.created_at)
                    return feedbackDate.toDateString() === today.toDateString()
                  }).length}
                </p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedback.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No feedback yet</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterEmail !== 'all' 
                  ? 'No feedback matches your current filters'
                  : 'Feedback from your widget will appear here'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredFeedback.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {entry.email ? (
                          <Badge variant="secondary" className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{entry.email}</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline">Anonymous</Badge>
                        )}
                        <Badge variant="outline" className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(entry.created_at)}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Project ID: {entry.project_id}
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">{entry.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default Feedback