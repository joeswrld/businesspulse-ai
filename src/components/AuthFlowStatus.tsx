import React from 'react';
import { useUnifiedAuthFlow } from '@/hooks/useUnifiedAuthFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export const AuthFlowStatus: React.FC = () => {
  const { status, initializeUserFlow, refreshStatus } = useUnifiedAuthFlow();

  const getStatusIcon = () => {
    if (status.loading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (status.error) return <XCircle className="h-4 w-4 text-red-500" />;
    if (status.isInitialized) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (status.loading) return 'Initializing...';
    if (status.error) return 'Error';
    if (status.isInitialized) return 'Ready';
    return 'Pending';
  };

  const getStatusColor = () => {
    if (status.loading) return 'bg-blue-100 text-blue-800';
    if (status.error) return 'bg-red-100 text-red-800';
    if (status.isInitialized) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Auth Flow Status</span>
          <Badge className={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Email Confirmed:</span>
            <Badge variant={status.isEmailConfirmed ? "default" : "secondary"}>
              {status.isEmailConfirmed ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Profile Exists:</span>
            <Badge variant={status.profileExists ? "default" : "secondary"}>
              {status.profileExists ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Trial Initialized:</span>
            <Badge variant={status.trialInitialized ? "default" : "secondary"}>
              {status.trialInitialized ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>

        {status.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{status.error}</p>
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStatus}
            disabled={status.loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={initializeUserFlow}
            disabled={status.loading}
          >
            Retry Setup
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};