import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const EmailConfirmation = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        console.log('🔐 Starting email confirmation process...');
        
        // Get URL parameters
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for error parameters first
        if (errorParam) {
          console.error('❌ Email confirmation error from URL:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setStatus('error');
          return;
        }

        // Check if we have tokens
        if (!accessToken) {
          console.error('❌ No access token found in URL');
          setError('No confirmation token found. Please check your email and try again.');
          setStatus('error');
          return;
        }

        console.log('🔐 Setting session with tokens...');
        
        // Set the session using the tokens from the URL
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          console.error('❌ Error setting session:', sessionError);
          setError(sessionError.message);
          setStatus('error');
          return;
        }

        if (!data.session) {
          console.error('❌ No session created');
          setError('Failed to create session. Please try again.');
          setStatus('error');
          return;
        }

        console.log('✅ Email confirmation successful:', data.user?.email);
        
        // Show success message
        setStatus('success');
        
        // Show success toast
        toast({
          title: "Email confirmed!",
          description: "Your account has been verified successfully.",
        });

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);

      } catch (error) {
        console.error('❌ Email confirmation error:', error);
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
        setStatus('error');
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate, toast]);

  const handleRetry = () => {
    setStatus('loading');
    setError(null);
    // Retry the confirmation process
    window.location.reload();
  };

  const handleGoToLogin = () => {
    navigate('/auth');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-large">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-xl">Confirming your email...</CardTitle>
            <p className="text-muted-foreground">
              Please wait while we verify your email address.
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-large">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-600">Email Confirmation Failed</CardTitle>
            <p className="text-muted-foreground">
              {error || 'There was an error confirming your email address.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Common solutions:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Make sure you clicked the link from your most recent email</li>
                    <li>Check if the link has expired (links expire after 1 hour)</li>
                    <li>Try requesting a new confirmation email</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button onClick={handleRetry} variant="outline" className="flex-1">
                Try Again
              </Button>
              <Button onClick={handleGoToLogin} className="flex-1">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-large">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-xl text-green-600">Email Confirmed!</CardTitle>
          <p className="text-muted-foreground">
            Your email has been successfully verified. You can now access all features of NoteX.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium">Your 8-day free trial has started!</p>
                <p>You'll be redirected to your dashboard in a moment.</p>
              </div>
            </div>
          </div>
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirmation;