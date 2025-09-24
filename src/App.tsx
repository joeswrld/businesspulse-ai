import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { UnifiedTrialProvider } from "@/contexts/UnifiedTrialContext";
import { AuthFlowGuard } from "@/components/AuthFlowGuard";
import UnifiedProtectedRoute from "@/components/UnifiedProtectedRoute";
import AuthGuard from "@/components/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Import Billing page directly (no lazy loading)
import Billing from "./pages/Billing";
import CSATForm from "./pages/CSATForm";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const TrialExpired = lazy(() => import("./pages/TrialExpired"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Insights = lazy(() => import("./pages/Insights"));
const InsightsSimple = lazy(() => import("./pages/InsightsSimple"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Teams = lazy(() => import("./pages/Teams"));
const Profile = lazy(() => import("./pages/Profile"));
const FeedbackSettings = lazy(() => import("./pages/FeedbackSettings"));
const Feedback = lazy(() => import("./pages/Feedback"));
const ProductFeedbackForm = lazy(() => import("./pages/ProductFeedbackForm"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const Widget = lazy(() => import("./pages/Widget"));

const Testimonials = lazy(() => import("./pages/Testimonials"));
const About = lazy(() => import("./pages/About"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Integrations = lazy(() => import("./pages/Integrations"));
const API = lazy(() => import("./pages/API"));
const Blog = lazy(() => import("./pages/Blog"));
const Careers = lazy(() => import("./pages/Careers"));
const Press = lazy(() => import("./pages/Press"));
const Partners = lazy(() => import("./pages/Partners"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Guides = lazy(() => import("./pages/Guides"));
const Community = lazy(() => import("./pages/Community"));
const Templates = lazy(() => import("./pages/Templates"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const NotFound = lazy(() => import("./pages/NotFound"));
// const TeamInvitation = lazy(() => import("./pages/TeamInvitation"));
const TeamInvitation = lazy(() => import("./pages/DashboardEnhanced"));
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <UnifiedTrialProvider>
            <ThemeProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Index />
              </Suspense>
            } />
            <Route path="/signup" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Signup />
              </Suspense>
            } />
            <Route path="/login" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Login />
              </Suspense>
            } />
            <Route path="/reset-password" element={
              <Suspense fallback={<LoadingSpinner />}>
                <ResetPassword />
              </Suspense>
            } />
            <Route path="/verify-email" element={
              <Suspense fallback={<LoadingSpinner />}>
                <VerifyEmail />
              </Suspense>
            } />
            <Route path="/trial-expired" element={
              <Suspense fallback={<LoadingSpinner />}>
                <TrialExpired />
              </Suspense>
            } />
            <Route path="/testimonials" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Testimonials />
              </Suspense>
            } />
            <Route path="/about" element={
              <Suspense fallback={<LoadingSpinner />}>
                <About />
              </Suspense>
            } />
            <Route path="/privacy-policy" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PrivacyPolicy />
              </Suspense>
            } />
            <Route path="/terms-of-service" element={
              <Suspense fallback={<LoadingSpinner />}>
                <TermsOfService />
              </Suspense>
            } />
            <Route path="/help" element={
              <Suspense fallback={<LoadingSpinner />}>
                <HelpCenter />
              </Suspense>
            } />
            <Route path="/integrations" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Integrations />
              </Suspense>
            } />
            <Route path="/api" element={
              <Suspense fallback={<LoadingSpinner />}>
                <API />
              </Suspense>
            } />
            <Route path="/blog" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Blog />
              </Suspense>
            } />
            <Route path="/careers" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Careers />
              </Suspense>
            } />
            <Route path="/press" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Press />
              </Suspense>
            } />
            <Route path="/partners" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Partners />
              </Suspense>
            } />
            <Route path="/documentation" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Documentation />
              </Suspense>
            } />
            <Route path="/guides" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Guides />
              </Suspense>
            } />
            <Route path="/community" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Community />
              </Suspense>
            } />
            <Route path="/templates" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Templates />
              </Suspense>
            } />
            <Route path="/cookie-policy" element={
              <Suspense fallback={<LoadingSpinner />}>
                <CookiePolicy />
              </Suspense>
            } />
            
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/insights" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Insights />
                  </DashboardLayout>
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/insights-simple" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <InsightsSimple />
                  </DashboardLayout>
                </Suspense>
              </AuthGuard>
            } />

            <Route path="/reports" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/settings" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/teams" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Teams />
                  </DashboardLayout>
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/billing" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <DashboardLayout>
                  <Billing />
                </DashboardLayout>
              </AuthGuard>
            } />
            {/* <Route path="/teams/invite/:token" element={
              <Suspense fallback={<LoadingSpinner />}>
                <TeamInvitation />
              </Suspense>
            } /> */}

            <Route path="/profile" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Profile />
                  </DashboardLayout>
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/feedback-settings" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <FeedbackSettings />
                  </DashboardLayout>
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/feedback" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Feedback />
                  </DashboardLayout>
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/feedback/:projectId/csat" element={
              <Suspense fallback={<LoadingSpinner />}>
                <CSATForm />
              </Suspense>
            } />
            <Route path="/feedback/:projectId/product" element={
              <Suspense fallback={<LoadingSpinner />}>
                <ProductFeedbackForm />
              </Suspense>
            } />
            <Route path="/roadmap" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Roadmap />
                  </DashboardLayout>
                </Suspense>
              </AuthGuard>
            } />
            <Route path="/widget" element={
              <AuthGuard requireEmailConfirmation={true} requireActiveSubscription={false}>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Widget />
                  </DashboardLayout>
                </Suspense>
              </AuthGuard>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={
              <Suspense fallback={<LoadingSpinner />}>
                <NotFound />
              </Suspense>
            } />
            </Routes>
            </ThemeProvider>
          </UnifiedTrialProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
