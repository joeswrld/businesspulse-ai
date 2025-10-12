import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UnifiedTrialProvider } from "@/contexts/UnifiedTrialContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { TrialProvider } from '@/contexts/TrialContext';

// UI components for banner
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
// Direct imports
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import TrialExpired from "./pages/TrialExpired";
import Dashboard from "./pages/Dashboard";
import Insights from "./pages/Insights";
import InsightsSimple from "./pages/InsightsSimple";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Teams from "./pages/Teams";
import Profile from "./pages/Profile";
import Feedback from "./pages/Feedback";
import Roadmap from "./pages/Roadmap";
import Testimonials from "./pages/Testimonials";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import HelpCenter from "./pages/HelpCenter";
import Integrations from "./pages/Integrations";
import API from "./pages/API";
import Blog from "./pages/Blog";
import Careers from "./pages/Careers";
import Press from "./pages/Press";
import Partners from "./pages/Partners";
import Documentation from "./pages/Documentation";
import Guides from "./pages/Guides";
import Community from "./pages/Community";
import Templates from "./pages/Templates";
import CookiePolicy from "./pages/CookiePolicy";
import NotFound from "./pages/NotFound";
// const TeamInvitation = lazy(() => import("./pages/TeamInvitation"));
import TeamInvitation from "./pages/DashboardEnhanced";
import Billing from "./pages/Billing";
import FeedbackSettings from "./pages/FeedbackSettings";
import CSATSurvey from "./pages/CSATSurvey";
import ProductFeedback from "./pages/ProductFeedback";
import CSATForm from './pages/CSATForm';
import ProductFeedbackForm from './pages/ProductFeedback';
import SubscriptionExpired from './pages/SubscriptionExpired';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <TrialProvider>  {/* Add this */}
          <ThemeProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary>
                <Routes>
                  {/* 🌍 PUBLIC ROUTES */}
                  <Route path="/" element={<Index />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/trial-expired" element={<TrialExpired />} />
                  <Route path="/testimonials" element={<Testimonials />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/integrations" element={<Integrations />} />
                  <Route path="/api" element={<API />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/careers" element={<Careers />} />
                  <Route path="/press" element={<Press />} />
                  <Route path="/partners" element={<Partners />} />
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/guides" element={<Guides />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/cookie-policy" element={<CookiePolicy />} />
                  
                  {/* 📝 PUBLIC FEEDBACK ROUTES */}
                  <Route path="/survey/:projectId" element={<CSATSurvey />} />
                  <Route path="/csat/:projectId" element={<CSATForm />} />
                  <Route path="/feedback/:projectId" element={<ProductFeedback />} />
                  <Route path="/product-feedback/:projectId" element={<ProductFeedbackForm />} />
                   {/* Always Accessible (even without subscription) */}
              <Route path="/billing" element={<Billing />} />
              <Route path="/account" element={<Settings />} />
              <Route path="/trial-expired" element={<TrialExpired />} />
              <Route path="/subscription-expired" element={<SubscriptionExpired />} />

                  {/* 🔒 PROTECTED ROUTES */}
                  <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
                  <Route path="/insights" element={<DashboardLayout><Insights /></DashboardLayout>} />
                  <Route path="/insights-simple" element={<DashboardLayout><InsightsSimple /></DashboardLayout>} />
                  <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
                  <Route path="/feedback" element={<DashboardLayout><Feedback /></DashboardLayout>} />
                  <Route path="/roadmap" element={<DashboardLayout><Roadmap /></DashboardLayout>} />
                  <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
                  <Route path="/teams" element={<DashboardLayout><Teams /></DashboardLayout>} />
                  <Route path="/billing" element={<DashboardLayout><Billing /></DashboardLayout>} />
                  <Route path="/feedback-settings" element={<DashboardLayout><FeedbackSettings /></DashboardLayout>} />
                  <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
                  {/* <Route path="/teams/invite/:token" element={<TeamInvitation />} /> */}

                  {/* ❌ CATCH-ALL */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </SubscriptionProvider>
              </ErrorBoundary>
            </BrowserRouter>
          </ThemeProvider>
        </TrialProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
