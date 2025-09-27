import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Star, 
  TrendingUp, 
  TrendingDown,
  ThumbsUp,
  ThumbsDown,
  Minus,
  BarChart3,
  PieChart,
  Users,
  Clock
} from 'lucide-react';
import { FeedbackStats as Stats } from '@/utils/feedbackUtils';

interface FeedbackStatsProps {
  stats: Stats;
  className?: string;
}

export default function FeedbackStats({ stats, className }: FeedbackStatsProps) {
  const getRatingPercentage = (rating: number) => {
    const total = Object.values(stats.ratingDistribution).reduce((a, b) => a + b, 0);
    return total > 0 ? Math.round((stats.ratingDistribution[rating] / total) * 100) : 0;
  };

  const getSentimentPercentage = (sentiment: 'positive' | 'neutral' | 'negative') => {
    const total = stats.sentimentBreakdown.positive + stats.sentimentBreakdown.neutral + stats.sentimentBreakdown.negative;
    if (total === 0) return 0;
    
    switch (sentiment) {
      case 'positive':
        return Math.round((stats.sentimentBreakdown.positive / total) * 100);
      case 'neutral':
        return Math.round((stats.sentimentBreakdown.neutral / total) * 100);
      case 'negative':
        return Math.round((stats.sentimentBreakdown.negative / total) * 100);
      default:
        return 0;
    }
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {/* Total Feedback */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalFeedback}</div>
          <p className="text-xs text-muted-foreground">
            All time feedback count
          </p>
        </CardContent>
      </Card>

      {/* Average Rating */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            Out of 5 stars
          </p>
        </CardContent>
      </Card>

      {/* Customer Satisfaction */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Satisfaction Surveys</CardTitle>
          <ThumbsUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.customerSatisfactionCount}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalFeedback > 0 
              ? Math.round((stats.customerSatisfactionCount / stats.totalFeedback) * 100)
              : 0}% of total feedback
          </p>
        </CardContent>
      </Card>

      {/* Product Feedback */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Product Feedback</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.productFeedbackCount}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalFeedback > 0 
              ? Math.round((stats.productFeedbackCount / stats.totalFeedback) * 100)
              : 0}% of total feedback
          </p>
        </CardContent>
      </Card>

      {/* Rating Distribution */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>Rating Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 w-16">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{rating}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{stats.ratingDistribution[rating] || 0} ratings</span>
                    <span className="text-gray-500">{getRatingPercentage(rating)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getRatingPercentage(rating)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Breakdown */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Sentiment Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Positive */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ThumbsUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Positive</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{stats.sentimentBreakdown.positive}</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {getSentimentPercentage('positive')}%
                </Badge>
              </div>
            </div>

            {/* Neutral */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Minus className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Neutral</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{stats.sentimentBreakdown.neutral}</span>
                <Badge variant="secondary">
                  {getSentimentPercentage('neutral')}%
                </Badge>
              </div>
            </div>

            {/* Negative */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ThumbsDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Negative</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{stats.sentimentBreakdown.negative}</span>
                <Badge variant="destructive">
                  {getSentimentPercentage('negative')}%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}