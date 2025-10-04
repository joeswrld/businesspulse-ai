import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Zap, 
  CheckCircle, 
  ArrowRight, 
  Building2, 
  Users, 
  BarChart3,
  Shield,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const TrialExpired = () => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);

  const navigate = useNavigate();
  const { toast } = useToast();
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
  
        if (!user) {
          navigate("/login");
          return;
        }
  
        // ✅ Fetch user profile with access status
        const { data: profileData, error } = await supabase
          .rpc('get_user_profile_with_access', { user_uuid: user.id });
  
        if (error) {
          console.error("Error fetching profile:", error);
          toast({
            title: "Error",
            description: "Failed to load your account information.",
            variant: "destructive",
          });
          return;
        }
  
        if (profileData && profileData.length > 0) {
          const profile = profileData[0];
          setUserProfile(profile);
  
          // Initial trial days calculation
          if (profile.trial_end) {
            const now = new Date();
            const trialEnd = new Date(profile.trial_end);
            const diffTime = trialEnd.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setTrialDaysRemaining(Math.max(0, diffDays));
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast({
          title: "Error",
          description: "Failed to load your account information.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
  
    fetchUserProfile();
  }, [navigate, toast]);
  
  // --------------------
  // Trial countdown effect
  useEffect(() => {
    if (!userProfile?.trial_end) return;
  
    const interval = setInterval(() => {
      const now = new Date();
      const trialEnd = new Date(userProfile.trial_end);
      const diffTime = trialEnd.getTime() - now.getTime();
  
      if (diffTime <= 0) {
        clearInterval(interval);
        navigate("/billing"); // redirect when time is up
      } else {
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setTrialDaysRemaining(diffDays);
      }
    }, 1000 * 60); // update every minute
  
    return () => clearInterval(interval);
  }, [userProfile, navigate]);
  
  const handleUpgrade = () => {
    navigate("/billing");
  };
  

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-2">
            <img src="/favicon.ico" alt="NoteX" className="h-8 w-8" />
            <span className="font-bold text-xl">NoteX</span>
          </div>
          <Button 
            onClick={handleSignOut}
            variant="outline"
            size="sm"
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="h-10 w-10 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Your free trial has expired</h1>
          <p className="text-muted-foreground text-lg">
            {userProfile?.company_name && `Hi ${userProfile.company_name}, `}
            your 8-day free trial has ended. Upgrade to continue using NoteX.
          </p>
        </div>

        {/* Trial Status Card */}
        <Card className="mb-8 border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge variant="destructive" className="text-sm">
                  Trial Expired
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {trialDaysRemaining === 0 ? "Trial ended" : `${trialDaysRemaining} days remaining`}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {userProfile?.company_name || "Your company"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userProfile?.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                What you'll get with Pro
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Unlimited feedback collection</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Advanced analytics & insights</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Custom branding & themes</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Priority support</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">API access</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Business Features
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Team collaboration</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Advanced reporting</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">White-label options</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">SSO integration</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Custom integrations</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Card */}
        <Card className="mb-8 border-primary/20">
          <CardHeader className="text-center">
            <h2 className="text-2xl font-bold">Choose Your Plan</h2>
            <p className="text-muted-foreground">
              Start with Pro and scale as you grow
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-semibold">Pro</h3>
                  <div className="text-3xl font-bold mt-2">$29<span className="text-lg text-muted-foreground">/month</span></div>
                  <p className="text-sm text-muted-foreground mt-1">Perfect for growing businesses</p>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Unlimited feedback
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Advanced analytics
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Custom branding
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Priority support
                  </li>
                </ul>
                <Button 
                  onClick={handleUpgrade}
                  className="w-full"
                  variant="hero"
                >
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <div className="border rounded-lg p-6 border-primary">
                <div className="text-center mb-4">
                  <Badge className="mb-2">Most Popular</Badge>
                  <h3 className="text-xl font-semibold">Business</h3>
                  <div className="text-3xl font-bold mt-2">$99<span className="text-lg text-muted-foreground">/month</span></div>
                  <p className="text-sm text-muted-foreground mt-1">For teams and enterprises</p>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Everything in Pro
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Team collaboration
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Advanced reporting
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    White-label options
                  </li>
                </ul>
                <Button 
                  onClick={handleUpgrade}
                  className="w-full"
                  variant="hero"
                >
                  Upgrade to Business
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Need help choosing?</h3>
            <p className="text-muted-foreground mb-4">
              Our team is here to help you find the perfect plan for your needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link to="/help">Contact Support</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/integrations">View Integrations</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrialExpired;