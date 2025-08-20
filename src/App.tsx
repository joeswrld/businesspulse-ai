import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";

// Pages
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import DataUpload from "./pages/DataUpload";
import AIInsights from "./pages/AIInsights";
import InsightsPage from "./pages/InsightsPage";
import TestInsights from "./pages/TestInsights";
import DemoInsights from "./pages/DemoInsights";
import CompleteInsights from "./pages/CompleteInsights";
import MockInsights from "./pages/MockInsights";
import ActionableInsights from "./pages/ActionableInsights";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Teams from "./pages/Teams";
import Profile from "./pages/Profile";

import NotFound from "./pages/NotFound";

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
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/insights-simple" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <InsightsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/test-insights" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TestInsights />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/demo-insights" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DemoInsights />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/complete-insights" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CompleteInsights />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/mock-insights" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MockInsights />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/actionable-insights" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ActionableInsights />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Analytics />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/billing" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Billing />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/teams" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Teams />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
