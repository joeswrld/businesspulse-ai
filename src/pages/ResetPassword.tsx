import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Loader2, Mail, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [isPasswordResetComplete, setIsPasswordResetComplete] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Check if user is returning from password reset link
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true') {
      setIsPasswordResetComplete(true);
    }
  }, [searchParams]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("🔐 Sending password reset email...");
      
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password?reset=true`,
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
      navigate("/login?reset=true");
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
    setPasswordResetSent(false);
    setIsPasswordResetComplete(false);
    navigate("/login");
  };

  // Password reset success view
  if (passwordResetSent) {
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
              <img src="/favicon.ico" alt="NoteX" className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-large">
            <CardHeader className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600 text-muted-foreground" />
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
              <img src="/favicon.ico" alt="NoteX" className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-large">
            <CardHeader className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6 text-primary dark:text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Set new password</h1>
              <p className="text-muted-foreground">
                Enter your new password below.
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handlePasswordResetComplete} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    New Password
                  </Label>
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

  // Initial password reset request view
  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Link 
            to="/login" 
            className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Sign In</span>
          </Link>
          <div className="flex items-center space-x-2">
            <img src="/favicon.ico" alt="NoteX" className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-large">
          <CardHeader className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mx-auto">
              <Mail className="h-6 w-6 text-primary dark:text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                />
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
                    Sending reset email...
                  </>
                ) : (
                  "Send reset email"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;