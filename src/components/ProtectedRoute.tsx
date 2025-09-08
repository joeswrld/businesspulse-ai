import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserStatus } from '@/hooks/useUserStatus';
import LockScreen from './LockScreen';
import { PaystackPayment } from './PaystackPayment';

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
  const { status, loading: statusLoading, shouldShowLockScreen } = useUserStatus();
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

  // Show loading while status is loading
  if (statusLoading || !status) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if user should be locked out
  const shouldLock = shouldShowLockScreen();

  // If user should be locked, show lock screen
  if (shouldLock) {
    const handleUpgrade = (plan: 'business') => {
      // Trigger Paystack payment flow
      console.log('Upgrading to plan:', plan);
      // This will be handled by the PaystackPayment component
    };

    const handleRetry = () => {
      // Refresh user status
      window.location.reload();
    };

    return (
      <LockScreen 
        status={status} 
        onUpgrade={handleUpgrade}
        onRetry={handleRetry}
      />
    );
  }

  // User has access, render children
  return <>{children}</>;
};

export default ProtectedRoute;