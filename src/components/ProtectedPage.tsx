import React from 'react';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useAuth } from '@/contexts/AuthContext';
import LockScreen from './LockScreen';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProtectedPageProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProtectedPage({ children, fallback }: ProtectedPageProps) {
  const { user } = useAuth();
  const { status, loading, shouldShowLockScreen, refreshStatus } = useUserStatus();
  const navigate = useNavigate();

  // If not authenticated, redirect to login
  if (!user) {
    navigate('/auth');
    return null;
  }

  // Show loading state
  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Show lock screen if user should be locked out
  if (shouldShowLockScreen() && status) {
    const handleUpgrade = (plan: 'business') => {
      // Navigate to billing page with plan selection
      navigate(`/billing?plan=${plan}`);
    };

    return (
      <LockScreen 
        status={status} 
        onUpgrade={handleUpgrade}
        onRetry={refreshStatus}
      />
    );
  }

  // Allow access - user is in valid trial or has active subscription
  return <>{children}</>;
}