import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Star, 
  Clock, 
  AlertCircle,
  Plus,
  Eye,
  CheckCircle
} from 'lucide-react'
import { supabase, Feedback } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus'

export const DashboardPage = () => {
  const { user } = useAuth()
  const { isPaidActive } = useSubscriptionStatus()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalFeedback: 0,
    newFeedback: 0,
    resolvedFeedback: 0,
    averageRating: 0
  })

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

      // Fetch recent feedback
      const { data: feedbackData, error } = await supabase
        .from('feedback')
        .select('*')
        .in('workspace_id', workspaceIds)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      setFeedback(feedbackData || [])

      // Calculate stats
      const { data: allFeedback } = await supabase
        .from('feedback')
        .select('*')
        .in('workspace_id', workspaceIds)

      if (allFeedback) {
        const total = allFeedback.length
        const newCount = allFeedback.filter(f => f.status === 'new').length
        const resolvedCount = allFeedback.filter(f => f.status === 'resolved').length
        const ratings = allFeedback.filter(f => f.rating).map(f => f.rating!)
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

        setStats({
          totalFeedback: total,
          newFeedback: newCount,
          resolvedFeedback: resolvedCount,
          averageRating: Math.round(avgRating * 10) / 10
        })
      }
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setIsLoading(false)
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back! Here's what's happening with your feedback.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Feedback</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalFeedback}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">New Feedback</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.newFeedback}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Resolved</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.resolvedFeedback}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Rating</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/feedback"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <MessageSquare className="h-6 w-6 text-primary-600" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">View All Feedback</h3>
                  <p className="text-sm text-gray-500">See all customer feedback</p>
                </div>
              </div>
            </Link>

            <Link
              to="/insights"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <TrendingUp className="h-6 w-6 text-primary-600" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">AI Insights</h3>
                  <p className="text-sm text-gray-500">Get intelligent analysis</p>
                </div>
              </div>
            </Link>

            {isPaidActive && (
              <Link
                to="/team"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-primary-600" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">Team Management</h3>
                    <p className="text-sm text-gray-500">Invite team members</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Recent Feedback</h2>
              <Link
                to="/feedback"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                View all
              </Link>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {feedback.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start collecting feedback from your customers.
                </p>
                <div className="mt-6">
                  <Link
                    to="/settings/widget"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Setup Widget
                  </Link>
                </div>
              </div>
            ) : (
              feedback.map((item) => (
                <div key={item.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
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
                      
                      <p className="text-sm text-gray-900 mb-2">{item.content}</p>
                      
                      {item.ai_summary && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>AI Summary:</strong> {item.ai_summary}
                        </p>
                      )}
                      
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(item.created_at).toLocaleDateString()} at{' '}
                        {new Date(item.created_at).toLocaleTimeString()}
                        {item.user_name && (
                          <span className="ml-4">
                            by {item.user_name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <Link
                        to={`/feedback/${item.id}`}
                        className="text-primary-600 hover:text-primary-500"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
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