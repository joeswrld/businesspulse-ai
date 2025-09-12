import React from 'react';
import { Badge } from './badge';

interface FeedbackCounts {
  total: number;
  new: number;
  reviewed: number;
  resolved: number;
}

interface FeedbackBadgeGroupProps {
  counts: FeedbackCounts;
}

export const FeedbackBadgeGroup: React.FC<FeedbackBadgeGroupProps> = ({ counts }) => {
  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="text-xs">
        Total: {counts.total}
      </Badge>
      <Badge variant="destructive" className="text-xs">
        New: {counts.new}
      </Badge>
      <Badge variant="secondary" className="text-xs">
        Reviewed: {counts.reviewed}
      </Badge>
      <Badge variant="default" className="text-xs">
        Resolved: {counts.resolved}
      </Badge>
    </div>
  );
};