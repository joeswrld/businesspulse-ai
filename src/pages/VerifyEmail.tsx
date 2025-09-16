import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, CheckCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const VerifyEmail = () => {
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'success' | 'error' | 'pending'>('checking');
  const [email, setEmail] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get email and company name from navigation state
    if (location.state) {
      setEmail(location.state.email || '');
      setCompanyName(location.state.companyName || '');
    }

    // Check if user is coming from email confirmation link
    const checkEmailConfirmation = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setVerificationStatus('error');
          return;
        }

        if (data.session?.user?.email_confirmed_at) {
          // User is confirmed
          setVerificationStatus('success');
          toast({
            title: "Email verified successfully!",
            description: "Your account is now active and your 8-day free trial has begun.",
          });
        } else if (data.session?.user) {
          // User is logged in but not confirmed
          setVerificationStatus('pending');
        } else {
          // No session, user needs to check email
          setVerificationStatus('pending');
        }
      } catch (error) {
        console.error("Error checking email confirmation:", error);
        setVerificationStatus('error');
      } finally {
        setLoading(false);
      }
    };

    checkEmailConfirmation();
  }, [location.state, toast]);

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email address not found. Please try signing up again.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Verification email sent!",
        description: "Please check your email and click the confirmation link.",
      });
    } catch (error: any) {
      console.error("Error resending email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate("/login");
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex flex-col">
        <div className="p-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <Link 
              to="/" 
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center space-x-2">
              <img src="/favicon.ico" alt="NoteX" className="h-6 w-6" />
              <span className="font-semibold text-lg">NoteX</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-large">
            <CardContent className="text-center space-y-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Checking verification status...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center space-x-2">
            <img src="/favicon.ico" alt="NoteX" className="h-6 w-6" />
            <span className="font-semibold text-lg">NoteX</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-large">
          <CardHeader className="text-center space-y-4">
            {verificationStatus === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold">Email verified!</h1>
                <p className="text-muted-foreground">
                  Your account is now active and your 8-day free trial has begun.
                </p>
              </>
            )}

            {verificationStatus === 'pending' && (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold">Check your email</h1>
                <p className="text-muted-foreground">
                  We've sent a verification link to <strong>{email}</strong>
                </p>
              </>
            )}

            {verificationStatus === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold">Verification failed</h1>
                <p className="text-muted-foreground">
                  There was an error verifying your email. Please try again.
                </p>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {verificationStatus === 'success' && (
              <>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Welcome to NoteX{companyName && `, ${companyName}`}! You now have full access to all features.
                  </p>
                </div>
                <Button 
                  onClick={handleGoToDashboard}
                  className="w-full" 
                  variant="hero" 
                  size="lg"
                >
                  Go to Dashboard
                </Button>
              </>
            )}

            {verificationStatus === 'pending' && (
              <>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Click the link in your email to verify your account and start your free trial.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Didn't receive the email? Check your spam folder or try resending.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button 
                    onClick={handleResendEmail}
                    className="w-full" 
                    variant="outline"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      "Resend verification email"
                    )}
                  </Button>
                  <Button 
                    onClick={handleGoToLogin}
                    className="w-full" 
                    variant="ghost"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </>
            )}

            {verificationStatus === 'error' && (
              <>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Please try signing up again or contact support if the problem persists.
                  </p>
                </div>
                <div className="space-y-2">
                  <Button 
                    onClick={() => navigate("/signup")}
                    className="w-full" 
                    variant="hero"
                  >
                    Try Again
                  </Button>
                  <Button 
                    onClick={handleGoToLogin}
                    className="w-full" 
                    variant="ghost"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;