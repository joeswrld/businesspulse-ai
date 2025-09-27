import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw, Search, MessageSquare, Mail, Calendar, Filter, Star, ThumbsUp, ThumbsDown, Minus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface FeedbackEntry {
  id: string
  project_id: string
  form_type: 'customer_satisfaction' | 'product_feedback'
  message: string
  rating: number | null
  metadata: {
    email?: string
    page_url?: string
    user_agent?: string
    feedback_type?: string
    features?: string[]
  } | null
  created_at: string
}

interface Project {
  id: string
  project_id: string
  name: string
}

const Feedback: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFormType, setFilterFormType] = useState('all')
  const [filterRating, setFilterRating] = useState('all')
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    if (user?.id) {
      loadProject()
    }
  }, [user?.id])

  useEffect(() => {
    if (project?.id) {
      loadFeedback()
      
      // Set up real-time subscription for feedback updates
      const channel = supabase
        .channel('feedback-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feedback',
            filter: `project_id=eq.${project.id}`
          },
          (payload) => {
            console.log('Real-time feedback update:', payload)
            
            if (payload.eventType === 'INSERT') {
              setFeedback(prev => [payload.new as FeedbackEntry, ...prev])
              toast({
                title: 'New Feedback Received!',
                description: `New ${payload.new.form_type?.replace('_', ' ')} feedback received`,
              })
            } else if (payload.eventType === 'UPDATE') {
              setFeedback(prev => prev.map(item => 
                item.id === payload.new.id ? payload.new as FeedbackEntry : item
              ))
            } else if (payload.eventType === 'DELETE') {
              setFeedback(prev => prev.filter(item => item.id !== payload.old.id))
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [project?.id])

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_id, name')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error loading project:', error)
        toast({
          title: 'Error',
          description: 'Failed to load project information',
          variant: 'destructive'
        })
        return
      }

      if (data) {
        setProject(data)
      } else {
        toast({
          title: 'No Project Found',
          description: 'Please create a project first',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error loading project:', error)
    }
  }

  const loadFeedback = async () => {
    if (!project?.id) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', project.id)
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

      console.log('Loaded feedback:', data)
      setFeedback(data as FeedbackEntry[] || [])
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
                         (entry.metadata?.email && entry.metadata.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesFormType = filterFormType === 'all' || entry.form_type === filterFormType
    
    const matchesRating = filterRating === 'all' || 
                         (filterRating === 'high' && entry.rating && entry.rating >= 4) ||
                         (filterRating === 'medium' && entry.rating && entry.rating === 3) ||
                         (filterRating === 'low' && entry.rating && entry.rating <= 2) ||
                         (filterRating === 'no_rating' && !entry.rating)
    
    return matchesSearch && matchesFormType && matchesRating
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const renderRating = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400">-</span>
    
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating}/5</span>
      </div>
    )
  }

  const getFormTypeBadge = (formType: string) => {
    switch (formType) {
      case 'customer_satisfaction':
        return <Badge className="bg-blue-100 text-blue-800">Customer Satisfaction</Badge>
      case 'product_feedback':
        return <Badge className="bg-green-100 text-green-800">Product Feedback</Badge>
      default:
        return <Badge variant="outline">General</Badge>
    }
  }

  // Calculate stats
  const stats = {
    total: feedback.length,
    customerSatisfaction: feedback.filter(f => f.form_type === 'customer_satisfaction').length,
    productFeedback: feedback.filter(f => f.form_type === 'product_feedback').length,
    avgRating: feedback.filter(f => f.rating).length > 0 
      ? (feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.filter(f => f.rating).length).toFixed(1)
      : 'N/A'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feedback Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {project ? `Project: ${project.name || project.project_id}` : 'Monitor customer feedback in real-time'}
            </p>
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="lg">
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Total Feedback</p>
                <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <MessageSquare className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">Customer Satisfaction</p>
                <p className="text-3xl font-bold text-purple-900">{stats.customerSatisfaction}</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <ThumbsUp className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Product Feedback</p>
                <p className="text-3xl font-bold text-green-900">{stats.productFeedback}</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <ThumbsDown className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 mb-1">Average Rating</p>
                <p className="text-3xl font-bold text-yellow-900">{stats.avgRating}</p>
              </div>
              <div className="p-3 bg-yellow-200 rounded-full">
                <Star className="h-6 w-6 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search feedback messages or emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <Select value={filterFormType} onValueChange={setFilterFormType}>
              <SelectTrigger className="h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Filter by form type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Forms</SelectItem>
                <SelectItem value="customer_satisfaction">Customer Satisfaction</SelectItem>
                <SelectItem value="product_feedback">Product Feedback</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="high">High (4-5 stars)</SelectItem>
                <SelectItem value="medium">Medium (3 stars)</SelectItem>
                <SelectItem value="low">Low (1-2 stars)</SelectItem>
                <SelectItem value="no_rating">No Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Feedback Entries</span>
            <Badge variant="outline" className="ml-2">
              {filteredFeedback.length} of {feedback.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredFeedback.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No feedback found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterFormType !== 'all' || filterRating !== 'all'
                  ? 'No feedback matches your current filters. Try adjusting your search criteria.'
                  : 'Feedback from your widget will appear here once customers start sharing their thoughts.'
                }
              </p>
              {!searchTerm && filterFormType === 'all' && filterRating === 'all' && (
                <Button variant="outline" asChild>
                  <a href="/feedback-settings">Configure Widget</a>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold text-gray-900">Form Type</TableHead>
                    <TableHead className="font-semibold text-gray-900">Message</TableHead>
                    <TableHead className="font-semibold text-gray-900">Rating</TableHead>
                    <TableHead className="font-semibold text-gray-900">Email</TableHead>
                    <TableHead className="font-semibold text-gray-900">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedback.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        {getFormTypeBadge(entry.form_type)}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-900 line-clamp-3">
                            {entry.message}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {renderRating(entry.rating)}
                      </TableCell>
                      <TableCell>
                        {entry.metadata?.email ? (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{entry.metadata.email}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            Anonymous
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(entry.created_at)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Feedback
