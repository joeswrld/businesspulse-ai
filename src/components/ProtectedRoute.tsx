import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNoteXTrial } from '@/contexts/NoteXTrialContext';
import PlatformLock from './PlatformLock';

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
  const { trialStatus, checkAccess } = useNoteXTrial();
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

  // Show loading while trial status is loading
  if (trialStatus.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Use PlatformLock component to handle access control
  return (
    <PlatformLock>
      {children}
    </PlatformLock>
  );
};

export default ProtectedRoute;