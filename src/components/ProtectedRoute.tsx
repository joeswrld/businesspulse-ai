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

  // Special handling for billing page - always allow access
  if (location.pathname === '/billing') {
    return <>{children}</>;
  }

  // Check if user has Business plan (active subscription)
  const hasBusinessPlan = trialStatus.isActive && trialStatus.plan === 'business';
  
  // Check access based on requirements
  const hasAccess = requireActiveSubscription 
    ? hasBusinessPlan 
    : checkAccess();

  // Business plan users always have access
  if (hasBusinessPlan) {
    return <>{children}</>;
  }

  // If no access and not on billing page, show trial gate
  if (!hasAccess && location.pathname !== '/billing') {
    return (
      <TrialGate>
        {children}
      </TrialGate>
    );
  }

  // If trial expired and no Business plan, redirect to billing (except if already on billing)
  if (isTrialExpired() && !hasBusinessPlan && location.pathname !== '/billing') {
    return <Navigate to={fallbackPath} replace />;
  }

  // User has access, render children
  return <>{children}</>;
};

export default ProtectedRoute;