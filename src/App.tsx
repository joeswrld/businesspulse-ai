import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TrialProvider } from "@/contexts/TrialContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useGoogleAnalytics } from "@/hooks/useGoogleAnalytics";
import ErrorBoundary from "@/components/ErrorBoundary";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
// Pages
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
import Billing from "./pages/Billing";
import FeedbackSettings from "./pages/FeedbackSettings";
import CSATSurvey from "./pages/CSATSurvey";
import ProductFeedback from "./pages/ProductFeedback";
import CSATForm from "./pages/CSATForm";
import ProductFeedbackForm from "./pages/ProductFeedback";
import SubscriptionExpired from "./pages/SubscriptionExpired";
import BlogPost from "./pages/BlogPost";
import BlogEditor from "./pages/BlogEditor";
import FAQ from "./pages/FAQ";

const queryClient = new QueryClient();

const AppRoutes = () => {
  useGoogleAnalytics();
  
  return (
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
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/blog/edit/:slug" element={<BlogEditor />} />
      <Route path="/blog/new" element={<BlogEditor />} />
      <Route path="/faq" element={<FAQ />} />
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

      {/* Always Accessible */}
      <Route path="/billing" element={<Billing />} />
      <Route path="/account" element={<Settings />} />
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
      <Route path="/feedback-settings" element={<DashboardLayout><FeedbackSettings /></DashboardLayout>} />
      <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />

      {/* ❌ 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <TrialProvider>
          <ThemeProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <SubscriptionProvider>
                  <Toaster />
                  <Sonner />
                  <AppRoutes />
                </SubscriptionProvider>
              </ErrorBoundary>
            </BrowserRouter>
          </ThemeProvider>
        </TrialProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
