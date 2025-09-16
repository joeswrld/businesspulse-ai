import React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

interface SentimentBadgeProps {
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  className?: string;
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = ({ sentiment, className }) => {
  if (!sentiment) {
    return (
      <Badge 
        variant="outline" 
        className={cn("text-gray-600 bg-gray-100 border-gray-300", className)}
      >
        Unknown
      </Badge>
    );
  }

  const getSentimentConfig = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
          label: 'Positive'
        };
      case 'negative':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
          label: 'Negative'
        };
      case 'neutral':
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
          label: 'Neutral'
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'text-gray-600 bg-gray-100 border-gray-300',
          label: 'Unknown'
        };
    }
  };

  const config = getSentimentConfig(sentiment);

  return (
    <Badge 
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
};