import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Crown, 
  CheckCircle, 
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';
import { useTrial } from '@/contexts/TrialContext';
import TrialCountdown from '@/components/TrialCountdown';
import TrialGate from '@/components/TrialGate';

const TrialTest: React.FC = () => {
  const { 
    trialStatus, 
    refreshTrialStatus, 
    upgradeToBusiness, 
    checkAccess, 
    isTrialExpired,
    getDaysLeft 
  } = useTrial();

  const handleUpgrade = async () => {
    try {
      await upgradeToBusiness();
    } catch (error) {
      console.error('Upgrade failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Trial System Test Page</h1>
          <p className="text-gray-600">Test the free trial and subscription gating system</p>
        </div>

        {/* Trial Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Trial Status
            </CardTitle>
            <CardDescription>
              Current trial and subscription status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Has Access:</span>
                  <Badge variant={checkAccess() ? "default" : "destructive"}>
                    {checkAccess() ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Yes</>
                    ) : (
                      <><Lock className="h-3 w-3 mr-1" /> No</>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Plan:</span>
                  <Badge variant="outline">{trialStatus.plan}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Is Active:</span>
                  <Badge variant={trialStatus.isActive ? "default" : "secondary"}>
                    {trialStatus.isActive ? (
                      <><Unlock className="h-3 w-3 mr-1" /> Active</>
                    ) : (
                      <><Lock className="h-3 w-3 mr-1" /> Inactive</>
                    )}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Trial Expired:</span>
                  <Badge variant={isTrialExpired() ? "destructive" : "secondary"}>
                    {isTrialExpired() ? (
                      <><AlertTriangle className="h-3 w-3 mr-1" /> Expired</>
                    ) : (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Days Left:</span>
                  <Badge variant="outline">{getDaysLeft()}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Loading:</span>
                  <Badge variant={trialStatus.loading ? "default" : "secondary"}>
                    {trialStatus.loading ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </div>

            {trialStatus.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Error: {trialStatus.error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={refreshTrialStatus} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
              {!trialStatus.isActive && (
                <Button onClick={handleUpgrade} size="sm">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Business
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trial Countdown Components */}
        <Card>
          <CardHeader>
            <CardTitle>Trial Countdown Components</CardTitle>
            <CardDescription>
              Different variants of the trial countdown component
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Badge Variant:</h4>
              <TrialCountdown variant="badge" />
            </div>
            <div>
              <h4 className="font-medium mb-2">Alert Variant:</h4>
              <TrialCountdown variant="alert" />
            </div>
            <div>
              <h4 className="font-medium mb-2">Card Variant:</h4>
              <TrialCountdown variant="card" />
            </div>
          </CardContent>
        </Card>

        {/* Trial Gate Test */}
        <Card>
          <CardHeader>
            <CardTitle>Trial Gate Test</CardTitle>
            <CardDescription>
              Test the trial gate component with different scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium mb-2">Protected Content (should be gated):</h4>
              <TrialGate feature="This test feature">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800">🎉 This content is only visible to users with access!</p>
                </div>
              </TrialGate>
            </div>
          </CardContent>
        </Card>

        {/* Raw Trial Status Data */}
        <Card>
          <CardHeader>
            <CardTitle>Raw Trial Status Data</CardTitle>
            <CardDescription>
              Debug information about the trial status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(trialStatus, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrialTest;