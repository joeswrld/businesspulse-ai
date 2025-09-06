import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Lock, 
  Crown, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useTrial } from '@/contexts/TrialContext';
import { useNavigate } from 'react-router-dom';

interface TrialGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradeButton?: boolean;
  feature?: string;
}

const TrialGate: React.FC<TrialGateProps> = ({ 
  children, 
  fallback, 
  showUpgradeButton = true,
  feature 
}) => {
  const { checkAccess, isTrialExpired, getTrialMessage, getDaysLeft, trialStatus } = useTrial();
  const navigate = useNavigate();

  // If user has access, render children
  if (checkAccess()) {
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show trial expired message
  if (isTrialExpired()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">Trial Expired</CardTitle>
            <CardDescription className="text-red-700">
              {feature ? `${feature} is locked` : 'Access to this feature is locked'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Your free trial has ended. Upgrade to the Business Plan to continue using all features.
              </AlertDescription>
            </Alert>
            
            {showUpgradeButton && (
              <Button 
                onClick={() => navigate('/billing')}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
                size="lg"
              >
                <Crown className="h-5 w-5 mr-2" />
                Upgrade to Business
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (trialStatus.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (trialStatus.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">Error</CardTitle>
            <CardDescription className="text-red-700">
              {trialStatus.error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default locked state
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-gray-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Access Restricted</CardTitle>
          <CardDescription className="text-gray-700">
            {getTrialMessage()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showUpgradeButton && (
            <Button 
              onClick={() => navigate('/billing')}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
              size="lg"
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Business
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialGate;