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

  // If trial is loading, show loading
  if (trialStatus.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check access based on requirements
  const hasAccess = requireActiveSubscription 
    ? trialStatus.isActive 
    : checkAccess();

  // If no access, show trial gate
  if (!hasAccess) {
    return (
      <TrialGate>
        {children}
      </TrialGate>
    );
  }

  // If trial expired and no active subscription, redirect to billing
  if (isTrialExpired() && !trialStatus.isActive) {
    return <Navigate to={fallbackPath} replace />;
  }

  // User has access, render children
  return <>{children}</>;
};

export default ProtectedRoute;