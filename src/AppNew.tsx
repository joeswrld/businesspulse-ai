import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RouteProtection, withRouteProtection } from "@/components/RouteProtection";
import { SidebarNavigation } from "@/components/SidebarNavigation";
import { AuthFlow } from "@/components/AuthFlow";
import { BillingPage } from "@/components/BillingPage";
import { ProjectManagement } from "@/components/ProjectManagement";
import { EnhancedLockScreen } from "@/components/EnhancedLockScreen";
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
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Insights = lazy(() => import("./pages/Insights"));
const Reports = lazy(() => import("./pages/Reports"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const Teams = lazy(() => import("./pages/Teams"));
const Profile = lazy(() => import("./pages/Profile"));
const Feedback = lazy(() => import("./pages/Feedback"));

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

const queryClient = new QueryClient();

// Dashboard Layout Component
const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNavigation />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

// UNLOCKED PLATFORM: No route protection needed
const ProtectedDashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
};

// UNLOCKED PLATFORM: No route protection needed
const AlwaysAccessibleLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Index />
                </Suspense>
              } />
              
              {/* Authentication routes */}
              <Route path="/signup" element={<AuthFlow mode="signup" />} />
              <Route path="/login" element={<AuthFlow mode="login" />} />
              <Route path="/reset-password" element={<AuthFlow mode="reset" />} />
              
              {/* Public marketing pages */}
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
              
              {/* Protected routes that require active subscription */}
              <Route path="/dashboard" element={
                <ProtectedDashboardLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Dashboard />
                  </Suspense>
                </ProtectedDashboardLayout>
              } />
              
              <Route path="/feedback" element={
                <ProtectedDashboardLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Feedback />
                  </Suspense>
                </ProtectedDashboardLayout>
              } />
              
              <Route path="/insights" element={
                <ProtectedDashboardLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Insights />
                  </Suspense>
                </ProtectedDashboardLayout>
              } />
              
              <Route path="/reports" element={
                <ProtectedDashboardLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Reports />
                  </Suspense>
                </ProtectedDashboardLayout>
              } />
              
              <Route path="/analytics" element={
                <ProtectedDashboardLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Analytics />
                  </Suspense>
                </ProtectedDashboardLayout>
              } />
              
              <Route path="/teams" element={
                <ProtectedDashboardLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Teams />
                  </Suspense>
                </ProtectedDashboardLayout>
              } />
              
              <Route path="/feedback-settings" element={
                <ProtectedDashboardLayout>
                  <ProjectManagement />
                </ProtectedDashboardLayout>
              } />
              
              {/* Always accessible routes (billing, profile, settings) */}
              <Route path="/billing" element={
                <AlwaysAccessibleLayout>
                  <BillingPage />
                </AlwaysAccessibleLayout>
              } />
              
              <Route path="/profile" element={
                <AlwaysAccessibleLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Profile />
                  </Suspense>
                </AlwaysAccessibleLayout>
              } />
              
              <Route path="/settings" element={
                <AlwaysAccessibleLayout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Settings />
                  </Suspense>
                </AlwaysAccessibleLayout>
              } />
              
              {/* Catch-all route */}
              <Route path="*" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <NotFound />
                </Suspense>
              } />
            </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;