import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, Eye, CheckCircle } from 'lucide-react';

interface FeedbackBadgeProps {
  count: number;
  type: 'total' | 'new' | 'reviewed' | 'resolved';
  showIcon?: boolean;
  className?: string;
}

export const FeedbackBadge: React.FC<FeedbackBadgeProps> = ({ 
  count, 
  type, 
  showIcon = true, 
  className = '' 
}) => {
  const getBadgeConfig = () => {
    switch (type) {
      case 'total':
        return {
          variant: 'default' as const,
          icon: <MessageSquare className="h-3 w-3" />,
          text: 'Total'
        };
      case 'new':
        return {
          variant: 'secondary' as const,
          icon: <Clock className="h-3 w-3" />,
          text: 'New'
        };
      case 'reviewed':
        return {
          variant: 'default' as const,
          icon: <Eye className="h-3 w-3" />,
          text: 'Reviewed'
        };
      case 'resolved':
        return {
          variant: 'outline' as const,
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Resolved'
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: <MessageSquare className="h-3 w-3" />,
          text: 'Unknown'
        };
    }
  };

  const config = getBadgeConfig();

  if (count === 0) {
    return null;
  }

  return (
    <Badge 
      variant={config.variant} 
      className={`flex items-center space-x-1 ${className}`}
    >
      {showIcon && config.icon}
      <span className="font-medium">{count}</span>
      <span className="text-xs opacity-75">{config.text}</span>
    </Badge>
  );
};

interface FeedbackBadgeGroupProps {
  counts: {
    total: number;
    new: number;
    reviewed: number;
    resolved: number;
  };
  showLabels?: boolean;
  className?: string;
}

export const FeedbackBadgeGroup: React.FC<FeedbackBadgeGroupProps> = ({ 
  counts, 
  showLabels = true,
  className = '' 
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <FeedbackBadge count={counts.total} type="total" showIcon={showLabels} />
      <FeedbackBadge count={counts.new} type="new" showIcon={showLabels} />
      <FeedbackBadge count={counts.reviewed} type="reviewed" showIcon={showLabels} />
      <FeedbackBadge count={counts.resolved} type="resolved" showIcon={showLabels} />
    </div>
  );
};