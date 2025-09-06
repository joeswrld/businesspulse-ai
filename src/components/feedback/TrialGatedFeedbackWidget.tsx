import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Lock, 
  Crown, 
  AlertTriangle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useTrial } from '@/contexts/TrialContext';
import { useNavigate } from 'react-router-dom';

interface TrialGatedFeedbackWidgetProps {
  children: React.ReactNode;
  projectId?: string;
  className?: string;
}

const TrialGatedFeedbackWidget: React.FC<TrialGatedFeedbackWidgetProps> = ({ 
  children, 
  projectId,
  className = ''
}) => {
  const { checkAccess, isTrialExpired, trialStatus, getDaysLeft } = useTrial();
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // If user has access, render the actual feedback widget
  if (checkAccess()) {
    return <>{children}</>;
  }

  // Show trial expired state
  if (isTrialExpired()) {
    return (
      <div className={`${className}`}>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg mr-3">
                  <Lock className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-red-900">Feedback Locked</CardTitle>
                  <CardDescription className="text-red-700">
                    Your free trial has expired
                  </CardDescription>
                </div>
              </div>
              <Badge variant="destructive">Trial Expired</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200 bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Upgrade to the Business Plan to continue collecting feedback from your customers.
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={() => navigate('/billing')}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Business
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show trial active but limited state
  const daysLeft = getDaysLeft();
  
  return (
    <div className={`${className}`}>
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-blue-900">Feedback Active</CardTitle>
                <CardDescription className="text-blue-700">
                  Free trial - {daysLeft} days remaining
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              {daysLeft} days left
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Render the actual feedback widget */}
          {children}
          
          {/* Trial reminder */}
          <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm text-blue-800">
                  {daysLeft > 2 
                    ? `Your free trial ends in ${daysLeft} days. Upgrade to Business for unlimited access.`
                    : `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Upgrade now to avoid losing access!`
                  }
                </span>
              </div>
              <Button 
                size="sm"
                onClick={() => navigate('/billing')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Crown className="h-4 w-4 mr-1" />
                Upgrade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialGatedFeedbackWidget;