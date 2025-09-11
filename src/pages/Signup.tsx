import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Loader2, Building2, User, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    companyName: "",
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("🔐 Creating account for email:", formData.email);
      
      // Validate required fields
      if (!formData.fullName.trim()) {
        throw new Error("Full name is required");
      }
      if (!formData.companyName.trim()) {
        throw new Error("Company name is required");
      }
      if (formData.password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const redirectUrl = `${window.location.origin}/verify-email`;
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.fullName.trim(),
            company_name: formData.companyName.trim() || 'Individual User',
          }
        }
      });

      console.log("🔐 Sign up result:", { data, error });

      if (error) {
        console.error("❌ Sign up error:", error);
        
        // Provide more specific error messages
        let errorMessage = error.message || "An error occurred during account creation.";
        
        if (error.message.includes("Database error saving new user")) {
          errorMessage = "There was a database error creating your account. Please try again or contact support if the issue persists.";
        } else if (error.message.includes("User already registered")) {
          errorMessage = "An account with this email already exists. Please sign in instead.";
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "Please enter a valid email address.";
        } else if (error.message.includes("Password should be at least")) {
          errorMessage = "Password must be at least 8 characters long.";
        }
        
        throw new Error(errorMessage);
      }

      console.log("✅ Sign up successful:", data.user?.email);

      toast({
        title: "Account created successfully!",
        description: "Please check your email to verify your account. Your 8-day free trial will begin after verification.",
      });

      // Navigate to email verification page
      navigate("/verify-email", { 
        state: { 
          email: formData.email,
          companyName: formData.companyName 
        } 
      });

    } catch (error: any) {
      console.error("❌ Sign up error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during account creation.",
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
          <CardHeader className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mx-auto">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Start your free trial</h1>
            <p className="text-muted-foreground">
              Create your NoteX account and get 8 days of full access
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Joseph Essien"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="NoteX Corporation"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Required for business accounts
                </p>
              </div>

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
                    placeholder="Create a strong password"
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
                    Creating account...
                  </>
                ) : (
                  "Start Free Trial"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;