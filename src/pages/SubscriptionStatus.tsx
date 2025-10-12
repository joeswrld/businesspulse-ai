import React, { createContext, useContext, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lock, AlertTriangle, Crown, Clock, CheckCircle, ArrowRight, Loader2, RefreshCw, User, Mail, CreditCard } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface SubscriptionStatus {
  hasAccess: boolean;
  plan: 'trial' | 'business' | 'expired';
  status: 'active' | 'expired' | 'trial' | 'cancelled';
  trialEndsAt: string | null;
  daysLeft: number;
  isLoading: boolean;
  error: string | null;
}

interface SubscriptionContextType extends SubscriptionStatus {
  refresh: () => Promise<void>;
  checkAccess: () => boolean;
  simulateUpgrade: () => void;
  simulateExpire: () => void;
  simulateTrialReset: () => void;
}

// ============================================================================
// SUBSCRIPTION CONTEXT
// ============================================================================

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const useSubscriptionStatus = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionStatus must be used within SubscriptionProvider');
  }
  return context;
};

// ============================================================================
// SUBSCRIPTION PROVIDER
// ============================================================================

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasAccess: false,
    plan: 'trial',
    status: 'trial',
    trialEndsAt: null,
    daysLeft: 0,
    isLoading: true,
    error: null,
  });

  const loadSubscriptionStatus = async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      /* 
      ============================================================
      REAL IMPLEMENTATION - Replace mock data with this:
      ============================================================
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: profile, error } = await supabase
        .from('billing_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error && error.code === 'PGRST116') {
        // No profile exists - create trial
        const trialEndDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
        await supabase.from('billing_profiles').insert({
          id: user.id,
          plan: 'trial',
          trial_ends_at: trialEndDate.toISOString(),
          subscription_status: 'trial',
          created_at: new Date().toISOString(),
        });
      }
      ============================================================
      */

      // Mock profile data - replace with Supabase query above
      const mockProfile = JSON.parse(localStorage.getItem('mockProfile') || JSON.stringify({
        id: 'user-123',
        plan: 'trial',
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        next_billing_date: null,
      }));

      const now = new Date();
      const trialEnd = mockProfile.trial_ends_at ? new Date(mockProfile.trial_ends_at) : null;
      const daysLeft = trialEnd 
        ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      // Access control logic
      let hasAccess = false;
      let finalPlan: 'trial' | 'business' | 'expired' = 'expired';
      let finalStatus: 'active' | 'expired' | 'trial' | 'cancelled' = 'expired';

      if (mockProfile.plan === 'business' && mockProfile.subscription_status === 'active') {
        // ✅ PAID USER WITH ACTIVE SUBSCRIPTION - FULL ACCESS
        hasAccess = true;
        finalPlan = 'business';
        finalStatus = 'active';
      } else if (mockProfile.plan === 'trial') {
        // TRIAL USER
        if (trialEnd && now <= trialEnd) {
          // ✅ TRIAL STILL VALID - FULL ACCESS
          hasAccess = true;
          finalPlan = 'trial';
          finalStatus = 'trial';
        } else {
          // ❌ TRIAL EXPIRED - NO ACCESS
          hasAccess = false;
          finalPlan = 'expired';
          finalStatus = 'expired';
        }
      } else if (mockProfile.subscription_status === 'cancelled' || mockProfile.subscription_status === 'expired') {
        // ❌ SUBSCRIPTION CANCELLED/EXPIRED - NO ACCESS
        hasAccess = false;
        finalPlan = 'expired';
        finalStatus = mockProfile.subscription_status;
      }

      setStatus({
        hasAccess,
        plan: finalPlan,
        status: finalStatus,
        trialEndsAt: mockProfile.trial_ends_at,
        daysLeft,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error loading subscription status:', error);
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load subscription',
      }));
    }
  };

  // Demo functions to simulate different states
  const simulateUpgrade = () => {
    const upgraded = {
      id: 'user-123',
      plan: 'business',
      subscription_status: 'active',
      trial_ends_at: null,
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    localStorage.setItem('mockProfile', JSON.stringify(upgraded));
    loadSubscriptionStatus();
  };

  const simulateExpire = () => {
    const expired = {
      id: 'user-123',
      plan: 'trial',
      subscription_status: 'expired',
      trial_ends_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      next_billing_date: null,
    };
    localStorage.setItem('mockProfile', JSON.stringify(expired));
    loadSubscriptionStatus();
  };

  const simulateTrialReset = () => {
    const trial = {
      id: 'user-123',
      plan: 'trial',
      subscription_status: 'trial',
      trial_ends_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      next_billing_date: null,
    };
    localStorage.setItem('mockProfile', JSON.stringify(trial));
    loadSubscriptionStatus();
  };

  useEffect(() => {
    loadSubscriptionStatus();
    
    // Refresh every 5 minutes to catch trial expiration
    const interval = setInterval(loadSubscriptionStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkAccess = () => status.hasAccess;

  return (
    <SubscriptionContext.Provider
      value={{
        ...status,
        refresh: loadSubscriptionStatus,
        checkAccess,
        simulateUpgrade,
        simulateExpire,
        simulateTrialReset,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

// ============================================================================
// ACCESS LOCKED SCREEN COMPONENT
// ============================================================================

const AccessLockedScreen: React.FC = () => {
  const { plan, status, daysLeft } = useSubscriptionStatus();

  const isTrialExpired = plan === 'expired' && status === 'expired';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-orange-950 dark:to-red-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-2 border-orange-300 dark:border-orange-700">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Lock className="h-10 w-10 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-3xl font-bold">
            {isTrialExpired ? 'Your Free Trial Has Ended' : 'Subscription Required'}
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            {isTrialExpired
              ? 'Upgrade to Business to continue using all features'
              : 'Your subscription has expired. Renew to regain access'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Alert */}
          <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-900/20">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-orange-900 dark:text-orange-100">
              <strong>Access Restricted:</strong> {isTrialExpired 
                ? 'Your 8-day free trial has expired' 
                : 'Your Business subscription is no longer active'}
            </AlertDescription>
          </Alert>

          {/* Features Grid */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              What You're Missing
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                'Real-time feedback collection',
                'AI-powered sentiment analysis',
                'Advanced analytics dashboard',
                'Custom widget branding',
                'Team collaboration tools',
                'Priority email support',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-white dark:bg-gray-800 rounded border">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Box */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-6 rounded-xl border-2 border-amber-200 dark:border-amber-800">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Business Plan</div>
              <div className="text-4xl font-bold mb-2">₦53,000</div>
              <div className="text-sm text-muted-foreground mb-4">per month</div>
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                <CheckCircle className="h-4 w-4" />
                <span>Instant access after payment</span>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg text-lg h-14"
            >
              <Crown className="h-5 w-5 mr-2" />
              {isTrialExpired ? 'Upgrade to Business' : 'Renew Subscription'}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="w-full"
            >
              Contact Support
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>Secure payment via Paystack • Cancel anytime • No hidden fees</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// DASHBOARD COMPONENT (Protected Content)
// ============================================================================

const DashboardContent: React.FC = () => {
  const { plan, daysLeft, status } = useSubscriptionStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Welcome to Dashboard</h2>
          <p className="text-muted-foreground">You have full access to all features</p>
        </div>
        <Badge variant={plan === 'business' ? 'default' : 'secondary'} className="text-sm">
          {plan === 'business' ? 'Business Plan' : `Trial - ${daysLeft} days left`}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,284</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg. Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">87%</div>
            <p className="text-xs text-muted-foreground">Positive responses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">64%</div>
            <p className="text-xs text-muted-foreground">Active engagement</p>
          </CardContent>
        </Card>
      </div>

      {plan === 'trial' && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            You're on a free trial. Upgrade to Business to unlock unlimited features after {daysLeft} days.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// ============================================================================
// PROTECTED ROUTE WRAPPER
// ============================================================================

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasAccess, isLoading, error } = useSubscriptionStatus();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert className="max-w-md border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessLockedScreen />;
  }

  return <>{children}</>;
};

// ============================================================================
// MAIN DEMO COMPONENT
// ============================================================================

const SubscriptionSystemDemo: React.FC = () => {
  const [currentView, setCurrentView] = useState<'status' | 'dashboard'>('status');
  const subscription = useSubscriptionStatus();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <h1 className="text-xl font-bold">NoteX</h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={subscription.hasAccess ? "default" : "destructive"}>
                {subscription.hasAccess ? 'Active' : 'Locked'}
              </Badge>
              <div className="text-sm text-muted-foreground">
                demo@notex.com
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subscription Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Access</span>
                  <Badge variant={subscription.hasAccess ? "default" : "destructive"}>
                    {subscription.hasAccess ? 'GRANTED' : 'DENIED'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-medium capitalize">{subscription.plan}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium capitalize">{subscription.status}</span>
                  </div>
                  {subscription.plan === 'trial' && subscription.hasAccess && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Days Left</span>
                      <span className="font-bold text-blue-600">{subscription.daysLeft}</span>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => subscription.refresh()} 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  disabled={subscription.isLoading}
                >
                  {subscription.isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh Status
                </Button>
              </CardContent>
            </Card>

            {/* Demo Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Demo Controls</CardTitle>
                <CardDescription>Simulate different subscription states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={subscription.simulateTrialReset}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Reset to Trial (8 days)
                </Button>
                <Button
                  onClick={subscription.simulateUpgrade}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Simulate Upgrade to Business
                </Button>
                <Button
                  onClick={subscription.simulateExpire}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                  Simulate Trial Expiration
                </Button>
              </CardContent>
            </Card>

            {/* View Switcher */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">View Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => setCurrentView('status')}
                  variant={currentView === 'status' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                >
                  Status Monitor
                </Button>
                <Button
                  onClick={() => setCurrentView('dashboard')}
                  variant={currentView === 'dashboard' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                >
                  Try Accessing Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {currentView === 'status' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Implementation Guide</CardTitle>
                  <CardDescription>
                    Complete subscription system with trial management and access control
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* How It Works */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">How It Works</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                          1
                        </div>
                        <div>
                          <strong>New User Signup:</strong> Automatically creates 8-day trial with full access
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                          2
                        </div>
                        <div>
                          <strong>Trial Period:</strong> User has complete access to all features during trial
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                          3
                        </div>
                        <div>
                          <strong>Payment Success:</strong> Webhook updates status to "active" - instant access continues
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                          4
                        </div>
                        <div>
                          <strong>Trial/Subscription Expired:</strong> Access locked, only billing page accessible
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Code Snippets */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Integration Steps</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2 text-sm">1. Supabase Table Structure</h4>
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`CREATE TABLE billing_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  plan TEXT NOT NULL DEFAULT 'trial',
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  paystack_customer_id TEXT,
  paystack_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}
                        </pre>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 text-sm">2. Wrap App with Provider</h4>
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<SubscriptionProvider>
  <App />
</SubscriptionProvider>`}
                        </pre>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 text-sm">3. Protect Routes</h4>
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />`}
                        </pre>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 text-sm">4. Paystack Webhook Handler</h4>
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`// When payment succeeds
await supabase
  .from('billing_profiles')
  .update({
    plan: 'business',
    subscription_status: 'active',
    next_billing_date: nextBillingDate
  })
  .eq('id', userId);`}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Key Features</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {[
                        '8-day automatic trial for new users',
                        'Real-time subscription status checks',
                        'Instant access after payment',
                        'Automatic trial expiration handling',
                        'Protected route middleware',
                        'Graceful access denied screens',
                        'Refresh status every 5 minutes',
                        'Support for multiple plan types'
                      ].map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ProtectedRoute>
                <Card>
                  <CardHeader>
                    <CardTitle>Dashboard</CardTitle>
                    <CardDescription>Protected content - only accessible with valid subscription</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DashboardContent />
                  </CardContent>
                </Card>
              </ProtectedRoute>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// APP WRAPPER
// ============================================================================

export default function App() {
  return (
    <SubscriptionProvider>
      <SubscriptionSystemDemo />
    </SubscriptionProvider>
  );
}