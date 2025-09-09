import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Crown, AlertTriangle } from 'lucide-react';
import { useUnifiedTrial } from '@/contexts/UnifiedTrialContext';
import { useNavigate } from 'react-router-dom';

interface NoteXTrialCountdownProps {
  variant?: 'card' | 'badge' | 'alert';
  showUpgradeButton?: boolean;
}

const NoteXTrialCountdown: React.FC<NoteXTrialCountdownProps> = ({ 
  variant = 'card',
  showUpgradeButton = true 
}) => {
  const { trialStatus, getDaysLeft, isTrialExpired } = useUnifiedTrial();
  const navigate = useNavigate();

  const daysLeft = getDaysLeft();
  const isExpired = isTrialExpired();

  if (trialStatus.plan === 'business' && trialStatus.isActive) {
    // Business plan user
    if (variant === 'badge') {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <Crown className="h-3 w-3 mr-1" />
          Business Plan
        </Badge>
      );
    }

    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">Business Plan</p>
                <p className="text-xs text-green-700">Unlimited access</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isExpired) {
    // Trial expired
    if (variant === 'badge') {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Trial Expired
        </Badge>
      );
    }

    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">Trial Expired</p>
                <p className="text-xs text-red-700">Upgrade to continue</p>
              </div>
            </div>
            {showUpgradeButton && (
              <Button 
                size="sm" 
                onClick={() => navigate('/billing')}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Crown className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active trial
  if (variant === 'badge') {
    return (
      <Badge variant="outline" className="border-amber-200 text-amber-800">
        <Clock className="h-3 w-3 mr-1" />
        {daysLeft} days left
      </Badge>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">Free Trial</p>
              <p className="text-xs text-amber-700">{daysLeft} days remaining</p>
            </div>
          </div>
          {showUpgradeButton && (
            <Button 
              size="sm" 
              onClick={() => navigate('/billing')}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Crown className="h-3 w-3 mr-1" />
              Upgrade
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NoteXTrialCountdown;