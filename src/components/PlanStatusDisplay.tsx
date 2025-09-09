import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Crown, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Timer,
  CalendarDays
} from 'lucide-react';
import { useUnifiedTrial } from '@/contexts/UnifiedTrialContext';

interface PlanStatusDisplayProps {
  showIcon?: boolean;
  showDays?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

export default function PlanStatusDisplay({ 
  showIcon = true, 
  showDays = true, 
  className = '',
  variant = 'default'
}: PlanStatusDisplayProps) {
  const { trialStatus, getTrialMessage, getDaysLeft, isTrialExpired } = useUnifiedTrial();

  if (trialStatus.loading) {
    return (
      <Badge variant="outline" className={`bg-gray-50 text-gray-600 border-gray-200 ${className}`}>
        {showIcon && <Clock className="h-3 w-3 mr-1 animate-pulse" />}
        Loading...
      </Badge>
    );
  }

  if (trialStatus.error) {
    return (
      <Badge variant="outline" className={`bg-red-50 text-red-600 border-red-200 ${className}`}>
        {showIcon && <XCircle className="h-3 w-3 mr-1" />}
        Error
      </Badge>
    );
  }

  const daysLeft = getDaysLeft();
  const isExpired = isTrialExpired();

  // Free Trial Status
  if (trialStatus.plan === 'free_trial') {
    if (isExpired) {
      return (
        <Badge variant="outline" className={`bg-red-50 text-red-700 border-red-200 ${className}`}>
          {showIcon && <XCircle className="h-3 w-3 mr-1" />}
          {variant === 'detailed' ? 'Free Trial - Expired' : 'Trial Expired'}
        </Badge>
      );
    }

    if (daysLeft === 8) {
      return (
        <Badge variant="outline" className={`bg-blue-50 text-blue-700 border-blue-200 ${className}`}>
          {showIcon && <Timer className="h-3 w-3 mr-1" />}
          {variant === 'detailed' ? 'Free Trial - Started' : 'Free Trial'}
          {showDays && variant === 'detailed' && ` (${daysLeft} days left)`}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className={`bg-blue-50 text-blue-700 border-blue-200 ${className}`}>
        {showIcon && <Clock className="h-3 w-3 mr-1" />}
        {variant === 'detailed' ? 'Free Trial' : 'Trial'}
        {showDays && ` - ${daysLeft} days left`}
      </Badge>
    );
  }

  // Business Plan Status
  if (trialStatus.plan === 'business') {
    if (!trialStatus.subscriptionActive) {
      return (
        <Badge variant="outline" className={`bg-orange-50 text-orange-700 border-orange-200 ${className}`}>
          {showIcon && <AlertTriangle className="h-3 w-3 mr-1" />}
          {variant === 'detailed' ? 'Business Plan - Inactive' : 'Business Inactive'}
        </Badge>
      );
    }

    if (daysLeft === 0) {
      return (
        <Badge variant="outline" className={`bg-green-50 text-green-700 border-green-200 ${className}`}>
          {showIcon && <Crown className="h-3 w-3 mr-1" />}
          {variant === 'detailed' ? 'Business Plan - Active' : 'Business Active'}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className={`bg-green-50 text-green-700 border-green-200 ${className}`}>
        {showIcon && <Crown className="h-3 w-3 mr-1" />}
        {variant === 'detailed' ? 'Business Plan' : 'Business'}
        {showDays && ` - ${daysLeft} days active`}
      </Badge>
    );
  }

  // Default fallback
  return (
    <Badge variant="outline" className={`bg-gray-50 text-gray-600 border-gray-200 ${className}`}>
      {showIcon && <Clock className="h-3 w-3 mr-1" />}
      Unknown Plan
    </Badge>
  );
}

// Compact version for headers/navigation
export function PlanStatusCompact({ className = '' }: { className?: string }) {
  return (
    <PlanStatusDisplay 
      variant="compact" 
      showDays={false} 
      className={className}
    />
  );
}

// Detailed version for billing page
export function PlanStatusDetailed({ className = '' }: { className?: string }) {
  return (
    <PlanStatusDisplay 
      variant="detailed" 
      showDays={true} 
      className={className}
    />
  );
}