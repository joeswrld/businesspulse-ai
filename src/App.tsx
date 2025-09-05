import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DataUpload = lazy(() => import("./pages/DataUpload"));


const InsightsSimplePage = lazy(() => import("./pages/InsightsSimplePage"));



const Reports = lazy(() => import("./pages/Reports"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const Teams = lazy(() => import("./pages/Teams"));
const Profile = lazy(() => import("./pages/Profile"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Billing = lazy(() => import("./pages/Billing"));

const FeedbackSettings = lazy(() => import("./pages/FeedbackSettings"));

// Feedback form pages
const QRFeedbackPage = lazy(() => import("./pages/feedback/qr/[project_id]"));
const EmailFeedbackPage = lazy(() => import("./pages/feedback/email/[project_id]"));
const ThankYouPage = lazy(() => import("./pages/feedback/thank-you"));

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={
              <Suspense fallback={<LoadingSpinner />}>
                <Index />
              </Suspense>
            } />
            <Route path="/auth" element={
              <Suspense fallback={<LoadingSpinner />}>
                <AuthPage />
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
            
            {/* Feedback form routes - Public access */}
            <Route path="/feedback/qr/:project_id" element={
              <Suspense fallback={<LoadingSpinner />}>
                <QRFeedbackPage />
              </Suspense>
            } />
            <Route path="/feedback/email/:project_id" element={
              <Suspense fallback={<LoadingSpinner />}>
                <EmailFeedbackPage />
              </Suspense>
            } />
            <Route path="/feedback/thank-you" element={
              <Suspense fallback={<LoadingSpinner />}>
                <ThankYouPage />
              </Suspense>
            } />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/insights-simple" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <InsightsSimplePage />
                  </DashboardLayout>
                </Suspense>
              </ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Reports />
                  </DashboardLayout>
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Analytics />
                  </DashboardLayout>
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Settings />
                  </DashboardLayout>
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/teams" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Teams />
                  </DashboardLayout>
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/billing" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Billing />
                  </DashboardLayout>
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/feedback" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Feedback />
                  </DashboardLayout>
                </Suspense>
              </ProtectedRoute>
            } />
            <Route path="/feedback-settings" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <FeedbackSettings />
                  </DashboardLayout>
                </Suspense>
              </ProtectedRoute>
            } />
            {/* <Route path="/teams/invite/:token" element={
              <Suspense fallback={<LoadingSpinner />}>
                <TeamInvitation />
              </Suspense>
            } /> */}

            <Route path="/profile" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardLayout>
                    <Profile />
                  </DashboardLayout>
                </Suspense>
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={
              <Suspense fallback={<LoadingSpinner />}>
                <NotFound />
              </Suspense>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
