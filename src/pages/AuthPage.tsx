import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff, ArrowLeft, Loader2, Mail, CheckCircle, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useHCaptcha } from "@/hooks/useHCaptcha";
import { verifyHCaptchaToken, getHCaptchaErrorMessage } from "@/utils/hcaptcha";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [isPasswordResetComplete, setIsPasswordResetComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    companyName: "",
  });

  // hCaptcha configuration
  const HCAPTCHA_SITE_KEY = "79347ba8-9cbc-459e-bbaa-b98cb36040a6";
  
  // hCaptcha hooks for different forms
  const loginCaptcha = useHCaptcha({
    siteKey: HCAPTCHA_SITE_KEY,
    onVerify: (token) => {
      console.log('🔐 Login captcha verified');
    },
    onExpire: () => {
      console.log('🔐 Login captcha expired');
    },
    onError: (error) => {
      console.error('❌ Login captcha error:', error);
    },
  });

  const signupCaptcha = useHCaptcha({
    siteKey: HCAPTCHA_SITE_KEY,
    onVerify: (token) => {
      console.log('🔐 Signup captcha verified');
    },
    onExpire: () => {
      console.log('🔐 Signup captcha expired');
    },
    onError: (error) => {
      console.error('❌ Signup captcha error:', error);
    },
  });

  const passwordResetCaptcha = useHCaptcha({
    siteKey: HCAPTCHA_SITE_KEY,
    onVerify: (token) => {
      console.log('🔐 Password reset captcha verified');
    },
    onExpire: () => {
      console.log('🔐 Password reset captcha expired');
    },
    onError: (error) => {
      console.error('❌ Password reset captcha error:', error);
    },
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Check if user is returning from password reset
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true') {
      setIsPasswordResetComplete(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("🔐 Attempting authentication...");
      
      // Check hCaptcha verification
      const currentCaptcha = isLogin ? loginCaptcha : signupCaptcha;
      if (!currentCaptcha.isVerified || !currentCaptcha.token) {
        toast({
          title: "Captcha Required",
          description: "Please complete the captcha verification to continue.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verify hCaptcha token with backend
      console.log('🔐 Verifying hCaptcha token with backend...');
      const verificationResult = await verifyHCaptchaToken(currentCaptcha.token);
      
      if (!verificationResult.success) {
        console.error('❌ hCaptcha verification failed:', verificationResult.error);
        toast({
          title: "Captcha Verification Failed",
          description: verificationResult.error || getHCaptchaErrorMessage(verificationResult.errorCodes),
          variant: "destructive",
        });
        // Reset the captcha so user can try again
        currentCaptcha.reset();
        setLoading(false);
        return;
      }

      console.log('✅ hCaptcha verification successful');

      if (isLogin) {
        console.log("🔐 Signing in with email:", formData.email);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        console.log("🔐 Sign in result:", { data, error });

        if (error) {
          console.error("❌ Sign in error:", error);
          throw error;
        }

        console.log("✅ Sign in successful:", data.user?.email);
        
        toast({
          title: "Welcome back!",
          description: "You've been successfully signed in.",
        });
        
        // Add a small delay to ensure the auth state is updated
        setTimeout(() => {
          navigate("/dashboard");
        }, 100);
      } else {
        console.log("🔐 Creating account for email:", formData.email);
        
        const redirectUrl = `${window.location.origin}/`;
        
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              company_name: formData.companyName,
            }
          }
        });

        console.log("🔐 Sign up result:", { data, error });

        if (error) {
          console.error("❌ Sign up error:", error);
          throw error;
        }

        console.log("✅ Sign up successful:", data.user?.email);

        // Create user profile immediately after successful signup
        if (data.user) {
          console.log("🔧 Creating user profile...");
          
          try {
            const { data: profileResult, error: profileError } = await supabase.rpc('create_user_profile_safe', {
              user_uuid: data.user.id,
              user_email: data.user.email,
              first_name: formData.firstName || null,
              last_name: formData.lastName || null,
              company_name: formData.companyName || null
            });

            if (profileError) {
              console.error("❌ Profile creation failed:", profileError);
              toast({
                title: "Warning",
                description: "Account created but profile setup incomplete. Please contact support if you experience issues.",
                variant: "destructive",
              });
            } else {
              console.log("✅ Profile created successfully:", profileResult);
              toast({
                title: "Account created!",
                description: "Your account and profile have been set up successfully. Please check your email to verify your account.",
              });
            }
          } catch (profileError) {
            console.error("❌ Profile creation error:", profileError);
            toast({
              title: "Account created!",
              description: "Please check your email to verify your account. Your profile will be set up when you first sign in.",
            });
          }
        } else {
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account.",
          });
        }
      }
    } catch (error: any) {
      console.error("❌ Authentication error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("🔐 Sending password reset email...");
      
      // Check hCaptcha verification
      if (!passwordResetCaptcha.isVerified || !passwordResetCaptcha.token) {
        toast({
          title: "Captcha Required",
          description: "Please complete the captcha verification to continue.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verify hCaptcha token with backend
      console.log('🔐 Verifying hCaptcha token with backend...');
      const verificationResult = await verifyHCaptchaToken(passwordResetCaptcha.token);
      
      if (!verificationResult.success) {
        console.error('❌ hCaptcha verification failed:', verificationResult.error);
        toast({
          title: "Captcha Verification Failed",
          description: verificationResult.error || getHCaptchaErrorMessage(verificationResult.errorCodes),
          variant: "destructive",
        });
        // Reset the captcha so user can try again
        passwordResetCaptcha.reset();
        setLoading(false);
        return;
      }

      console.log('✅ hCaptcha verification successful');
      
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        console.error("❌ Password reset error:", error);
        throw error;
      }

      console.log("✅ Password reset email sent successfully");
      setPasswordResetSent(true);
      
      toast({
        title: "Password reset email sent!",
        description: "Check your email for a link to reset your password.",
      });
    } catch (error: any) {
      console.error("❌ Password reset error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while sending the reset email.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("🔐 Updating password...");
      
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) {
        console.error("❌ Password update error:", error);
        throw error;
      }

      console.log("✅ Password updated successfully");
      
      toast({
        title: "Password updated!",
        description: "Your password has been successfully updated. You can now sign in with your new password.",
      });

      // Reset form and go back to login
      setFormData(prev => ({ ...prev, password: "" }));
      resetToLogin();
    } catch (error: any) {
      console.error("❌ Password update error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating your password.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetToLogin = () => {
    setIsPasswordReset(false);
    setPasswordResetSent(false);
    setIsPasswordResetComplete(false);
    setIsLogin(true);
    // Reset captchas when switching modes
    loginCaptcha.reset();
    signupCaptcha.reset();
    passwordResetCaptcha.reset();
  };

  // Reset captchas when switching between login and signup
  const handleModeSwitch = () => {
    setIsLogin(!isLogin);
    // Reset captchas when switching modes
    loginCaptcha.reset();
    signupCaptcha.reset();
  };

  // Password reset success view
  if (passwordResetSent) {
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
              <img src="/favicon.ico" alt="Notex" />
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-large">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold">Check your email</h1>
              <p className="text-muted-foreground">
                We've sent a password reset link to <strong>{formData.email}</strong>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Click the link in your email to reset your password. The link will expire in 1 hour.
              </p>
              <Button 
                onClick={resetToLogin}
                className="w-full" 
                variant="outline"
              >
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Password reset form view
  if (isPasswordReset) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex flex-col">
        <div className="p-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button 
              onClick={resetToLogin}
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </button>
            <div className="flex items-center space-x-2">
              <img src="/favicon.ico" alt="Notex" />
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-large">
            <CardHeader className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mx-auto">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Reset your password</h1>
              <p className="text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Security Verification</Label>
                  <passwordResetCaptcha.HCaptchaComponent className="flex justify-center" />
                  {passwordResetCaptcha.error && (
                    <p className="text-sm text-red-500">{passwordResetCaptcha.error}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  variant="hero" 
                  size="lg"
                  disabled={loading || !passwordResetCaptcha.isVerified}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending reset email...
                    </>
                  ) : (
                    "Send reset email"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Password reset completion view
  if (isPasswordResetComplete) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex flex-col">
        <div className="p-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <button 
              onClick={resetToLogin}
              className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </button>
            <div className="flex items-center space-x-2">
              <img src="/favicon.ico" alt="Notex" />
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-large">
            <CardHeader className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Set new password</h1>
              <p className="text-muted-foreground">
                Enter your new password below.
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handlePasswordResetComplete} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters long
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  variant="hero" 
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating password...
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>
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
          <img src="/favicon.ico" alt="Notex" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-large">
          <CardHeader className="text-center space-y-2">
            <h1 className="text-2xl font-bold">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin 
                ? "Sign in to your NoteX account to continue" 
                : "Start your 8-day free trial today"
              }
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Joseph"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Essien"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company name (optional)</Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="NoteX Corporation"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange("companyName", e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">
                    Must be at least 8 characters long
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Security Verification</Label>
                {isLogin ? (
                  <loginCaptcha.HCaptchaComponent className="flex justify-center" />
                ) : (
                  <signupCaptcha.HCaptchaComponent className="flex justify-center" />
                )}
                {(isLogin ? loginCaptcha.error : signupCaptcha.error) && (
                  <p className="text-sm text-red-500">
                    {isLogin ? loginCaptcha.error : signupCaptcha.error}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                variant="hero" 
                size="lg"
                disabled={loading || !(isLogin ? loginCaptcha.isVerified : signupCaptcha.isVerified)}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Start Free Trial"}
                  </>
                )}
              </Button>

              {isLogin && (
                <div className="text-center">
                  <button 
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => setIsPasswordReset(true)}
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                {" "}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={handleModeSwitch}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>

            {!isLogin && (
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  By creating an account, you agree to our{" "}
                  <Link to="/terms-of-service" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy-policy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;