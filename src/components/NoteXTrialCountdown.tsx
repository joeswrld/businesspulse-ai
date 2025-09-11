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

  // UNLOCKED PLATFORM: Always show unlocked status
  if (variant === 'badge') {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        <Crown className="h-3 w-3 mr-1" />
        Unlocked Platform
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
              <p className="text-sm font-medium text-green-900">Unlocked Platform</p>
              <p className="text-xs text-green-700">All features accessible</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // UNLOCKED PLATFORM: Never show expired or trial states
  // All the trial/expired logic is disabled for unlocked platform
};

export default NoteXTrialCountdown;