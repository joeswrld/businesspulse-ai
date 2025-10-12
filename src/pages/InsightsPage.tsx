import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  MessageSquare, 
  Star, 
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react'
import { supabase, Feedback } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export const InsightsPage = () => {
  const { user } = useAuth()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [insights, setInsights] = useState({
    totalFeedback: 0,
    averageRating: 0,
    sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
    typeBreakdown: { bug: 0, feature: 0, praise: 0, other: 0 },
    statusBreakdown: { new: 0, in_progress: 0, resolved: 0, archived: 0 },
    topTags: [] as string[],
    recentTrends: [] as { date: string; count: number }[]
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

      // Fetch all feedback
      const { data: feedbackData, error } = await supabase
        .from('feedback')
        .select('*')
        .in('workspace_id', workspaceIds)
        .order('created_at', { ascending: false })

      if (error) throw error

      setFeedback(feedbackData || [])
      calculateInsights(feedbackData || [])
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateInsights = (feedbackData: Feedback[]) => {
    const total = feedbackData.length
    
    // Average rating
    const ratings = feedbackData.filter(f => f.rating).map(f => f.rating!)
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

    // Sentiment breakdown
    const sentimentBreakdown = feedbackData.reduce((acc, item) => {
      if (item.sentiment) {
        acc[item.sentiment] = (acc[item.sentiment] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    // Type breakdown
    const typeBreakdown = feedbackData.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Status breakdown
    const statusBreakdown = feedbackData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Top tags
    const allTags = feedbackData.flatMap(item => item.tags || [])
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const topTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag)

    // Recent trends (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentFeedback = feedbackData.filter(f => 
      new Date(f.created_at) >= sevenDaysAgo
    )
    
    const trends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const count = recentFeedback.filter(f => 
        f.created_at.startsWith(dateStr)
      ).length
      return { date: dateStr, count }
    }).reverse()

    setInsights({
      totalFeedback: total,
      averageRating: Math.round(avgRating * 10) / 10,
      sentimentBreakdown: {
        positive: sentimentBreakdown.positive || 0,
        neutral: sentimentBreakdown.neutral || 0,
        negative: sentimentBreakdown.negative || 0
      },
      typeBreakdown: {
        bug: typeBreakdown.bug || 0,
        feature: typeBreakdown.feature || 0,
        praise: typeBreakdown.praise || 0,
        other: typeBreakdown.other || 0
      },
      statusBreakdown: {
        new: statusBreakdown.new || 0,
        in_progress: statusBreakdown.in_progress || 0,
        resolved: statusBreakdown.resolved || 0,
        archived: statusBreakdown.archived || 0
      },
      topTags,
      recentTrends: trends
    })
  }

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0
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
          <h1 className="text-3xl font-bold text-gray-900">AI Insights</h1>
          <p className="mt-2 text-gray-600">
            Intelligent analysis of your customer feedback
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Feedback</p>
                <p className="text-2xl font-semibold text-gray-900">{insights.totalFeedback}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {insights.averageRating > 0 ? insights.averageRating.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Resolved Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {getPercentage(insights.statusBreakdown.resolved, insights.totalFeedback)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">This Week</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {insights.recentTrends.reduce((sum, day) => sum + day.count, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sentiment Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sentiment Analysis</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">Positive</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {insights.sentimentBreakdown.positive}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({getPercentage(insights.sentimentBreakdown.positive, insights.totalFeedback)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">Neutral</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {insights.sentimentBreakdown.neutral}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({getPercentage(insights.sentimentBreakdown.neutral, insights.totalFeedback)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">Negative</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {insights.sentimentBreakdown.negative}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({getPercentage(insights.sentimentBreakdown.negative, insights.totalFeedback)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Types */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Feedback Types</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">Bug Reports</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {insights.typeBreakdown.bug}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({getPercentage(insights.typeBreakdown.bug, insights.totalFeedback)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">Feature Requests</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {insights.typeBreakdown.feature}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({getPercentage(insights.typeBreakdown.feature, insights.totalFeedback)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">Praise</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {insights.typeBreakdown.praise}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({getPercentage(insights.typeBreakdown.praise, insights.totalFeedback)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium text-gray-700">Other</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {insights.typeBreakdown.other}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({getPercentage(insights.typeBreakdown.other, insights.totalFeedback)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-blue-500 mr-3" />
                  <span className="text-sm font-medium text-gray-700">New</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {insights.statusBreakdown.new}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-yellow-500 mr-3" />
                  <span className="text-sm font-medium text-gray-700">In Progress</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {insights.statusBreakdown.in_progress}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Resolved</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {insights.statusBreakdown.resolved}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 text-gray-500 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Archived</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {insights.statusBreakdown.archived}
                </span>
              </div>
            </div>
          </div>

          {/* Top Tags */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Tags</h3>
            {insights.topTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {insights.topTags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No tags available</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity (Last 7 Days)</h3>
          <div className="grid grid-cols-7 gap-4">
            {insights.recentTrends.map((day, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-gray-500 mb-2">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-sm font-medium text-gray-900">{day.count}</div>
                <div className="mt-1 h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-primary-500 rounded-full"
                    style={{
                      width: `${Math.max(10, (day.count / Math.max(...insights.recentTrends.map(d => d.count), 1)) * 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}