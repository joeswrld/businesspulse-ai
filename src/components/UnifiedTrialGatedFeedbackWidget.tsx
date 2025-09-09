import React from 'react';
import { useUnifiedPlatformAccess } from '@/hooks/useUnifiedPlatformAccess';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Crown } from 'lucide-react';

interface UnifiedTrialGatedFeedbackWidgetProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

export default function UnifiedTrialGatedFeedbackWidget({ 
  children, 
  fallbackMessage = "Upgrade to Business to collect unlimited feedback"
}: UnifiedTrialGatedFeedbackWidgetProps) {
  const { canUseFeedback, isLocked, trialMessage, isNewUser } = useUnifiedPlatformAccess();

  // If user can use feedback, render the widget
  if (canUseFeedback) {
    return <>{children}</>;
  }

  // If user is locked, show upgrade message
  if (isLocked) {
    return (
      <Card className="p-6 text-center border-dashed border-2 border-gray-300 bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-3 bg-red-100 rounded-full">
            <Lock className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Feedback Collection Locked
            </h3>
            <p className="text-gray-600 mb-4">
              {fallbackMessage}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {trialMessage}
            </p>
          </div>
          <Button
            onClick={() => window.location.href = '/billing'}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Business
          </Button>
        </div>
      </Card>
    );
  }

  // If user is new, show welcome message
  if (isNewUser) {
    return (
      <Card className="p-6 text-center border-dashed border-2 border-blue-300 bg-blue-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Crown className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to NoteX!
            </h3>
            <p className="text-gray-600 mb-4">
              You're on a free trial. Start collecting feedback now!
            </p>
            <p className="text-sm text-blue-600 mb-4">
              {trialMessage}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Default fallback
  return (
    <Card className="p-6 text-center border-dashed border-2 border-gray-300 bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 bg-gray-100 rounded-full">
          <Lock className="h-6 w-6 text-gray-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600 mb-4">
            {fallbackMessage}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {trialMessage}
          </p>
        </div>
        <Button
          onClick={() => window.location.href = '/billing'}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade to Business
        </Button>
      </div>
    </Card>
  );
}