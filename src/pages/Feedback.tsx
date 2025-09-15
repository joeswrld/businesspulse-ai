import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SentimentBadge } from '@/components/ui/SentimentBadge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, RefreshCw, Search, MessageSquare, Mail, Calendar, Filter, TrendingUp, TrendingDown, Minus, Brain, CheckSquare, Square, Sparkles } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'

interface FeedbackEntry {
  id: string
  project_id: string
  email: string | null
  message: string
  sentiment: 'positive' | 'negative' | 'neutral' | null
  created_at: string
}

interface AIInsights {
  summary: string
  key_themes: string[]
  suggested_actions: string[]
  sentiment_breakdown: {
    positive: number
    negative: number
    neutral: number
  }
}

const Feedback: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEmail, setFilterEmail] = useState('all')
  const [filterSentiment, setFilterSentiment] = useState('all')
  const [projectId, setProjectId] = useState<string | null>(null)
  
  // AI Insights state
  const [selectedFeedbacks, setSelectedFeedbacks] = useState<Set<string>>(new Set())
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [insights, setInsights] = useState<AIInsights | null>(null)
  const [showInsights, setShowInsights] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadProjectId()
    }
  }, [user?.id])

  useEffect(() => {
    if (projectId) {
      loadFeedback()
      
      // Set up real-time subscription for feedback updates
      const channel = supabase
        .channel('feedback-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feedbacks',
            filter: `project_id=eq.${projectId}`
          },
          (payload) => {
            console.log('Feedback change received:', payload)
            loadFeedback() // Reload all feedback when any change occurs
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
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

  // AI Insights functions
  const handleFeedbackSelection = (feedbackId: string, checked: boolean) => {
    const newSelection = new Set(selectedFeedbacks)
    if (checked) {
      newSelection.add(feedbackId)
    } else {
      newSelection.delete(feedbackId)
    }
    setSelectedFeedbacks(newSelection)
  }

  const handleSelectAll = () => {
    if (selectedFeedbacks.size === filteredFeedback.length && filteredFeedback.length > 0) {
      setSelectedFeedbacks(new Set())
    } else {
      setSelectedFeedbacks(new Set(filteredFeedback.map(f => f.id)))
    }
  }

  const generateInsights = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Please log in to generate insights',
        variant: 'destructive'
      })
      return
    }

    if (selectedFeedbacks.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one feedback to analyze',
        variant: 'destructive'
      })
      return
    }

    try {
      setGeneratingInsights(true)
      
      const response = await fetch('https://xjbrqeqizpoqdjkiyqzt.supabase.co/functions/v1/generate-feedback-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          feedback_ids: Array.from(selectedFeedbacks),
          user_id: user.id
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate insights')
      }

      const result = await response.json()
      setInsights(result.analysis)
      setShowInsights(true)
      
      toast({
        title: 'Success',
        description: 'AI insights generated successfully!',
        variant: 'default'
      })
    } catch (error) {
      console.error('Error generating insights:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate insights. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setGeneratingInsights(false)
    }
  }

  const filteredFeedback = feedback.filter(entry => {
    const matchesSearch = entry.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (entry.email && entry.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesEmailFilter = filterEmail === 'all' || 
                              (filterEmail === 'with_email' && entry.email) ||
                              (filterEmail === 'without_email' && !entry.email)
    
    const matchesSentimentFilter = filterSentiment === 'all' || 
                                  (filterSentiment === 'positive' && entry.sentiment === 'positive') ||
                                  (filterSentiment === 'negative' && entry.sentiment === 'negative') ||
                                  (filterSentiment === 'neutral' && entry.sentiment === 'neutral') ||
                                  (filterSentiment === 'unknown' && !entry.sentiment)
    
    return matchesSearch && matchesEmailFilter && matchesSentimentFilter
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Calculate sentiment counts
  const sentimentCounts = {
    total: feedback.length,
    positive: feedback.filter(f => f.sentiment === 'positive').length,
    negative: feedback.filter(f => f.sentiment === 'negative').length,
    neutral: feedback.filter(f => f.sentiment === 'neutral').length,
    unknown: feedback.filter(f => !f.sentiment).length
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
            <h1 className="text-3xl font-bold text-gray-900">Feedback Management</h1>
            <p className="text-gray-600 mt-1">
              Monitor and analyze customer feedback with sentiment insights
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

      {/* Sentiment Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Total Feedback</p>
                <p className="text-3xl font-bold text-blue-900">{sentimentCounts.total}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <MessageSquare className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Positive</p>
                <p className="text-3xl font-bold text-green-900">{sentimentCounts.positive}</p>
                <p className="text-xs text-green-700">
                  {sentimentCounts.total > 0 ? Math.round((sentimentCounts.positive / sentimentCounts.total) * 100) : 0}%
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 mb-1">Negative</p>
                <p className="text-3xl font-bold text-red-900">{sentimentCounts.negative}</p>
                <p className="text-xs text-red-700">
                  {sentimentCounts.total > 0 ? Math.round((sentimentCounts.negative / sentimentCounts.total) * 100) : 0}%
                </p>
              </div>
              <div className="p-3 bg-red-200 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg border-0 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Neutral</p>
                <p className="text-3xl font-bold text-gray-900">{sentimentCounts.neutral}</p>
                <p className="text-xs text-gray-700">
                  {sentimentCounts.total > 0 ? Math.round((sentimentCounts.neutral / sentimentCounts.total) * 100) : 0}%
                </p>
              </div>
              <div className="p-3 bg-gray-200 rounded-full">
                <Minus className="h-6 w-6 text-gray-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section */}
      <Card className="rounded-xl shadow-lg border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <span>AI Insights Generator</span>
          </CardTitle>
          <CardDescription>
            Select feedback entries to generate AI-powered insights and analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleSelectAll}
                disabled={filteredFeedback.length === 0}
              >
                {selectedFeedbacks.size === filteredFeedback.length && filteredFeedback.length > 0 ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Select All
                  </>
                )}
              </Button>
              <span className="text-sm text-gray-600">
                {selectedFeedbacks.size} of {filteredFeedback.length} selected
              </span>
            </div>
            <Button
              onClick={generateInsights}
              disabled={selectedFeedbacks.size === 0 || generatingInsights}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generatingInsights ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>

          {/* AI Insights Results */}
          {insights && showInsights && (
            <div className="mt-6 p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span>AI Analysis Results</span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInsights(false)}
                >
                  Hide
                </Button>
              </div>
              
              {/* Summary */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Summary</h4>
                <p className="text-gray-700 text-sm">{insights.summary}</p>
              </div>

              {/* Key Themes */}
              {insights.key_themes && insights.key_themes.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Key Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {insights.key_themes.map((theme, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Actions */}
              {insights.suggested_actions && insights.suggested_actions.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Suggested Actions</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {insights.suggested_actions.map((action, index) => (
                      <li key={index} className="text-sm text-gray-700">{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sentiment Breakdown */}
              {insights.sentiment_breakdown && (
                <div>
                  <h4 className="font-medium mb-2">Sentiment Breakdown</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {insights.sentiment_breakdown.positive}%
                      </div>
                      <div className="text-sm text-gray-600">Positive</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-600">
                        {insights.sentiment_breakdown.neutral}%
                      </div>
                      <div className="text-sm text-gray-600">Neutral</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {insights.sentiment_breakdown.negative}%
                      </div>
                      <div className="text-sm text-gray-600">Negative</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
            
            <Select value={filterEmail} onValueChange={setFilterEmail}>
              <SelectTrigger className="h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Filter by email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All feedback</SelectItem>
                <SelectItem value="with_email">With email</SelectItem>
                <SelectItem value="without_email">Without email</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSentiment} onValueChange={setFilterSentiment}>
              <SelectTrigger className="h-11 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Filter by sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
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
                {searchTerm || filterEmail !== 'all' || filterSentiment !== 'all'
                  ? 'No feedback matches your current filters. Try adjusting your search criteria.'
                  : 'Feedback from your widget will appear here once customers start sharing their thoughts.'
                }
              </p>
              {!searchTerm && filterEmail === 'all' && filterSentiment === 'all' && (
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
                    <TableHead className="font-semibold text-gray-900 w-12">
                      <Checkbox
                        checked={selectedFeedbacks.size === filteredFeedback.length && filteredFeedback.length > 0}
                        onCheckedChange={handleSelectAll}
                        className="ml-2"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900">Message</TableHead>
                    <TableHead className="font-semibold text-gray-900">Email</TableHead>
                    <TableHead className="font-semibold text-gray-900">Sentiment</TableHead>
                    <TableHead className="font-semibold text-gray-900">Date</TableHead>
                    <TableHead className="font-semibold text-gray-900">Project ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedback.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedFeedbacks.has(entry.id)}
                          onCheckedChange={(checked) => 
                            handleFeedbackSelection(entry.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-900 line-clamp-3">
                            {entry.message}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.email ? (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{entry.email}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            Anonymous
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <SentimentBadge sentiment={entry.sentiment} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(entry.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {entry.project_id}
                        </code>
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
