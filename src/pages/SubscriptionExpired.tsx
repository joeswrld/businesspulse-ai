// src/pages/SubscriptionExpired.tsx
// Subscription expiration page with renewal options

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Crown,
  CheckCircle,
  Mail,
  User,
  LogOut,
  RefreshCw,
  MessageSquare,
  BarChart3,
  Zap,
  Shield,
  Users,
  HelpCircle,
  AlertCircle,
  CreditCard
} from 'lucide-react';

const SubscriptionExpiredPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleRenew = () => {
    navigate('/billing');
  };

  const businessFeatures = [
    { icon: <MessageSquare className="h-5 w-5" />, text: 'Unlimited feedback collection' },
    { icon: <BarChart3 className="h-5 w-5" />, text: 'Advanced analytics & insights' },
    { icon: <Zap className="h-5 w-5" />, text: 'AI-powered sentiment analysis' },
    { icon: <Users className="h-5 w-5" />, text: 'Team collaboration tools' },
    { icon: <Shield className="h-5 w-5" />, text: 'Priority customer support' },
    { icon: <CreditCard className="h-5 w-5" />, text: 'Flexible billing options' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-orange-950 dark:to-red-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/favicon.ico" alt="NoteX" className="h-8 w-8" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">NoteX</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Alert Banner */}
        <div className="mb-8 p-6 bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-300 dark:border-orange-700 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-orange-900 dark:text-orange-100 mb-1">
                Your Subscription Has Expired
              </h2>
              <p className="text-orange-700 dark:text-orange-300">
                Hi {user?.email?.split('@')[0] || 'there'}, your Business subscription has ended. Renew now to restore access to all features.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* User Info Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-2 border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="text-lg">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Badge variant="secondary" className="bg-orange-500 text-white text-xs">
                    Subscription Expired
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Business Account</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground font-mono truncate">
                      {user?.email || 'Not available'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3">
                    Your subscription has lapsed. Renew now to continue where you left off.
                  </p>
                  <Button
                    onClick={handleRenew}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg"
                    size="lg"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Renew Subscription
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card className="mt-6 shadow-lg border-border">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                    <HelpCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-foreground">Need Assistance?</h3>
                  <p className="text-sm text-muted-foreground">
                    Our team is here to help with renewals
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="w-full">
                      Contact Support
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full">
                      View Billing FAQ
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Renewal Pricing & Features */}
          <div className="lg:col-span-2 space-y-8">
            {/* Business Plan Renewal Card */}
            <Card className="shadow-2xl border-2 border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-bl-full"></div>
              
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                      <Crown className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-3xl font-bold text-foreground">
                        Renew Business Plan
                      </CardTitle>
                      <p className="text-muted-foreground">Continue with premium features</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1">
                    Your Plan
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="flex items-baseline gap-2 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                  <span className="text-5xl font-bold text-foreground">₦53,000</span>
                  <span className="text-xl text-muted-foreground">/month</span>
                </div>

                {/* What You'll Keep */}
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    What You'll Keep
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {businessFeatures.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="flex-shrink-0 mt-0.5 text-primary">
                          {feature.icon}
                        </div>
                        <span className="text-sm text-foreground">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Renewal Benefits */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Renewal Benefits
                  </h4>
                  <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                    <li>✓ No data loss - all your feedback is preserved</li>
                    <li>✓ Instant reactivation upon payment</li>
                    <li>✓ Same pricing as before</li>
                  </ul>
                </div>

                {/* CTA */}
                <div className="pt-4">
                  <Button
                    onClick={handleRenew}
                    size="lg"
                    className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-xl hover:shadow-2xl transition-all text-lg h-14"
                  >
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Renew Subscription Now
                  </Button>
                  <p className="text-center text-xs text-muted-foreground mt-3">
                    Immediate access • Secure payment • Cancel anytime
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Why Renew Section */}
            <Card className="shadow-lg border-border">
              <CardHeader>
                <CardTitle className="text-xl">Why Renew Your Subscription?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Keep Your Data & Progress</h4>
                      <p className="text-sm text-muted-foreground">
                        All your feedback history, analytics, and insights are safely preserved and waiting for you.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Immediate Reactivation</h4>
                      <p className="text-sm text-muted-foreground">
                        Resume collection and analysis instantly. Your widgets will start working the moment you renew.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Continued Priority Support</h4>
                      <p className="text-sm text-muted-foreground">
                        Get back to dedicated support with faster response times from our team.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about renewal? <Button variant="link" className="p-0 h-auto text-primary">Contact Support</Button> or{' '}
            <Button variant="link" className="p-0 h-auto text-primary">View Billing FAQ</Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionExpiredPage;