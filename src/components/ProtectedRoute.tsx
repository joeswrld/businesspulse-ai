import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTrial } from '@/contexts/TrialContext';
import TrialGate from './TrialGate';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireActiveSubscription?: boolean;
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireActiveSubscription = false,
  fallbackPath = '/billing'
}) => {
  const { user, loading: authLoading } = useAuth();
  const { trialStatus, checkAccess, isTrialExpired } = useTrial();
  const location = useLocation();

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Special handling for billing page - always allow access
  if (location.pathname === '/billing') {
    return <>{children}</>;
  }

  // If trial is loading, give access by default (don't lock out during loading)
  if (trialStatus.loading) {
    return <>{children}</>;
  }

  // Business plan users always have access
  if (trialStatus.plan === 'business' && trialStatus.isActive) {
    return <>{children}</>;
  }

  // Check if user has access based on requirements
  const hasAccess = requireActiveSubscription 
    ? (trialStatus.plan === 'business' && trialStatus.isActive)
    : checkAccess();

  // If no access, show trial gate
  if (!hasAccess) {
    return (
      <TrialGate>
        {children}
      </TrialGate>
    );
  }

  // User has access, render children
  return <>{children}</>;
};

export default ProtectedRoute;