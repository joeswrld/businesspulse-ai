import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";


const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const { isLoading: subLoading } = useSubscriptionStatus();

  


  // Check if user is returning from password reset
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true') {
      toast({
        title: "Password reset successful!",
        description: "You can now sign in with your new password.",
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });

        if (error) throw error;

        // ✅ Access check after successful login
        const { data: accessData, error: accessError } = await supabase
            .rpc('check_user_access', { user_uuid: data.user?.id });

        if (accessError) {
            console.error('Access check error:', accessError);
            // Continue anyway if the RPC fails (network/db issues)
        } else if (accessData && accessData.length > 0) {
            const access = accessData[0];
            if (!access.has_access) {
                toast({
                    title: "Trial Expired",
                    description: "Your trial has ended. Upgrade to continue using NoteX.",
                    variant: "destructive"
                });
                navigate("/trial-expired");
                return;
            }
        }

        // Successful login feedback
        toast({
            title: "Welcome back!",
            description: "You've been successfully signed in.",
        });

        // Small delay to ensure auth state updates before redirect
        setTimeout(() => {
            navigate("/dashboard");
        }, 100);

    } catch (error: any) {
        console.error("❌ Sign in error:", error);

        let errorMessage = "An error occurred during sign in.";

        if (error.message.includes("Invalid login credentials")) {
            errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message.includes("Email not confirmed")) {
            errorMessage = "Please check your email and click the confirmation link before signing in.";
        } else if (error.message) {
            errorMessage = error.message;
        }

        toast({
            title: "Sign in failed",
            description: errorMessage,
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

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-primary-foreground" />
            <span>Back to Home</span>
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
              <Lock className="h-5 w-5 text-primary dark:text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to your NoteX account to continue
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
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
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </Label>
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
              </div>

              <Button 
                  type="submit" 
                  className="w-full" 
                  variant="hero" 
                  size="lg"
                 disabled={loading || subLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              <div className="text-center">
                <Link 
                  to="/reset-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-primary hover:underline font-medium"
                >
                  Start your free trial
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;