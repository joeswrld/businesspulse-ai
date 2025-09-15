import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrialSystem } from '@/hooks/useTrialSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Crown, Clock } from 'lucide-react';

interface TrialEnforcementProps {
  children: React.ReactNode;
  requireActiveAccess?: boolean;
}

const TrialEnforcement: React.FC<TrialEnforcementProps> = ({ 
  children, 
  requireActiveAccess = true 
}) => {
  const navigate = useNavigate();
  const { 
    planType, 
    isTrialActive, 
    isTrialExpired, 
    daysRemaining, 
    loading, 
    checkTrialAccess,
    redirectToBilling 
  } = useTrialSystem();

  useEffect(() => {
    if (loading) return;

    if (requireActiveAccess && !checkTrialAccess()) {
      // Redirect to billing page if trial expired
      navigate('/billing');
    }
  }, [loading, requireActiveAccess, checkTrialAccess, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If trial is expired and we require active access, show paywall
  if (requireActiveAccess && isTrialExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Trial Expired</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Your free trial has ended. Upgrade to Business Plan to continue using all features.
            </p>
            <Button 
              onClick={redirectToBilling}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Business Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If trial is active, show warning banner
  if (isTrialActive && daysRemaining <= 3) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <Clock className="h-4 w-4" />
            <span className="font-medium">
              Your free trial ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            Upgrade now to continue using all features without interruption.
          </p>
          <Button 
            onClick={redirectToBilling}
            size="sm"
            className="mt-2 bg-yellow-600 hover:bg-yellow-700"
          >
            <Crown className="h-3 w-3 mr-1" />
            Upgrade Now
          </Button>
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
};

export default TrialEnforcement;