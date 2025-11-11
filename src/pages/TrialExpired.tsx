import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  Loader2,
  Sparkles,
  MessageSquare,
  Shield,
  HelpCircle,
  Moon,
  Sun
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const TrialExpired = () => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
  
        if (!user) {
          navigate("/login");
          return;
        }
  
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
          setUserProfile(profileData[0]);
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

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

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
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10  rounded-lg flex items-center justify-center">
                
              <img src="/favicon.ico" alt="NoteX" className="h-8 w-8" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900 dark:text-gray-100">NoteX</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI-Powered Feedback Intelligence for Modern Teams</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleDarkMode}
                variant="ghost"
                size="sm"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button 
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 dark:bg-blue-950 rounded-full mb-6 animate-pulse">
            <Clock className="h-10 w-10 text-primary" />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Your 8-Day Trial Has Ended
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
            Upgrade now to unlock full access to NoteX
          </p>
          {userProfile?.company_name && (
            <p className="text-lg text-gray-500 dark:text-gray-500">
              Welcome back, {userProfile.company_name}
            </p>
          )}
        </div>
      </section>

      {/* Main Pricing Card */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-primary dark:border-primary shadow-2xl overflow-hidden  dark:bg-gray-900">
            <div className="bg-gradient-to-r from-primary to-blue-600 dark:to-black p-6 text-center">
              <Badge className=" text-primary dark:text-primary-foreground mb-3">
                <Sparkles className="h-3 w-3 mr-1" />
                Recommended Plan
              </Badge>
              <h2 className="text-3xl font-bold text-white mb-2">Business Plan</h2>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-white">₦26,000</span>
                <span className="text-xl text-blue-100">/month</span>
              </div>
              <p className="text-blue-100 mt-2">Billed monthly</p>
            </div>

            <CardContent className="p-8">
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Real-time Feedback Dashboard</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Monitor feedback as it comes in with live updates</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Unlimited AI Summaries</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get instant insights from your feedback data</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Smart Sentiment Analysis</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Understand customer emotions automatically</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Custom Feedback Widget Branding</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Match your brand with custom colors and logos</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Team Collaboration</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Invite team members and manage permissions</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Priority Support</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Get help when you need it most</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handleUpgrade}
                  className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  size="lg"
                >
                  Upgrade to Business Plan
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>

                
              </div>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                <Shield className="h-4 w-4 inline mr-1" />
                Secure payment powered by Paystack · Cancel anytime
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <HelpCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Can I change my plan later?
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Yes, you can upgrade or downgrade your plan at any time from your billing settings. Changes take effect immediately, and we'll prorate the difference.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <HelpCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      What payment methods do you accept?
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      We accept all major credit and debit cards through Paystack, including Visa, Mastercard, and Verve. Bank transfers and mobile money are also supported.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

           
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Need help deciding?
          </p>
          <Link 
            to="/help-center" 
            className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            Visit Help Center
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            © 2025 NoteX. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TrialExpired;