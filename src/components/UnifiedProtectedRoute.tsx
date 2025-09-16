import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedTrial } from '@/contexts/UnifiedTrialContext';
import UnifiedPlatformLock from './UnifiedPlatformLock';

interface UnifiedProtectedRouteProps {
  children: React.ReactNode;
  requireActiveSubscription?: boolean;
  fallbackPath?: string;
}

const UnifiedProtectedRoute: React.FC<UnifiedProtectedRouteProps> = ({ 
  children, 
  requireActiveSubscription = false,
  fallbackPath = '/billing'
}) => {
  const { user, loading: authLoading } = useAuth();
  const { trialStatus, checkAccess } = useUnifiedTrial();
  const location = useLocation();

  console.log('🛡️ UnifiedProtectedRoute check:', {
    path: location.pathname,
    user: user?.email,
    authLoading,
    trialLoading: trialStatus.loading,
    hasAccess: checkAccess(),
    plan: trialStatus.plan,
    subscriptionActive: trialStatus.subscriptionActive
  });

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('🚫 No user, redirecting to auth');
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Special handling for billing page - always allow access
  if (location.pathname === '/billing') {
    console.log('💰 Billing page - allowing access');
    return <>{children}</>;
  }

  // Show loading while trial status is loading
  if (trialStatus.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Use UnifiedPlatformLock component to handle access control
  return (
    <UnifiedPlatformLock>
      {children}
    </UnifiedPlatformLock>
  );
};

export default UnifiedProtectedRoute;