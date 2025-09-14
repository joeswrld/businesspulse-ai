import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw, Search, MessageSquare, Mail, Calendar } from 'lucide-react'
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
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user?.id) loadProjectId()
  }, [user?.id])

  useEffect(() => {
    if (projectId) {
      loadFeedback()
      listenForNewFeedback()
    }
    // cleanup subscription on unmount
    return () => {
      supabase.removeAllChannels()
    }
  }, [projectId])

  const loadProjectId = async () => {
    const { data, error } = await supabase.rpc('get_or_create_feedback_settings', { p_user_id: user?.id! })
    if (error) {
      console.error('Error loading project ID:', error)
      return
    }
    if (data && data.length > 0) setProjectId(data[0].project_id)
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

      if (error) throw error
      setFeedback(data || [])
    } catch (error) {
      console.error(error)
      toast({
        title: 'Error',
        description: 'Failed to load feedback entries',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const listenForNewFeedback = () => {
    if (!projectId) return
    const channel = supabase
      .channel('feedback-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feedback', filter: `project_id=eq.${projectId}` },
        (payload) => {
          const newFeedback = payload.new as FeedbackEntry
          setFeedback(prev => [newFeedback, ...prev])
          setUnreadCount(c => c + 1) // increment unread badge
        }
      )
      .subscribe()
    return channel
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadFeedback()
    setUnreadCount(0) // reset unread after manual refresh
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
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
            <p className="text-muted-foreground">View and manage feedback from your widget</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
          )}
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* ... keep your filters, stats, and feedback list UI unchanged ... */}
      {/* (no UI edits needed, only logic changed) */}

      <div className="space-y-4">
        {filteredFeedback.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No feedback yet</h3>
            </CardContent>
          </Card>
        ) : (
          filteredFeedback.map(entry => (
            <Card key={entry.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    {entry.email ? (
                      <Badge variant="secondary">{entry.email}</Badge>
                    ) : (
                      <Badge variant="outline">Anonymous</Badge>
                    )}
                    <Badge variant="outline">{formatDate(entry.created_at)}</Badge>
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
