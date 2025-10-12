import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  MessageSquare, 
  Star, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Archive,
  Filter,
  Search,
  Eye,
  Tag
} from 'lucide-react'
import { supabase, Feedback } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export const FeedbackPage = () => {
  const { user } = useAuth()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    if (user) {
      fetchFeedback()
    }
  }, [user])

  const fetchFeedback = async () => {
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

      const workspaceIds = workspaces.map(w => w.id)

      // Fetch all feedback
      const { data: feedbackData, error } = await supabase
        .from('feedback')
        .select('*')
        .in('workspace_id', workspaceIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      setFeedback(feedbackData || [])
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredFeedback = feedback.filter(item => {
    const matchesSearch = item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bug':
        return 'bg-red-100 text-red-800'
      case 'feature':
        return 'bg-blue-100 text-blue-800'
      case 'praise':
        return 'bg-green-100 text-green-800'
      case 'other':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600'
      case 'negative':
        return 'text-red-600'
      case 'neutral':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const updateFeedbackStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      setFeedback(prev => 
        prev.map(item => 
          item.id === id ? { ...item, status: newStatus as any } : item
        )
      )
    } catch (error) {
      console.error('Error updating feedback status:', error)
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
          <p className="mt-2 text-gray-600">
            Manage and respond to customer feedback
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Types</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature Request</option>
              <option value="praise">Praise</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Feedback List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {filteredFeedback.length} feedback item{filteredFeedback.length !== 1 ? 's' : ''}
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredFeedback.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Start collecting feedback from your customers'
                  }
                </p>
              </div>
            ) : (
              filteredFeedback.map((item) => (
                <div key={item.id} className="px-6 py-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                        
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                          {item.type}
                        </span>

                        {item.rating && (
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < item.rating! ? 'text-yellow-400' : 'text-gray-300'
                                }`}
                                fill={i < item.rating! ? 'currentColor' : 'none'}
                              />
                            ))}
                          </div>
                        )}

                        {item.sentiment && (
                          <span className={`text-sm font-medium ${getSentimentColor(item.sentiment)}`}>
                            {item.sentiment}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-900 mb-3">{item.content}</p>
                      
                      {item.ai_summary && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-700">
                            <strong>AI Summary:</strong> {item.ai_summary}
                          </p>
                        </div>
                      )}

                      {item.suggested_reply && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm text-gray-700">
                            <strong>Suggested Reply:</strong> {item.suggested_reply}
                          </p>
                        </div>
                      )}

                      {item.tags && item.tags.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(item.created_at).toLocaleDateString()} at{' '}
                        {new Date(item.created_at).toLocaleTimeString()}
                        {item.user_name && (
                          <span className="ml-4">
                            by {item.user_name}
                            {item.user_email && ` (${item.user_email})`}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex flex-col space-y-2">
                      <Link
                        to={`/feedback/${item.id}`}
                        className="text-primary-600 hover:text-primary-500"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      
                      <div className="flex space-x-1">
                        {item.status !== 'in_progress' && (
                          <button
                            onClick={() => updateFeedbackStatus(item.id, 'in_progress')}
                            className="text-yellow-600 hover:text-yellow-500"
                            title="Mark as in progress"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </button>
                        )}
                        
                        {item.status !== 'resolved' && (
                          <button
                            onClick={() => updateFeedbackStatus(item.id, 'resolved')}
                            className="text-green-600 hover:text-green-500"
                            title="Mark as resolved"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        
                        {item.status !== 'archived' && (
                          <button
                            onClick={() => updateFeedbackStatus(item.id, 'archived')}
                            className="text-gray-600 hover:text-gray-500"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}