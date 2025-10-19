import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Star, 
  MessageSquare, 
  Bug, 
  Clock, 
  Mail, 
  Trash2, 
  Eye,
  ThumbsUp,
  ThumbsDown,
  Minus
} from 'lucide-react';
import { formatFeedbackDate, getSentiment, getSentimentBadgeVariant, getRatingText } from '@/utils/feedbackUtils';
import { Feedback } from '@/utils/feedbackUtils';

interface FeedbackCardProps {
  feedback: Feedback;
  onDelete?: (id: string) => void;
  onView?: (feedback: Feedback) => void;
  showActions?: boolean;
  className?: string;
}

export default function FeedbackCard({ 
  feedback, 
  onDelete, 
  onView,
  showActions = true,
  className 
}: FeedbackCardProps) {
  const sentiment = getSentiment(feedback);
  const sentimentVariant = getSentimentBadgeVariant(sentiment);

  const getFormTypeIcon = () => {
    if (feedback.form_type === 'customer_satisfaction') {
      return <Star className="h-4 w-4" />;
    }
    return <Bug className="h-4 w-4" />;
  };

  const getFormTypeColor = () => {
    if (feedback.form_type === 'customer_satisfaction') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-blue-100 text-blue-800';
  };

  const getSentimentIcon = () => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Badge className={`${getFormTypeColor()} flex items-center space-x-1`}>
              {getFormTypeIcon()}
              <span>{feedback.form_type === 'customer_satisfaction' ? 'Satisfaction' : 'Product'}</span>
            </Badge>
            
            {feedback.rating && (
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{feedback.rating}</span>
                <span className="text-xs text-gray-500">({getRatingText(feedback.rating)})</span>
              </div>
            )}
            
            <Badge variant={sentimentVariant as any} className="flex items-center space-x-1">
              {getSentimentIcon()}
              <span className="capitalize">{sentiment}</span>
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{formatFeedbackDate(feedback.created_at)}</span>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
            {feedback.message}
          </p>
        </div>

        {feedback.metadata?.email && (
          <div className="flex items-center space-x-1 text-sm text-gray-500 mb-3">
            <Mail className="h-4 w-4" />
            <span>{feedback.metadata.email}</span>
          </div>
        )}

        {/* Additional metadata */}
        {feedback.metadata && (
          <div className="text-xs text-gray-400 mb-3">
            {feedback.metadata.feedback_type && (
              <span className="mr-3">Type: {String(feedback.metadata.feedback_type)}</span>
            )}
            {feedback.metadata.priority && (
              <span className="mr-3">Priority: {String(feedback.metadata.priority)}</span>
            )}
            {feedback.metadata.page_url && (
              <span className="mr-3">From: {new URL(feedback.metadata.page_url).hostname}</span>
            )}
          </div>
        )}

        {showActions && (
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center space-x-2">
              {onView && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(feedback)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              )}
            </div>
            
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(feedback.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}