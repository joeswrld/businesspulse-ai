import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isLoading, hasAccess, status } = useSubscriptionStatus();

  // Show loading spinner while checking subscription
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If user has access (trial or paid), show the protected content
  if (hasAccess) {
    return <>{children}</>;
  }

  // If no access, show the access locked screen
  return <AccessLocked status={status} />;
};

// AccessLocked Component
import { AlertCircle, Lock, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AccessLockedProps {
  status: 'trial' | 'active' | 'expired' | 'cancelled';
}

const AccessLocked = ({ status }: AccessLockedProps) => {
  const getMessage = () => {
    switch (status) {
      case 'expired':
        return {
          title: 'Your Trial Has Expired',
          description: 'Your 8-day free trial has ended. Upgrade to continue using NoteX.',
          icon: AlertCircle,
        };
      case 'cancelled':
        return {
          title: 'Subscription Cancelled',
          description: 'Your subscription has been cancelled. Please reactivate to continue.',
          icon: CreditCard,
        };
      default:
        return {
          title: 'Access Restricted',
          description: 'You need an active subscription to access this feature.',
          icon: Lock,
        };
    }
  };

  const { title, description, icon: Icon } = getMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Icon className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-600 mb-8">{description}</p>
        
        <div className="space-y-3">
          <Link
            to="/billing"
            className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            {status === 'cancelled' ? 'Reactivate Subscription' : 'Upgrade Now'}
          </Link>
          
          <Link
            to="/account"
            className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            View Account
          </Link>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help? <a href="mailto:support@notex.com" className="text-blue-600 hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
};
