import React from 'react';
import { useUnifiedAuthFlow } from '@/hooks/useUnifiedAuthFlow';
import { useAuth } from '@/contexts/AuthContext';
import { useEmailConfirmation } from '@/hooks/useEmailConfirmation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AuthFlowGuardProps {
  children: React.ReactNode;
}

export const AuthFlowGuard: React.FC<AuthFlowGuardProps> = ({ children }) => {
  const { user } = useAuth();
  const { status, initializeUserFlow, refreshStatus } = useUnifiedAuthFlow();
  const { isConfirmed: isEmailConfirmed, isLoading: emailLoading, resendConfirmationEmail, refreshConfirmationStatus } = useEmailConfirmation();

  // Don't render guard if no user
  if (!user) {
    return <>{children}</>;
  }

  // Show loading state
  if (status.loading || emailLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Show email confirmation required
  if (!isEmailConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-xl">Email Verification Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              Please check your email and click the verification link to continue.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Why do I need to verify my email?</p>
                  <p>Email verification ensures account security and enables all platform features.</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={refreshConfirmationStatus}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Again
              </Button>
              <Button
                onClick={resendConfirmationEmail}
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show profile creation error
  if (!status.profileExists && status.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl">Setup Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              {status.error}
            </p>
            <Button
              onClick={initializeUserFlow}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show success state for trial initialization
  if (status.isInitialized && !status.trialInitialized) {
    console.log('⚠️ Trial not initialized, but user can proceed');
  }

  // All good, render children
  return <>{children}</>;
};