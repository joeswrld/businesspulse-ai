import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Crown, AlertTriangle, Sparkles } from 'lucide-react';
import { useTrial } from '@/contexts/TrialContext';
import { useNavigate } from 'react-router-dom';

interface TrialCountdownProps {
  showUpgradeButton?: boolean;
  variant?: 'badge' | 'alert' | 'card';
  className?: string;
}

const TrialCountdown: React.FC<TrialCountdownProps> = ({ 
  showUpgradeButton = true,
  variant = 'badge',
  className = ''
}) => {
  const { trialStatus, isTrialExpired, getDaysLeft } = useTrial();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Calculate time left
  useEffect(() => {
    if (!trialStatus.trialEnd || isTrialExpired()) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const trialEnd = new Date(trialStatus.trialEnd).getTime();
      const difference = trialEnd - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [trialStatus.trialEnd, isTrialExpired]);

  // Don't show if user has active subscription
  if (trialStatus.isActive) {
    return null;
  }

  // Don't show if loading
  if (trialStatus.loading) {
    return null;
  }

  // Show expired state
  if (isTrialExpired()) {
    if (variant === 'badge') {
      return (
        <Badge variant="destructive" className={`${className}`}>
          <AlertTriangle className="h-3 w-3 mr-1" />
          Trial Expired
        </Badge>
      );
    }

    if (variant === 'alert') {
      return (
        <Alert className={`border-red-200 bg-red-50 ${className}`}>
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="flex items-center justify-between">
              <span>Your free trial has expired. Upgrade to Business to continue.</span>
              {showUpgradeButton && (
                <Button 
                  size="sm" 
                  onClick={() => navigate('/billing')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Crown className="h-4 w-4 mr-1" />
                  Upgrade
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h3 className="font-semibold text-red-900">Trial Expired</h3>
              <p className="text-sm text-red-700">Upgrade to Business to continue using all features.</p>
            </div>
          </div>
          {showUpgradeButton && (
            <Button 
              onClick={() => navigate('/billing')}
              className="bg-red-600 hover:bg-red-700"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show countdown
  const formatTime = (value: number) => value.toString().padStart(2, '0');

  if (variant === 'badge') {
    const daysLeft = getDaysLeft();
    if (daysLeft <= 0) return null;

    return (
      <Badge variant={daysLeft <= 2 ? "destructive" : "secondary"} className={`${className}`}>
        <Clock className="h-3 w-3 mr-1" />
        {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
      </Badge>
    );
  }

  if (variant === 'alert') {
    const daysLeft = getDaysLeft();
    if (daysLeft <= 0) return null;

    return (
      <Alert className={`${daysLeft <= 2 ? 'border-orange-200 bg-orange-50' : 'border-blue-200 bg-blue-50'} ${className}`}>
        <Clock className={`h-4 w-4 ${daysLeft <= 2 ? 'text-orange-600' : 'text-blue-600'}`} />
        <AlertDescription className={daysLeft <= 2 ? 'text-orange-800' : 'text-blue-800'}>
          <div className="flex items-center justify-between">
            <span>
              Your free trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. 
              {daysLeft <= 2 && ' Upgrade now to avoid losing access!'}
            </span>
            {showUpgradeButton && (
              <Button 
                size="sm" 
                onClick={() => navigate('/billing')}
                className={daysLeft <= 2 ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                <Crown className="h-4 w-4 mr-1" />
                Upgrade
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Card variant
  const daysLeft = getDaysLeft();
  if (daysLeft <= 0) return null;

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg mr-3">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">Free Trial Active</h3>
            <p className="text-sm text-blue-700">
              {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-900">
            {formatTime(timeLeft.days)}:{formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}
          </div>
          <div className="text-xs text-blue-600">days:hours:minutes</div>
        </div>
        {showUpgradeButton && (
          <Button 
            onClick={() => navigate('/billing')}
            className="ml-4 bg-blue-600 hover:bg-blue-700"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade
          </Button>
        )}
      </div>
    </div>
  );
};

export default TrialCountdown;