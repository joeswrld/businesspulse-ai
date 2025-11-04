import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, Loader2, Building2, User, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import SEO from "@/components/SEO";

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
      // Trim inputs
      const fullName = formData.fullName.trim();
      const email = formData.email.trim().toLowerCase();
      const password = formData.password;
      const companyName = formData.companyName.trim() || "Individual User";
  
      // Frontend validations
      if (!fullName) throw new Error("Full name is required");
      if (!companyName) throw new Error("Company name is required");
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error("Please enter a valid email address");
      if (password.length < 8) throw new Error("Password must be at least 8 characters long");
  
      // Trial calculation
      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + 8 * 24 * 60 * 60 * 1000);
      const redirectUrl = `${window.location.origin}/verify-email`;
  
      // Sign up user - Let Supabase triggers handle profile creation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            company_name: companyName,
            trial_start: trialStart.toISOString(),
            trial_end: trialEnd.toISOString(),
            subscription_status: "trial",
          },
        },
      });
  
      if (error) {
        console.error("Signup error:", error);
        throw new Error(error.message || "Failed to create account");
      }

      if (!data.user) {
        throw new Error("Account created but user data is missing");
      }
  
      // Wait a moment for triggers to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify billing profile was created (optional check)
      const { data: billingCheck } = await supabase
        .from("billing_profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (!billingCheck) {
        console.warn("Billing profile not found, creating manually...");
        // Fallback: Create billing profile if trigger failed
        const { error: billingError } = await supabase
          .from("billing_profiles")
          .insert({
            id: data.user.id,
            plan: "trial",
            trial_ends_at: trialEnd.toISOString(),
            subscription_status: "trial",
          });

        if (billingError) {
          console.error("Billing profile creation failed:", billingError);
        }
      }
  
      // Show success toast
      toast({
        title: "Account created successfully!",
        description: "Check your email to verify your account. Your 8-day trial begins after verification.",
      });
  
      // Navigate to email verification page
      navigate("/verify-email", { state: { email, companyName } });
  
    } catch (err: any) {
      console.error("Signup error:", err);
      toast({
        title: "Failed to create account",
        description: err.message || "Please try again or contact support if the issue persists.",
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
    <>
      <SEO
        title="Sign Up for NoteX - Start Your Free Trial Today"
        description="Create your free NoteX account and transform customer feedback into actionable insights. Get started with AI-powered analytics in minutes. No credit card required."
        keywords="notex signup, free trial feedback analytics, customer insights signup, ai analytics registration"
        url="/signup"
      />
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-large">
          <CardHeader className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mx-auto">
              <Building2 className="h-6 w-6 text-primary dark:text-primary-foreground" />
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
    </>
  );
};

export default Signup;