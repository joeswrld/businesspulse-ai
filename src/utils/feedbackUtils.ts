import { format, parseISO, isValid } from 'date-fns';

export interface Feedback {
  id: string;
  project_id: string;
  user_id: string | null;
  form_type: 'customer_satisfaction' | 'product_feedback';
  message: string;
  rating: number | null;
  metadata: {
    email?: string | null;
    page_url?: string | null;
    user_agent?: string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
}

export interface FeedbackFilters {
  formType?: 'customer_satisfaction' | 'product_feedback' | 'all';
  rating?: number | 'all';
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  searchQuery?: string;
}

export interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  customerSatisfactionCount: number;
  productFeedbackCount: number;
  ratingDistribution: { [key: number]: number };
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// Filter feedbacks based on criteria
export function filterFeedbacks(feedbacks: Feedback[], filters: FeedbackFilters): Feedback[] {
  let filtered = [...feedbacks];

  // Filter by form type
  if (filters.formType && filters.formType !== 'all') {
    filtered = filtered.filter(f => f.form_type === filters.formType);
  }

  // Filter by rating
  if (filters.rating && filters.rating !== 'all') {
    filtered = filtered.filter(f => f.rating === filters.rating);
  }

  // Filter by date range
  if (filters.dateRange?.start || filters.dateRange?.end) {
    filtered = filtered.filter(f => {
      const feedbackDate = parseISO(f.created_at);
      if (!isValid(feedbackDate)) return false;

      const startDate = filters.dateRange?.start;
      const endDate = filters.dateRange?.end;

      if (startDate && feedbackDate < startDate) return false;
      if (endDate && feedbackDate > endDate) return false;

      return true;
    });
  }

  // Filter by search query
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(f => 
      f.message.toLowerCase().includes(query) ||
      (f.metadata?.email && f.metadata.email.toLowerCase().includes(query))
    );
  }

  return filtered;
}

// Calculate feedback statistics
export function calculateFeedbackStats(feedbacks: Feedback[]): FeedbackStats {
  const totalFeedback = feedbacks.length;
  const customerSatisfactionCount = feedbacks.filter(f => f.form_type === 'customer_satisfaction').length;
  const productFeedbackCount = feedbacks.filter(f => f.form_type === 'product_feedback').length;

  // Calculate average rating
  const ratings = feedbacks.filter(f => f.rating).map(f => f.rating!);
  const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  // Rating distribution
  const ratingDistribution: { [key: number]: number } = {};
  for (let i = 1; i <= 5; i++) {
    ratingDistribution[i] = ratings.filter(r => r === i).length;
  }

  // Sentiment breakdown (based on ratings)
  const sentimentBreakdown = {
    positive: ratings.filter(r => r >= 4).length,
    neutral: ratings.filter(r => r === 3).length,
    negative: ratings.filter(r => r <= 2).length
  };

  return {
    totalFeedback,
    averageRating,
    customerSatisfactionCount,
    productFeedbackCount,
    ratingDistribution,
    sentimentBreakdown
  };
}

// Generate time series data for charts
export function generateTimeSeriesData(feedbacks: Feedback[], groupBy: 'day' | 'week' | 'month' = 'day') {
  const timeSeriesData: { [key: string]: number } = {};

  feedbacks.forEach(feedback => {
    const date = parseISO(feedback.created_at);
    if (!isValid(date)) return;

    let key: string;
    switch (groupBy) {
      case 'week':
        key = format(date, 'yyyy-\'W\'ww');
        break;
      case 'month':
        key = format(date, 'yyyy-MM');
        break;
      default: // day
        key = format(date, 'yyyy-MM-dd');
    }

    timeSeriesData[key] = (timeSeriesData[key] || 0) + 1;
  });

  return Object.entries(timeSeriesData)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Get sentiment from feedback
export function getSentiment(feedback: Feedback): 'positive' | 'negative' | 'neutral' {
  if (feedback.rating) {
    if (feedback.rating >= 4) return 'positive';
    if (feedback.rating <= 2) return 'negative';
    return 'neutral';
  }

  // Fallback to text analysis if no rating
  const positiveWords = [
    'great', 'good', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'satisfied',
    'perfect', 'awesome', 'outstanding', 'brilliant', 'superb', 'terrific', 'pleased', 'impressed', 'smooth',
    'fast', 'easy', 'intuitive', 'beautiful', 'clean', 'modern', 'helpful', 'supportive', 'responsive'
  ];

  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'annoyed', 'disappointed',
    'broken', 'slow', 'difficult', 'confusing', 'ugly', 'cluttered', 'buggy', 'crash', 'error', 'fail',
    'useless', 'waste', 'problem', 'issue', 'complaint', 'unhappy', 'dissatisfied', 'poor', 'weak'
  ];

  const messageLower = feedback.message.toLowerCase();
  const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
  const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

// Format feedback date
export function formatFeedbackDate(dateString: string): string {
  const date = parseISO(dateString);
  if (!isValid(date)) return 'Invalid date';
  
  return format(date, 'MMM dd, yyyy HH:mm');
}

// Get rating text
export function getRatingText(rating: number): string {
  switch (rating) {
    case 1: return 'Very Poor';
    case 2: return 'Poor';
    case 3: return 'Average';
    case 4: return 'Good';
    case 5: return 'Excellent';
    default: return '';
  }
}

// Get sentiment badge variant
export function getSentimentBadgeVariant(sentiment: 'positive' | 'negative' | 'neutral'): 'default' | 'destructive' | 'secondary' {
  switch (sentiment) {
    case 'positive': return 'default';
    case 'negative': return 'destructive';
    default: return 'secondary';
  }
}

// Export feedback to CSV
export function exportFeedbackToCSV(feedbacks: Feedback[]): string {
  const headers = ['Date', 'Type', 'Rating', 'Message', 'Email', 'Sentiment'];
  const rows = feedbacks.map(feedback => [
    formatFeedbackDate(feedback.created_at),
    feedback.form_type === 'customer_satisfaction' ? 'Satisfaction' : 'Product',
    feedback.rating || '',
    `"${feedback.message.replace(/"/g, '""')}"`,
    feedback.metadata?.email || '',
    getSentiment(feedback)
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Download CSV file
export function downloadCSV(csvContent: string, filename: string = 'feedback-export.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Paginate feedback
export function paginateFeedbacks(feedbacks: Feedback[], page: number, itemsPerPage: number) {
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  return {
    data: feedbacks.slice(startIndex, endIndex),
    totalPages: Math.ceil(feedbacks.length / itemsPerPage),
    currentPage: page,
    totalItems: feedbacks.length,
    hasNextPage: endIndex < feedbacks.length,
    hasPreviousPage: page > 1
  };
}

// Search feedback
export function searchFeedbacks(feedbacks: Feedback[], query: string): Feedback[] {
  if (!query.trim()) return feedbacks;

  const searchTerm = query.toLowerCase();
  return feedbacks.filter(feedback => 
    feedback.message.toLowerCase().includes(searchTerm) ||
    (feedback.metadata?.email && feedback.metadata.email.toLowerCase().includes(searchTerm)) ||
    feedback.form_type.toLowerCase().includes(searchTerm)
  );
}

// Get feedback insights
export function getFeedbackInsights(feedbacks: Feedback[]) {
  const stats = calculateFeedbackStats(feedbacks);
  const insights: string[] = [];

  if (stats.totalFeedback === 0) {
    insights.push('No feedback received yet. Start collecting feedback to gain insights.');
    return insights;
  }

  // Rating insights
  if (stats.averageRating > 0) {
    if (stats.averageRating >= 4) {
      insights.push('Great! Your average rating is high, indicating satisfied customers.');
    } else if (stats.averageRating <= 2) {
      insights.push('Your average rating is low. Consider addressing common issues mentioned in feedback.');
    } else {
      insights.push('Your average rating is moderate. There\'s room for improvement.');
    }
  }

  // Volume insights
  if (stats.customerSatisfactionCount > stats.productFeedbackCount) {
    insights.push('You\'re receiving more satisfaction surveys than product feedback. Consider promoting product feedback forms.');
  } else if (stats.productFeedbackCount > stats.customerSatisfactionCount) {
    insights.push('You\'re receiving more product feedback than satisfaction surveys. Consider adding satisfaction surveys.');
  }

  // Sentiment insights
  const totalWithSentiment = stats.sentimentBreakdown.positive + stats.sentimentBreakdown.neutral + stats.sentimentBreakdown.negative;
  if (totalWithSentiment > 0) {
    const positivePercentage = (stats.sentimentBreakdown.positive / totalWithSentiment) * 100;
    if (positivePercentage >= 70) {
      insights.push('Excellent! Over 70% of feedback is positive.');
    } else if (positivePercentage <= 30) {
      insights.push('Less than 30% of feedback is positive. Consider reviewing common complaints.');
    }
  }

  return insights;
}