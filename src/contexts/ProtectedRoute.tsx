import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { hasAccess, isLoading, plan, status } = useSubscriptionStatus();
  const location = useLocation();

  // Public paths that don't require subscription
  const publicPaths = ['/billing', '/account', '/trial-expired', '/subscription-expired'];
  const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path));

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  // Allow public paths
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Check access for protected routes
  if (!hasAccess) {
    // Determine which expired page to show
    if (plan === 'expired' && status === 'expired') {
      // Trial expired
      return <Navigate to="/trial-expired" replace />;
    } else if (plan === 'expired' && status === 'cancelled') {
      // Subscription expired
      return <Navigate to="/subscription-expired" replace />;
    } else {
      // Default to trial expired
      return <Navigate to="/trial-expired" replace />;
    }
  }

  // User has access - render protected content
  return <>{children}</>;
};