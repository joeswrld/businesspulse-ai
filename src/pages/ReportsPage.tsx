import { useState, useEffect } from 'react'
import { 
  Download, 
  FileText, 
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp
} from 'lucide-react'
import { supabase, Feedback } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export const ReportsPage = () => {
  const { user } = useAuth()
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7d')
  const [reportType, setReportType] = useState('summary')

  useEffect(() => {
    if (user) {
      fetchFeedback()
    }
  }, [user, dateRange])

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

      // Calculate date filter
      const now = new Date()
      let startDate = new Date()
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
        case '90d':
          startDate.setDate(now.getDate() - 90)
          break
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1)
          break
        default:
          startDate.setDate(now.getDate() - 7)
      }

      // Fetch feedback within date range
      const { data: feedbackData, error } = await supabase
        .from('feedback')
        .select('*')
        .in('workspace_id', workspaceIds)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      setFeedback(feedbackData || [])
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateReport = () => {
    const reportData = {
      dateRange,
      totalFeedback: feedback.length,
      averageRating: feedback.filter(f => f.rating).length > 0 
        ? feedback.filter(f => f.rating).reduce((sum, f) => sum + f.rating!, 0) / feedback.filter(f => f.rating).length
        : 0,
      sentimentBreakdown: feedback.reduce((acc, item) => {
        if (item.sentiment) {
          acc[item.sentiment] = (acc[item.sentiment] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>),
      typeBreakdown: feedback.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      statusBreakdown: feedback.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      topTags: (() => {
        const allTags = feedback.flatMap(item => item.tags || [])
        const tagCounts = allTags.reduce((acc, tag) => {
          acc[tag] = (acc[tag] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        return Object.entries(tagCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([tag, count]) => ({ tag, count }))
      })(),
      feedback: feedback.map(item => ({
        id: item.id,
        content: item.content,
        rating: item.rating,
        type: item.type,
        sentiment: item.sentiment,
        status: item.status,
        created_at: item.created_at,
        user_name: item.user_name,
        user_email: item.user_email
      }))
    }

    return reportData
  }

  const exportToCSV = () => {
    const reportData = generateReport()
    const csvContent = [
      ['Date', 'Content', 'Rating', 'Type', 'Sentiment', 'Status', 'User Name', 'User Email'],
      ...reportData.feedback.map(item => [
        new Date(item.created_at).toLocaleDateString(),
        `"${item.content.replace(/"/g, '""')}"`,
        item.rating || '',
        item.type,
        item.sentiment || '',
        item.status,
        item.user_name || '',
        item.user_email || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notex-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToJSON = () => {
    const reportData = generateReport()
    const jsonContent = JSON.stringify(reportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `notex-report-${dateRange}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const reportData = generateReport()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-2 text-gray-600">
            Generate and export detailed reports of your feedback data
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Report</option>
                <option value="sentiment">Sentiment Analysis</option>
                <option value="trends">Trend Analysis</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchFeedback}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Filter className="h-4 w-4 inline mr-2" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Export Report</h3>
          <div className="flex space-x-4">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            
            <button
              onClick={exportToJSON}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export JSON
            </button>
          </div>
        </div>

        {/* Report Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Feedback</p>
                <p className="text-2xl font-semibold text-gray-900">{reportData.totalFeedback}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {reportData.averageRating > 0 ? reportData.averageRating.toFixed(1) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <PieChart className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Resolved</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {reportData.statusBreakdown.resolved || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Date Range</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dateRange.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Breakdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sentiment Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sentiment Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(reportData.sentimentBreakdown).map(([sentiment, count]) => (
                <div key={sentiment} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      sentiment === 'positive' ? 'bg-green-500' :
                      sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">{sentiment}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({Math.round((count / reportData.totalFeedback) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Type Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Type Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(reportData.typeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      type === 'bug' ? 'bg-red-500' :
                      type === 'feature' ? 'bg-blue-500' :
                      type === 'praise' ? 'bg-green-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({Math.round((count / reportData.totalFeedback) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Tags */}
        {reportData.topTags.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Tags</h3>
            <div className="flex flex-wrap gap-2">
              {reportData.topTags.map(({ tag, count }, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                >
                  {tag} ({count})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}